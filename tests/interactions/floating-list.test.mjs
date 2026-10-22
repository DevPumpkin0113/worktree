import { test } from 'node:test';
import assert from 'node:assert/strict';
import { floatingListPosition } from '../../apps/desktop/src/interactions/floating-list.ts';
test('드롭다운은 버튼 아래에 뜨고 아래 공간이 부족하면 위에 배치한다',()=>{
 const viewport={width:800,height:600};
 const below=floatingListPosition({left:100,top:100,bottom:140,width:180},viewport,200);
 assert.deepEqual(below,{left:100,top:146,width:180,maxHeight:240});
 const above=floatingListPosition({left:100,top:480,bottom:520,width:180},viewport,200);
 assert.equal(above.top,274);assert.equal(above.width,180);
});
test('드롭다운은 화면 가장자리와 좁은 화면·공간에 맞춘다',()=>{
 const result=floatingListPosition({left:780,top:20,bottom:60,width:400},{width:320,height:180},500);
 assert.equal(result.left,8);assert.equal(result.width,304);assert.equal(result.maxHeight,106);
 assert.ok(result.top+result.maxHeight<=172);
});

test('내용 너비를 지정하면 버튼보다 넓거나 좁은 목록도 화면 안에 배치한다',()=>{
 const anchor={left:680,top:80,bottom:120,width:180};
 const wide=floatingListPosition(anchor,{width:800,height:600},200,300);
 assert.equal(wide.width,300);assert.equal(wide.left,492);
 const narrow=floatingListPosition(anchor,{width:800,height:600},200,150);
 assert.equal(narrow.width,150);assert.equal(narrow.left,642);
});
