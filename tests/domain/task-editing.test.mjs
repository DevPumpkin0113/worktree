import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskDraft,updateTaskSource,nextTaskId} from '../../src/domain/task-editing.ts';
import {parseWbs} from '../../src/domain/model.ts';
const header='## 작업 목록\n| ID | 상위 ID | 유형 | 작업명 | 산출물 / 완료 기준 | 담당자 | 상태 | 시작일 | 종료일 | 예상 공수(h) | 선행 작업 |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const row='| W002 | W001 | task | 작업 | 확인 | codex | todo | - | - | 2 | - |';
const source='---\nschema_version: 2\ntitle: 테스트\nid_prefix: OBS\n---\n설명 그대로\n\n'+header+'| W001 | - | milestone | 그룹 | 완료 | - | auto | - | - | - | - |\n'+row+'\n\n## 참고\n| 설명 | 표 |\n원문';

test('한 셀 수정은 BOM·CRLF·다른 셀 공백·설명·표·그룹 auto를 보존한다',()=>{
 const text='\uFEFF'+source.replaceAll('\n','\r\n').replace('| 작업 |','|  작업  |');
 const draft=taskDraft(text,'W002');draft.status='doing';
 const updated=updateTaskSource(text,draft,'W002');
 assert.equal(updated.text,text.replace('| todo |','| doing |'));
 assert.equal(updated.id,'W002');assert.equal(taskDraft(updated.text,'W001').status,'auto');
});
test('추가 ID는 기존 모든 ID 이후의 문서 접두어를 쓰고 표 바깥은 보존한다',()=>{
 assert.equal(nextTaskId(source),'OBS003');
 const draft={...taskDraft(source),name:'추가 | 작업',criteria:'<확인>',parent:'W001'};
 const {text,id}=updateTaskSource(source,draft);
 assert.equal(id,'OBS003');assert.ok(text.startsWith(source.slice(0,source.indexOf('\n\n## 참고'))));
 assert.ok(text.endsWith('\n\n## 참고\n| 설명 | 표 |\n원문'));
 assert.equal(parseWbs(text).rows.find(row=>row.id===id).name,'추가 | 작업');
 assert.equal(nextTaskId(text),'OBS004');
});
test('마지막 개행이 없는 문서와 빈 작업 표에도 행을 추가한다',()=>{
 const single=header+row.replace('W001','-');
 const draft={...taskDraft(single),name:'새 작업',criteria:'확인'};
 const update=updateTaskSource(single,draft);
 assert.ok(!update.text.endsWith('\n'));assert.equal(parseWbs(update.text).rows.length,2);
 assert.equal(parseWbs(updateTaskSource(header,draft).text).rows.length,1);
});
test('순환·잘못된 날짜·0 공수·원본 유형 변경과 줄바꿈을 거부한다',()=>{
 const original=taskDraft(source,'W002');
 for(const change of [{deps:'W002'},{start:'2026-02-30',end:'2026-03-01'},{effort:'0'},{type:'milestone'},{name:'줄\n바꿈'},{name:'literal &#124;'},{criteria:''}])assert.throws(()=>updateTaskSource(source,{...original,...change},'W002'));
 assert.throws(()=>updateTaskSource(source,original,'W999'));
 assert.equal(taskDraft(source,'W002').name,'작업');
});
test('새 마일스톤은 선택 기간과 공수 미사용으로 만들고 빈 상태를 허용한다',()=>{
 const draft={...taskDraft(source),type:'milestone',name:'목표',criteria:'-',start:'2026-10-21',end:'2026-11-01'};
 const result=updateTaskSource(source,draft);const row=parseWbs(result.text).rows.at(-1);
 assert.equal(row.effort,'-');assert.equal(row.milestone,true);assert.equal(row.status,'todo');
 assert.deepEqual(row.deps,[]);assert.equal(row.end,'2026-11-01');
});
