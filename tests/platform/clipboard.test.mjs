import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyText} from '../../src/platform/clipboard.ts';

test('클립보드 API에 여러 줄 오류 원문을 그대로 전달한다',async()=>{
 let copied;
 await copyText('오류\n| 원문 |',{navigator:{clipboard:{writeText:async text=>{copied=text;}}}});
 assert.equal(copied,'오류\n| 원문 |');
});
test('클립보드 API 거부 시 대체 복사를 수행하고 임시 요소·이전 포커스를 복구한다',async()=>{
 let removed=false,restored=false,selected=false;
 const input={style:{},focus(){},select(){selected=true;},remove(){removed=true;}};
 const env={navigator:{clipboard:{writeText:async()=>{throw Error('denied');}}},document:{activeElement:{focus(){restored=true;}},body:{append(){}},createElement:()=>input,execCommand:command=>command==='copy'}};
 await copyText('원문',env);assert.equal(input.value,'원문');assert.equal(selected,true);assert.equal(removed,true);assert.equal(restored,true);
});
test('대체 복사도 실패하면 성공으로 표시하지 않고 임시 요소를 제거한다',async()=>{
 let removed=false;
 const env={document:{body:{append(){}},createElement:()=>({style:{},focus(){},select(){},remove(){removed=true;}}),execCommand:()=>false}};
 await assert.rejects(copyText('원문',env),/복사에 실패/);assert.equal(removed,true);
 await assert.rejects(copyText('원문',{}),/접근할 수 없습니다/);
});
