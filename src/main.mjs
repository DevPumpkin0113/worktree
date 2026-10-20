import {workOwners,matchesWork} from './domain/work-filter.mjs';
import {createSessionStorage,emptySession,MAX_RECENT_FILES,MAX_SESSION_TABS} from './platform/session-storage.mjs';
import {createDocumentViewState} from './interactions/document-view-state.mjs';
import {escapeHtml as esc} from './views/html.mjs';
import {summarizeWork} from './domain/work-summary.mjs';
import {renderMetrics,renderStatusNotice} from './views/work-summary.mjs';
import {renderTree,renderBoard} from './views/list-views.mjs';
import {createSettingsStorage} from './platform/settings-storage.mjs';
import {setupAppInfo} from './interactions/app-info.mjs';
import {setupSettingsNavigation} from './interactions/settings-navigation.mjs';
import {copyText} from './platform/clipboard.mjs';
import {describeDocumentErrors,formatDocumentProblem} from './domain/document-errors.mjs';
import {renderDocumentErrors} from './views/document-errors.mjs';
import {markSelectedWork} from './interactions/work-selection.mjs';
import {readDetailMode,saveDetailMode} from './domain/detail-settings.mjs';
import {parseWbs} from './domain/model.mjs';
import {renderTaskDetail} from './views/task-detail.mjs';
import {bindChartPan} from './interactions/chart-pan.mjs';
import {renderDependencies,renderGantt} from './views/schedule-views.mjs';
import {createIdLabels,readSeparator,saveSeparator} from './domain/id-display.mjs';
import {invoke,Channel} from '@tauri-apps/api/core';
import {getVersion} from '@tauri-apps/api/app';
import {setupWindowFrame,setWindowTitle} from './platform/window-frame.mjs';
const documents=new Map();let activePath=null,polling=false;
const sessionStorage=createSessionStorage(invoke),documentViews=new Map();
let recentFiles=[],restoringSession=true;
const viewState=createDocumentViewState();let displayedPath=null,renderedView=null,refreshDetail=null;
let validationProblems=[],operationProblems=[],renderedProblems='';
function setProblemsOpen(open,focus=false){
 $('documentProblems').hidden=!open;$('error').setAttribute('aria-expanded',String(open));
 if(focus)(open?$('documentProblems'):$('error')).focus?.({preventScroll:true});
}
async function copyProblems(text){
 try{await copyText(text);$('copyFeedback').textContent='복사했습니다.';}
 catch{$('copyFeedback').textContent='복사 실패 · 내용을 선택해 직접 복사하세요.';}
}

function updateProblems(){
 const problems=[...validationProblems,...operationProblems];
 $('error').hidden=!problems.length;$('notice').hidden=!!problems.length;
 $('error').textContent=problems.length?'⚠ '+problems[0].kind+' '+problems.length+'개 · '+problems[0].message:'';
 $('error').title=problems.length?'클릭하여 문제 패널 열기/닫기: '+problems[0].message:'';
 const signature=JSON.stringify(problems);
 if(signature!==renderedProblems){$('problemsBody').innerHTML=renderDocumentErrors(problems);$('copyFeedback').textContent='';renderedProblems=signature;}
 $('problemsCount').textContent=String(problems.length);
 if(!problems.length)setProblemsOpen(false);
}
function clearProblems(){validationProblems=[];operationProblems=[];updateProblems();}
function reportProblem(error,source='',kind='문서 오류',markdown=''){
 const problems=describeDocumentErrors(error,markdown,source,kind);
 if(kind==='문서 오류')validationProblems=problems;else operationProblems=problems;
 updateProblems();
}

function tabs(){ $('reload').disabled=!activePath; $('tabs').innerHTML=[...documents.keys()].map((path,i)=>{
let title=path.split(/[\\/]/).pop();try{title=parseWbs(documents.get(path)).title;}catch{}
return `<div class="document-tab ${path===activePath?'selected':''}" title="${esc(path)}"><button data-tab="${i}" aria-pressed="${path===activePath}">${esc(title)}</button><button class="tab-close" data-close-tab="${i}" aria-label="${esc(title)} 문서 닫기">×</button></div>`;
}).join('')||'<span class="dock-empty">열린 문서 없음</span>';saveSession(); }
function sessionSnapshot(){
 const paths=[...documents.keys()].slice(-MAX_SESSION_TABS);
 if(activePath&&!paths.includes(activePath)&&documents.has(activePath))paths.splice(0,1,activePath);
 return {schemaVersion:1,recentFiles:recentFiles.slice(0,MAX_RECENT_FILES),tabs:paths.map(path=>({path,...(documentViews.get(path)||{view:'tree',ganttUnit:'day'})})),activePath:paths.includes(activePath)?activePath:null};
}
function saveSession(){
 if(restoringSession)return;
 try{sessionStorage.save(sessionSnapshot()).catch(error=>reportProblem(error,'','세션 저장 오류'));}
 catch(error){reportProblem(error,'','세션 저장 오류');}
}
function renderRecentFiles(){
 $('recentFiles').innerHTML=recentFiles.length?recentFiles.map((path,index)=>`<button type="button" data-recent="${index}" title="${esc(path)}">${esc(path.split(/[\\/]/).pop())}<span>${esc(path)}</span></button>`).join(''):'<p>최근 파일이 없습니다.</p>';
}
async function openPath(path,{quiet=false}={}){
 try{
  const text=await invoke('read_document',{path});documents.set(path,text);activePath=path;
  recentFiles=[path,...recentFiles.filter(item=>item!==path)].slice(0,MAX_RECENT_FILES);renderRecentFiles();
  load(text,path);tabs();return null;
 }catch(error){if(!quiet)reportProblem(error,path,'파일 읽기 오류');return {error,path};}
}

let model,view='tree',idLabels=new Map(),graphFocus=null,ganttUnit='day';
const storage=createSettingsStorage({invoke,legacyStorage:()=>window.localStorage});
let settingsLoadError='';
for(const id of ['idSeparator','detailMode','autoCheckUpdates'])document.getElementById(id).disabled=true;
let separator=readSeparator(storage),detailMode=readDetailMode(storage),selectedDetailId=null,pendingDetailId=null;
const label=id=>idLabels.get(id)||id;
const $=id=>document.getElementById(id);
function matches(row){return matchesWork(row,{query:$('search').value,status:$('status').value,owner:$('owner').value},label);}
function updateOwnerFilter(){
 const owners=workOwners(model.rows),control=$('owner'),previous=control.value||'all';
 control.innerHTML='<option value="all">전체 담당자</option>'+owners.map(owner=>`<option value="${esc('owner:'+owner)}">${esc(owner==='-'?'담당 미정':owner)}</option>`).join('');
 control.value=owners.some(owner=>'owner:'+owner===previous)?previous:'all';
}
function syncWorkSelection(){markSelectedWork($('content'),detailMode==='sidebar'&&$('detail').open?selectedDetailId:null);}
function show(id){if(!model)return;const result=renderTaskDetail(model,id,label);if(!result)return;selectedDetailId=id;$('detailTitle').textContent=result.title;$('detailMeta').innerHTML=result.meta;$('detailBody').innerHTML=result.body;const dialog=$('detail');const sidebar=detailMode==='sidebar';if(dialog.open&&dialog.classList.contains('sidebar')!==sidebar)dialog.close();dialog.classList.toggle('sidebar',sidebar);if(!dialog.open){if(sidebar)dialog.show();else dialog.showModal();}else dialog.scrollTop=0;syncWorkSelection();}
function render(capture=true){if(!model)return;if(capture&&displayedPath&&renderedView)viewState.capture(displayedPath,renderedView,$('content'));idLabels=createIdLabels(model,separator);const rows=model.rows,leaves=rows.filter(r=>r.type!=='group');
updateOwnerFilter();
const summary=summarizeWork(rows);
$('metrics').innerHTML=renderMetrics(summary);
$('notice').textContent=renderStatusNotice(summary);
const filtered=leaves.filter(matches);let html='';
if(view==='tree')html=renderTree(rows,matches,label);
if(view==='board')html=renderBoard(filtered,label);
if(view==='flow')html=renderDependencies(leaves,filtered,graphFocus,label);
if(view==='gantt')html=renderGantt(filtered,label,ganttUnit,undefined,$('content').clientWidth||960);
const collisions=model.rows.filter(r=>label(r.id).includes('[')).length;if(collisions)$('notice').textContent+=' 표시 ID 중복 '+collisions+'개: 원본 ID를 함께 표시합니다.';
$('notice').title=$('notice').textContent;
$('content').innerHTML=html||'<div class="empty">조건에 맞는 작업이 없습니다.</div>';viewState.restore(displayedPath,view,$('content'),rows);renderedView=view;syncWorkSelection();}
function load(markdown,source){
 const same=displayedPath===source;
 if(displayedPath&&documents.has(displayedPath))documentViews.set(displayedPath,{view,ganttUnit});
 const savedView=documentViews.get(source);if(!same){view=savedView?.view||'tree';ganttUnit=savedView?.ganttUnit||'day';$('owner').value='all';}
 syncViewButtons();
 if(model&&displayedPath&&renderedView)viewState.capture(displayedPath,renderedView,$('content'));
 if(!same){refreshDetail=null;graphFocus=null;}
 else if(model)refreshDetail={id:$('detail').open?selectedDetailId:pendingDetailId,scroll:$('detail').scrollTop||0};
 clearProblems();if($('detail').open)$('detail').close();selectedDetailId=null;pendingDetailId=null;
 displayedPath=source;renderedView=null;
 $('title').textContent=source.split(/[\\/]/).pop();$('source').textContent=source;$('source').title=source;setWindowTitle($('title').textContent);
 try{
  model=parseWbs(markdown);
  if(!model.rows.some(row=>row.id===graphFocus))graphFocus=null;
  $('title').textContent=model.title;setWindowTitle(model.title);tabs();render(false);
  const detail=refreshDetail;
  if(detail?.id&&model.rows.some(row=>row.id===detail.id)){
   if($('settings').open)pendingDetailId=detail.id;
   else{show(detail.id);$('detail').scrollTop=detail.scroll;}
  }
  refreshDetail=null;if($('settings').open)previewIds();
 }catch(e){model=null;reportProblem(e,source,'문서 오류',markdown);$('content').innerHTML='<div class="document-unavailable"><strong>문서를 표시할 수 없습니다.</strong><p>하단 상태 표시줄의 오류를 눌러 원인과 수정 방법을 확인하세요.</p></div>';$('metrics').replaceChildren();}
}
async function reload(){if(activePath)await openPath(activePath);}
async function poll(){if(polling)return;polling=true;try{const paths=await invoke('take_open_requests');for(const path of paths)await openPath(path);if(activePath){const path=activePath;try{const text=await invoke('read_document',{path});if(operationProblems[0]?.kind==='파일 읽기 오류'&&operationProblems[0]?.source===path){operationProblems=[];updateProblems();}if(path===activePath&&documents.get(path)!==text){documents.set(path,text);load(text,path);}}catch(e){reportProblem(e,path,'파일 읽기 오류');}}}catch(e){reportProblem(e,activePath||'','앱 오류');}finally{polling=false;}}
function syncViewButtons(){document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;syncViewButtons();if(activePath)documentViews.set(activePath,{view,ganttUnit});render();saveSession();});
$('search').oninput=render;$('status').onchange=render;$('owner').onchange=render;$('reload').onclick=reload;$('dockOpen').onclick=async()=>{try{const path=await invoke('pick_document');if(path)await openPath(path);}catch(e){reportProblem(e,activePath||'','앱 오류');}};$('close').onclick=()=>{$('detail').close();syncWorkSelection();};
$('detail').onclose=syncWorkSelection;
$('error').onclick=()=>{if(validationProblems.length||operationProblems.length)setProblemsOpen($('documentProblems').hidden,true);};
$('problemsClose').onclick=()=>setProblemsOpen(false,true);
$('problemsCopyAll').onclick=()=>copyProblems([...validationProblems,...operationProblems].map(formatDocumentProblem).join('\n\n---\n\n'));
$('problemsBody').onclick=e=>{
 const button=e.target.closest('[data-copy-problem],[data-copy-source]');if(!button)return;
 const source='copySource' in button.dataset;
 const problem=[...validationProblems,...operationProblems][Number(source?button.dataset.copySource:button.dataset.copyProblem)];
 if(problem)copyProblems(source?problem.raw:formatDocumentProblem(problem));
};
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
$('content').onchange=e=>{if(e.target.id==='ganttUnit'){ganttUnit=e.target.value;if(activePath)documentViews.set(activePath,{view,ganttUnit});render();saveSession();}};
$('tabs').onclick=e=>{const close=e.target.closest('[data-close-tab]'),tab=e.target.closest('[data-tab]');if(close){const path=[...documents.keys()][Number(close.dataset.closeTab)];documents.delete(path);documentViews.delete(path);viewState.forget(path);if(path===activePath){activePath=[...documents.keys()].at(-1)||null;if(activePath)load(documents.get(activePath),activePath);else{if($('detail').open)$('detail').close();selectedDetailId=null;model=null;displayedPath=null;renderedView=null;refreshDetail=null;$('title').textContent='Worktree';setWindowTitle('Worktree');$('source').textContent='열린 문서 없음';$('source').title='';$('content').replaceChildren();$('metrics').replaceChildren();$('notice').textContent='문서를 열어 주세요.';$('notice').title='';clearProblems();}}tabs();}else if(tab){activePath=[...documents.keys()][Number(tab.dataset.tab)];load(documents.get(activePath),activePath);tabs();}};
$('recentOpen').onclick=()=>{const open=$('recentFiles').hidden;$('recentFiles').hidden=!open;$('recentOpen').setAttribute('aria-expanded',String(open));renderRecentFiles();};
$('recentFiles').onclick=event=>{const button=event.target.closest('[data-recent]');if(!button)return;const path=recentFiles[Number(button.dataset.recent)];$('recentFiles').hidden=true;$('recentOpen').setAttribute('aria-expanded','false');if(path)openPath(path);};
document.addEventListener?.('pointerdown',event=>{if(!event.target.closest?.('#recentFiles,#recentOpen')){$('recentFiles').hidden=true;$('recentOpen').setAttribute('aria-expanded','false');}});
$('dockOpen').disabled=true;$('recentOpen').disabled=true;
$('notice').textContent='우측 하단 + 버튼으로 문서를 열거나 파일을 끌어오세요.';
setupWindowFrame(error=>reportProblem(error,activePath||'','창 제어 오류'));
tabs();

function previewIds(){const prefix=model?.idPrefix||'W';$('idPreview').textContent='미리보기: '+prefix+($('idSeparator').value==='hyphen'?'-':'')+'001';}
async function updateAppVersion(){try{$('appVersion').textContent='버전 '+await getVersion();}catch{$('appVersion').textContent='버전 정보를 불러오지 못했습니다.';}}
const settingsNavigation=setupSettingsNavigation(document);
function syncSettingsState(){
 const open=$('settings').open;
 $('settingsOpen').classList.toggle('active',open);$('settingsOpen').setAttribute('aria-pressed',String(open));$('settingsOpen').setAttribute('aria-expanded',String(open));
 for(const id of ['workspace','documentDock','appStatusbar','documentProblems'])$(id).inert=open;
}
$('settingsOpen').onclick=()=>{
 if($('settings').open){$('settings').close();syncSettingsState();return;}
 settingsNavigation.activate('display');$('detailMode').value=detailMode;updateAppVersion();$('idSeparator').value=separator;$('settingsError').textContent=settingsLoadError||storage.warning;previewIds();
 if($('detail').open){pendingDetailId=selectedDetailId;$('detail').close();}
 $('settings').show();syncSettingsState();
};
$('idSeparator').onchange=async()=>{const control=$('idSeparator');control.disabled=true;try{await saveSeparator(storage,control.value);separator=readSeparator(storage);$('settingsError').textContent='';previewIds();render();}catch(error){$('idSeparator').value=separator;previewIds();$('settingsError').textContent='설정을 저장하지 못했습니다: '+String(error);}finally{control.disabled=false;}};
$('settingsClose').onclick=()=>{$('settings').close();syncSettingsState();};
$('detailMode').onchange=async()=>{const control=$('detailMode');control.disabled=true;try{await saveDetailMode(storage,control.value);detailMode=readDetailMode(storage);$('settingsError').textContent='';if($('detail').open){pendingDetailId=selectedDetailId;$('detail').close();}}catch(error){$('detailMode').value=detailMode;$('settingsError').textContent='설정을 저장하지 못했습니다: '+String(error);}finally{control.disabled=false;}};
$('settings').onclose=()=>{syncSettingsState();if($('settings').open)return;const id=pendingDetailId;pendingDetailId=null;$('settingsOpen').focus?.({preventScroll:true});if(id)show(id);};
document.onkeydown=e=>{
 if(e.key!=='Escape')return;
 if(!$('recentFiles').hidden){e.preventDefault();$('recentFiles').hidden=true;$('recentOpen').setAttribute('aria-expanded','false');return;}
 if($('settings').open){e.preventDefault();$('settings').close();syncSettingsState();return;}
 if($('detail').open&&detailMode==='modal')return;
 if(!$('documentProblems').hidden){e.preventDefault();setProblemsOpen(false,true);return;}
 if(detailMode==='sidebar'&&$('detail').open){$('detail').close();syncWorkSelection();}
};

for(const dialog of [$('detail')]){
 let pressedOutside=false;
 const isBackdrop=event=>{const rect=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);};
 dialog.onpointerdown=event=>{pressedOutside=event.button===0&&isBackdrop(event);};
 dialog.onpointercancel=()=>{pressedOutside=false;};
 dialog.onclick=event=>{const shouldClose=pressedOutside&&isBackdrop(event);pressedOutside=false;if(shouldClose)dialog.close();};
}



function startAppInfo(settingsStorage=storage){
 setupAppInfo({document,storage:settingsStorage,invoke,makeChannel:handler=>{const channel=new Channel();channel.onmessage=handler;return channel;}});
}
const settingsReady=storage.ready.then(()=>{
 separator=readSeparator(storage);detailMode=readDetailMode(storage);$('idSeparator').value=separator;$('detailMode').value=detailMode;
 for(const id of ['idSeparator','detailMode','autoCheckUpdates'])$(id).disabled=false;
 $('settingsError').textContent=storage.warning;previewIds();render();startAppInfo();
}).catch(error=>{
 settingsLoadError='설정을 불러오지 못했습니다: '+String(error);$('settingsError').textContent=settingsLoadError;
 startAppInfo({getItem:()=> 'false',setItem:()=>Promise.reject(error)});$('autoCheckUpdates').disabled=true;
});
async function restoreSession(){
 let saved=emptySession();const failures=[];
 try{saved=await sessionStorage.load();}catch(error){failures.push(...describeDocumentErrors(error,'','','세션 읽기 오류'));}
 recentFiles=saved.recentFiles;renderRecentFiles();
 for(const tab of saved.tabs)documentViews.set(tab.path,{view:tab.view,ganttUnit:tab.ganttUnit});
 for(const tab of saved.tabs){const failed=await openPath(tab.path,{quiet:true});if(failed)failures.push(...describeDocumentErrors(failed.error,'',tab.path,'파일 읽기 오류'));}
 // Preserve recent order; opening restored tabs is not a new user visit.
 recentFiles=saved.recentFiles;renderRecentFiles();
 if(saved.activePath&&documents.has(saved.activePath)){activePath=saved.activePath;load(documents.get(activePath),activePath);}
 restoringSession=false;$('dockOpen').disabled=false;$('recentOpen').disabled=false;tabs();
 await poll();
 if(failures.length){operationProblems.push(...failures);updateProblems();}
 setInterval(poll,1500);
}
const sessionReady=restoreSession();
