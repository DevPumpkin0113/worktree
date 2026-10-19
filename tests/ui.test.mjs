import {renderTaskDetail} from '../src/views/task-detail.mjs';
import {bindChartPan} from '../src/interactions/chart-pan.mjs';
import {renderDependencies,renderGantt} from '../src/views/schedule-views.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseWbs} from '../src/domain/model.mjs';
import {createIdLabels,readSeparator,saveSeparator} from '../src/domain/id-display.mjs';
test('표시 설정이 모든 보기·상세·검색에 반영되고 원본 참조를 유지한다',async()=>{
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{value:id==='status'?'all':'',textContent:'',innerHTML:'',showModal(){this.open=true;},close(){this.open=false;},replaceChildren(){this.innerHTML='';},classList:{toggle(){}}});return elements.get(id);};
 const views=['tree','board','flow','gantt'].map(view=>({dataset:{view},classList:{toggle(){}},setAttribute(){}}));
 const data=new Map();
 const source=fs.readFileSync(new URL('../planning/Worktree.wbs',import.meta.url),'utf8').replace('project_id: WORKTREE','project_id: WORKTREE\nid_prefix: OBS');
 const original=parseWbs(source);
 const script=fs.readFileSync(new URL('../src/main.mjs',import.meta.url),'utf8').split(String.fromCharCode(10)).filter(line=>!line.startsWith('import ')).join(String.fromCharCode(10));
 const context={renderTaskDetail,bindChartPan,renderDependencies,renderGantt,getVersion:async()=>'0.3.5',parseWbs,createIdLabels,readSeparator,saveSeparator,source,console,document:{getElementById:element,querySelectorAll:()=>views},window:{localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}},invoke:async()=>[],setWindowTitle(){},setupWindowFrame(){},setInterval(){}};
 vm.runInNewContext(script+"\nload(source,'Worktree.wbs');",context);
 assert.match(element('content').innerHTML,/OBS001/);
 element('settingsOpen').onclick();await new Promise(resolve=>setImmediate(resolve));assert.equal(element('appVersion').textContent,'Worktree · v0.3.5');element('idSeparator').value='hyphen';element('idSeparator').onchange();assert.equal(element('settings').open,true);
 assert.equal(readSeparator(context.window.localStorage),'hyphen');element('settingsClose').onclick();assert.equal(element('settings').open,false);element('settingsOpen').onclick();assert.equal(element('idSeparator').value,'hyphen');
 for(const view of views){view.onclick();assert.match(element('content').innerHTML,/OBS-00/);assert.match(element('content').innerHTML,/data-(id|select)="W00/);}
 views[0].onclick();element('content').onclick({target:{closest:()=>({dataset:{id:'W002'}})}});
 assert.match(element('detailTitle').textContent,/OBS-002/);assert.match(element('detailBody').innerHTML,/원본 ID/);assert.match(element('detailBody').innerHTML,/W002/);
 element('search').value='OBS-002';element('search').oninput();assert.match(element('content').innerHTML,/OBS-002/);
 element('search').value='W002';element('search').oninput();assert.match(element('content').innerHTML,/OBS-002/);
 assert.deepEqual(parseWbs(source).rows,original.rows);
});
