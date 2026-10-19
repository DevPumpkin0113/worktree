import {markSelectedWork} from './interactions/work-selection.mjs';
import {readDetailMode,saveDetailMode} from './domain/detail-settings.mjs';
import {parseWbs} from './domain/model.mjs';
import {renderTaskDetail} from './views/task-detail.mjs';
import {bindChartPan} from './interactions/chart-pan.mjs';
import {renderDependencies,renderGantt} from './views/schedule-views.mjs';
import {createIdLabels,readSeparator,saveSeparator} from './domain/id-display.mjs';
import {invoke} from '@tauri-apps/api/core';
import {getVersion} from '@tauri-apps/api/app';
import {setupWindowFrame,setWindowTitle} from './platform/window-frame.mjs';
const documents=new Map();let activePath=null,polling=false;
function tabs(){ $('reload').disabled=!activePath; $('tabs').innerHTML=[...documents.keys()].map((path,i)=>{
let title=path.split(/[\\/]/).pop();try{title=parseWbs(documents.get(path)).title;}catch{}
return `<div class="document-tab ${path===activePath?'selected':''}" title="${esc(path)}"><button data-tab="${i}" aria-pressed="${path===activePath}">${esc(title)}</button><button class="tab-close" data-close-tab="${i}" aria-label="${esc(title)} 문서 닫기">×</button></div>`;
}).join('')||'<span class="dock-empty">열린 문서 없음</span>'; }
async function openPath(path){try{const text=await invoke('read_document',{path});documents.set(path,text);activePath=path;load(text,path);tabs();}catch(e){$('error').textContent=String(e);}}

let model,view='tree',idLabels=new Map(),graphFocus=null,ganttUnit='day';
const storage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
let separator=readSeparator(storage),detailMode=readDetailMode(storage),selectedDetailId=null,pendingDetailId=null;
const label=id=>idLabels.get(id)||id;
const $=id=>document.getElementById(id),labels={todo:'시작 전',doing:'진행 중',blocked:'막힘',done:'완료'},types={task:'작업',milestone:'마일스톤',group:'그룹'};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge=r=>`<span class="tag ${r.status}">${labels[r.status]}</span>`;
function matches(r){const q=$('search').value.trim().toLowerCase();return [r.id,label(r.id),r.name,r.owner].join(' ').toLowerCase().includes(q)&&($('status').value==='all'||r.status===$('status').value);}
function card(r){return `<div class="task" tabindex="0" role="button" data-id="${r.id}"><span class="id">${esc(label(r.id))}</span><div>${r.type==='milestone'?'◇ ':''}${esc(r.name)}<div class="sub">${types[r.type]} · ${r.owner==='-'?'담당 미정':esc(r.owner)}</div></div>${badge(r)}</div>`;}
function syncWorkSelection(){markSelectedWork($('content'),detailMode==='sidebar'&&$('detail').open?selectedDetailId:null);}
function show(id){if(!model)return;const result=renderTaskDetail(model,id,label);if(!result)return;selectedDetailId=id;$('detailTitle').textContent=result.title;$('detailMeta').innerHTML=result.meta;$('detailBody').innerHTML=result.body;const dialog=$('detail');const sidebar=detailMode==='sidebar';if(dialog.open&&dialog.classList.contains('sidebar')!==sidebar)dialog.close();dialog.classList.toggle('sidebar',sidebar);if(!dialog.open){if(sidebar)dialog.show();else dialog.showModal();}else dialog.scrollTop=0;syncWorkSelection();}
function render(){if(!model)return;idLabels=createIdLabels(model,separator);const rows=model.rows,leaves=rows.filter(r=>r.type!=='group'),tasks=leaves.filter(r=>r.type==='task'),known=tasks.every(r=>r.effort!=='-'),total=tasks.reduce((n,r)=>n+(Number(r.effort)||0),0),progress=known&&total?Math.round(tasks.filter(r=>r.status==='done').reduce((n,r)=>n+Number(r.effort),0)/total*100)+'%':'산정 불가';
$('metrics').innerHTML=[['작업',tasks.length+'개'],['마일스톤',leaves.filter(r=>r.type==='milestone'&&r.status==='done').length+' / '+leaves.filter(r=>r.type==='milestone').length],['완료 작업',tasks.filter(r=>r.status==='done').length+' / '+tasks.length],['공수 기준 진척도',progress]].map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
const missing=leaves.filter(r=>r.start==='-').length;$('notice').textContent=`구조 검사 통과 · ${rows.filter(r=>r.type==='group').length}개 그룹 · 일정 미정 ${missing}개 · 공수 미정 ${tasks.filter(r=>r.effort==='-').length}개. 미정 값은 일정이나 진척도로 추정하지 않습니다.`;
const filtered=leaves.filter(matches);let html='';
if(view==='tree'){const branch=parent=>rows.filter(r=>r.parent===parent).map(r=>{if(r.type!=='group')return matches(r)?card(r):'';const children=branch(r.id);return children?`<details class="group" open><summary data-work-id="${r.id}">${esc(label(r.id))} · ${esc(r.name)} <span class="tag ${r.status}">${labels[r.status]}</span></summary><div class="children">${children}</div></details>`:'';}).join('');html=branch('-');}
if(view==='board')html='<div class="lanes">'+Object.entries(labels).map(([status,label])=>`<section class="lane"><h3>${label} · ${filtered.filter(r=>r.status===status).length}</h3>${filtered.filter(r=>r.status===status).map(card).join('')}</section>`).join('')+'</div>';
if(view==='flow')html=renderDependencies(leaves,filtered,graphFocus,label);
if(view==='gantt')html=renderGantt(filtered,label,ganttUnit,undefined,$('content').clientWidth||960);
const collisions=model.rows.filter(r=>label(r.id).includes('[')).length;if(collisions)$('notice').textContent+=' 표시 ID 중복 '+collisions+'개: 원본 ID를 함께 표시합니다.';
$('content').innerHTML=html||'<div class="empty">조건에 맞는 작업이 없습니다.</div>';syncWorkSelection();}
function load(markdown,source){if($('detail').open)$('detail').close();selectedDetailId=null;pendingDetailId=null;graphFocus=null;$('title').textContent=source.split(/[\\/]/).pop();$('source').textContent=source;setWindowTitle($('title').textContent);try{model=parseWbs(markdown);$('title').textContent=model.title;setWindowTitle(model.title);tabs();$('source').textContent=source;$('error').textContent='';render();}catch(e){model=null;$('error').textContent=e.message;$('content').replaceChildren();$('metrics').replaceChildren();$('notice').textContent='문서 오류를 수정한 뒤 다시 불러와 주세요.';}}
async function reload(){if(activePath)await openPath(activePath);}
async function poll(){if(polling)return;polling=true;try{const paths=await invoke('take_open_requests');for(const path of paths)await openPath(path);if(activePath){const path=activePath;try{const text=await invoke('read_document',{path});if(path===activePath&&documents.get(path)!==text){documents.set(path,text);load(text,path);}}catch(e){$('error').textContent='원본 갱신 실패: '+String(e);}}}catch(e){$('error').textContent=String(e);}finally{polling=false;}}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});render();});
$('search').oninput=render;$('status').onchange=render;$('reload').onclick=reload;$('dockOpen').onclick=async()=>{try{const path=await invoke('pick_document');if(path)await openPath(path);}catch(e){$('error').textContent=String(e);}};$('close').onclick=()=>{$('detail').close();syncWorkSelection();};
$('detail').onclose=syncWorkSelection;
$('detailBody').onclick=e=>{const target=e.target.closest('[data-detail]');if(target)show(target.dataset.detail);};
function activateContent(target){
 if(target?.dataset.select){const scroll=$('content').querySelector?.('.diagram-scroll');const left=scroll?.scrollLeft||0,top=scroll?.scrollTop||0;graphFocus=target.dataset.select;render();const next=$('content').querySelector?.('.diagram-scroll');if(next){next.scrollLeft=left;next.scrollTop=top;}}
 else if(target&&'clearFocus' in target.dataset){graphFocus=null;render();}
 else if(target?.dataset.id)show(target.dataset.id);
}
const chartPan=bindChartPan($('content'));
$('content').onclick=e=>{if(!chartPan.consumeClick())activateContent(e.target.closest('[data-select],[data-id],[data-clear-focus]'));};
$('content').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&(e.target.dataset.id||e.target.dataset.select)){e.preventDefault();activateContent(e.target);}};
$('content').ondblclick=e=>{const target=e.target.closest('[data-select]');if(target?.dataset.select)show(target.dataset.select);};
$('content').onchange=e=>{if(e.target.id==='ganttUnit'){ganttUnit=e.target.value;render();}};
$('tabs').onclick=e=>{const close=e.target.closest('[data-close-tab]'),tab=e.target.closest('[data-tab]');if(close){const path=[...documents.keys()][Number(close.dataset.closeTab)];documents.delete(path);if(path===activePath){activePath=[...documents.keys()].at(-1)||null;if(activePath)load(documents.get(activePath),activePath);else{if($('detail').open)$('detail').close();selectedDetailId=null;model=null;$('title').textContent='Worktree';setWindowTitle('Worktree');$('source').textContent='파일을 열거나 이 창으로 끌어오세요.';$('content').replaceChildren();$('metrics').replaceChildren();$('notice').textContent='';$('error').textContent='';}}tabs();}else if(tab){activePath=[...documents.keys()][Number(tab.dataset.tab)];load(documents.get(activePath),activePath);tabs();}};
$('notice').textContent='우측 하단 + 버튼 또는 드래그 앤 드롭으로 시작하세요. 프로젝트명.wbs 파일을 열어 주세요.';
setupWindowFrame(error=>{$('error').textContent='창 제어 실패: '+String(error);});
tabs();

function previewIds(){const prefix=model?.idPrefix||'W';$('idPreview').textContent='미리보기: '+prefix+($('idSeparator').value==='hyphen'?'-':'')+'001';}
async function updateAppVersion(){try{$('appVersion').textContent='Worktree · v'+await getVersion();}catch{$('appVersion').textContent='Worktree · 버전 정보를 불러오지 못했습니다.';}}
$('settingsOpen').onclick=()=>{$('detailMode').value=detailMode;updateAppVersion();$('idSeparator').value=separator;$('settingsError').textContent='';previewIds();$('settings').showModal();};
$('idSeparator').onchange=()=>{try{saveSeparator(storage,$('idSeparator').value);separator=$('idSeparator').value;$('settingsError').textContent='';previewIds();render();}catch(error){$('idSeparator').value=separator;previewIds();$('settingsError').textContent='설정을 저장하지 못했습니다: '+String(error);}};
$('settingsClose').onclick=()=>$('settings').close();
$('detailMode').onchange=()=>{try{saveDetailMode(storage,$('detailMode').value);detailMode=$('detailMode').value;$('settingsError').textContent='';if($('detail').open){pendingDetailId=selectedDetailId;$('detail').close();}}catch(error){$('detailMode').value=detailMode;$('settingsError').textContent='설정을 저장하지 못했습니다: '+String(error);}};
$('settings').onclose=()=>{const id=pendingDetailId;pendingDetailId=null;if(id)show(id);};
document.onkeydown=e=>{if(e.key==='Escape'&&detailMode==='sidebar'&&$('detail').open&&!$('settings').open){$('detail').close();syncWorkSelection();}};

for(const dialog of [$('detail'),$('settings')]){
 let pressedOutside=false;
 const isBackdrop=event=>{const rect=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);};
 dialog.onpointerdown=event=>{pressedOutside=event.button===0&&isBackdrop(event);};
 dialog.onpointercancel=()=>{pressedOutside=false;};
 dialog.onclick=event=>{const shouldClose=pressedOutside&&isBackdrop(event);pressedOutside=false;if(shouldClose)dialog.close();};
}



poll();setInterval(poll,1500);
