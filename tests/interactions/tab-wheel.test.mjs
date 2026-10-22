import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindTabWheel } from '../../src/interactions/tab-wheel.ts';
function fixture() {
 let listener, removed=false, enabled=true;
 const root={scrollWidth:500,clientWidth:100,scrollLeft:0,
  addEventListener(name, handler, options){assert.equal(name,'wheel');assert.equal(options.passive,false);listener=handler;},
  removeEventListener(name, handler){removed=listener===handler;}};
 const dispose=bindTabWheel(root,()=>enabled);
 return {root,dispose,removed:()=>removed,disable:()=>enabled=false,
  wheel(extra={}){let prevented=false;listener({deltaX:0,deltaY:40,deltaMode:0,ctrlKey:false,preventDefault(){prevented=true;},...extra});return prevented;}};
}
test('탭 휠은 세로 입력·수평 입력과 줄/페이지 단위를 가로 위치로 변환하고 경계를 제한한다',()=>{
 const f=fixture();assert.equal(f.wheel(),true);assert.equal(f.root.scrollLeft,40);
 f.wheel({deltaX:60,deltaY:10});assert.equal(f.root.scrollLeft,100);
 f.wheel({deltaY:2,deltaMode:1});assert.equal(f.root.scrollLeft,132);
 f.wheel({deltaY:1,deltaMode:2});assert.equal(f.root.scrollLeft,232);
 f.wheel({deltaY:1000});assert.equal(f.root.scrollLeft,400);
 f.wheel({deltaY:-1000});assert.equal(f.root.scrollLeft,0);
 f.dispose();assert.equal(f.removed(),true);
});
test('스크롤이 없거나 비활성·확대 제스처인 경우 휠 기본 동작을 가로채지 않는다',()=>{
 const f=fixture();assert.equal(f.wheel({ctrlKey:true}),false);
 f.root.scrollWidth=100;assert.equal(f.wheel(),false);
 f.root.scrollWidth=500;f.disable();assert.equal(f.wheel(),false);
 assert.equal(f.root.scrollLeft,0);f.dispose();
});
