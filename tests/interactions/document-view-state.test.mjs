import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDocumentViewState} from '../../src/interactions/document-view-state.ts';

test('문서·보기별 스크롤과 필터로 숨겨진 그룹 접힘을 유지하고 삭제된 그룹은 잊는다',()=>{
 const store=createDocumentViewState(),group={dataset:{workId:'W001'},parentElement:{open:false}};
 let summaries=[group];const chart={scrollLeft:180,scrollTop:45};
 const root={scrollTop:90,scrollLeft:0,querySelector:selector=>selector==='.gantt-scroll'?chart:null,querySelectorAll:()=>summaries};
 store.capture('a','gantt',root);
 summaries=[];root.scrollTop=10;store.capture('a','tree',root);
 summaries=[group];group.parentElement.open=true;chart.scrollLeft=0;
 store.restore('a','gantt',root,[{id:'W001'}]);
 assert.equal(root.scrollTop,90);assert.equal(chart.scrollLeft,180);assert.equal(group.parentElement.open,false);
 store.restore('b','gantt',root,[{id:'W001'}]);assert.equal(root.scrollTop,0);assert.equal(chart.scrollLeft,0);
 store.restore('a','tree',root,[]);group.parentElement.open=true;
 store.restore('a','tree',root,[{id:'W001'}]);assert.equal(group.parentElement.open,true);
 store.forget('a');store.restore('a','tree',root,[]);assert.equal(root.scrollTop,0);
});

test('가상 미지정 묶음은 필터로 숨겨져도 접힘을 유지하고 미소속 작업이 없어지면 잊는다',()=>{
 const store=createDocumentViewState();
 const group={dataset:{viewGroup:'unassigned'},parentElement:{open:false}};
 let summaries=[group];const root={scrollLeft:0,scrollTop:0,querySelector:()=>null,querySelectorAll:()=>summaries};
 const rows=[{id:'W001',type:'task',parent:'-'}];
 store.capture('a','tree',root);summaries=[];store.restore('a','tree',root,rows);
 summaries=[group];group.parentElement.open=true;store.restore('a','tree',root,rows);assert.equal(group.parentElement.open,false);
 store.restore('a','tree',root,[{id:'W001',type:'task',parent:'MS001'}]);group.parentElement.open=true;
 store.restore('a','tree',root,rows);assert.equal(group.parentElement.open,true);
});
