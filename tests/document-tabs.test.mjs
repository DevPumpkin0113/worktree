import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindDocumentTabs,reorderDocumentTabs} from '../src/interactions/document-tabs.mjs';

function harness(){
 let paths=['a','b','c'],enabled=true;const moves=[];
 const items=paths.map((path,index)=>({dataset:{tabIndex:String(index)},classList:{toggle(){}},getBoundingClientRect:()=>({left:index*100,width:100})}));
 const root={scrollLeft:0,querySelectorAll:()=>items,getBoundingClientRect:()=>({left:0,right:300,top:0,bottom:36}),setPointerCapture(){}};
 const drag=bindDocumentTabs(root,{getPaths:()=>paths,isEnabled:()=>enabled,move(...args){moves.push(args);paths=reorderDocumentTabs(paths,...args);}});
 const event=(index,x,extra={})=>({button:0,pointerId:1,clientX:x,clientY:20,target:{closest:selector=>selector==='[data-tab]'?{dataset:{tab:String(index)}}:null},preventDefault(){},...extra});
 return {root,drag,event,moves,paths:()=>paths,disable:()=>enabled=false};
}

test('포인터로 앞·뒤 순서를 이동하고 드래그 직후의 클릭은 문서를 전환하지 않는다',()=>{
 const h=harness();h.root.onpointerdown(h.event(0,40));h.root.onpointermove(h.event(0,290));h.root.onpointerup(h.event(0,290));
 assert.deepEqual(h.paths(),['b','c','a']);assert.equal(h.drag.consumeClick(),true);assert.equal(h.drag.consumeClick(),false);
 assert.deepEqual(reorderDocumentTabs(['a','b','c'],'c','a'),['c','a','b']);
 assert.deepEqual(reorderDocumentTabs(['a','b'],'missing','a'),['a','b']);
});

test('클릭·닫기 버튼·Esc·영역 밖 드롭·설정 중에는 순서를 변경하지 않는다',()=>{
 const h=harness();h.root.onpointerdown(h.event(0,40));h.root.onpointerup(h.event(0,40));assert.equal(h.drag.consumeClick(),false);
 h.root.onpointerdown(h.event(0,40,{target:{closest:()=>({dataset:{closeTab:'0'}})}}));h.root.onpointermove(h.event(0,290));h.root.onpointerup(h.event(0,290));
 h.root.onpointerdown(h.event(0,40));h.root.onpointermove(h.event(0,290));h.root.onkeydown({key:'Escape',preventDefault(){},stopPropagation(){}});
 h.root.onpointerdown(h.event(0,40));h.root.onpointermove(h.event(0,290));h.root.onpointermove(h.event(0,350));h.root.onpointerup(h.event(0,350));
 h.disable();h.root.onpointerdown(h.event(0,40));h.root.onpointermove(h.event(0,290));h.root.onpointerup(h.event(0,290));assert.equal(h.moves.length,0);
});

test('키보드 이동은 인접 탭을 기준으로 하고 문서 경로가 드래그 도중 사라지면 취소한다',()=>{
 const h=harness();h.root.onkeydown(h.event(1,140,{key:'ArrowLeft',altKey:true,shiftKey:true}));assert.deepEqual(h.paths(),['b','a','c']);
 h.root.onkeydown(h.event(0,40,{key:'ArrowLeft',altKey:true,shiftKey:true}));assert.equal(h.moves.length,1);
 const lost=harness();lost.root.onpointerdown(lost.event(0,40));lost.paths().splice(0,1);lost.root.onpointermove(lost.event(0,290));lost.root.onpointerup(lost.event(0,290));assert.equal(lost.moves.length,0);
});
