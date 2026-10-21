import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseWbs} from '../../src/domain/model.ts';
import {upgradeWbsSource} from '../../src/domain/wbs-migration.ts';
import {nextTaskId,nextMilestoneId} from '../../src/domain/task-editing.ts';
import {describeDocumentErrors} from '../../src/domain/document-errors.ts';
import {summarizeWork} from '../../src/domain/work-summary.ts';
const header='## 작업 목록\n| ID | 상위 ID | 유형 | 작업명 | 산출물 / 완료 기준 | 담당자 | 상태 | 시작일 | 종료일 | 예상 공수(h) | 선행 작업 |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const source='---\nschema_version: 2\n---\n'+header+'| MS009 | - | milestone | 목표 | - | - | auto | 2026-10-01 | 2026-10-31 | - | - |\n| W002 | MS009 | task | 구현 | 확인 | codex | done | 2026-10-02 | 2026-10-03 | 2 | - |\n';
test('v2 목표 기간과 하위 작업 수를 구분하고 번호를 분리한다',()=>{
 const model=parseWbs(source);assert.equal(model.rows[0].start,'2026-10-01');assert.equal(model.rows[0].status,'done');
 assert.equal(summarizeWork(model.rows).taskCount,1);assert.equal(summarizeWork(model.rows).completedMilestones,1);
 assert.equal(nextTaskId(source),'W003');assert.equal(nextMilestoneId(source),'MS010');
});
test('v1 변환은 ID·참조와 BOM·개행을 보존하고 반복 적용해도 같다',()=>{
 const legacy='\uFEFF---\r\nschema_version: 1\r\n---\r\n'+header.replaceAll('\n','\r\n')+'| W001 | - | group | 목표 | 확인 | - | auto | - | - | - | - |\r\n| W002 | W001 | milestone | 승인 | 확인 | codex | done | 2026-10-21 | 2026-10-21 | 0 | - |\r\n';
 const upgraded=upgradeWbsSource(legacy);assert.ok(upgraded.startsWith('\uFEFF'));assert.equal(upgradeWbsSource(upgraded),upgraded);
 assert.ok(!upgraded.replaceAll('\r\n','').includes('\n'));const model=parseWbs(upgraded);assert.equal(model.rows[1].id,'W002');assert.equal(model.rows[1].parent,'W001');assert.equal(model.rows[1].type,'task');assert.equal(model.rows[1].effort,'-');
});
test('v2 상태·의존 안내와 마일스톤 필드 위치는 현재 규칙을 따른다',()=>{
 for(const [text,pattern] of [[source.replace('| auto |','| todo |'),/milestone·group은 auto/],[source.replace('2 | - |','2 | MS009 |'),/task의 ID/]]){
  let error;try{parseWbs(text);}catch(e){error=e;}const [problem]=describeDocumentErrors(error,text);assert.match(problem.hint,pattern);
 }
 const text=source.replace('| - | - |\n| W002','| 0 | - |\n| W002');let error;try{parseWbs(text);}catch(e){error=e;}
 const [problem]=describeDocumentErrors(error,text);assert.equal(problem.positions.length,3);assert.equal(problem.example,'- / - / -');
});
test('미지원 규격은 메타데이터 위치와 수정 예시를 표시한다',()=>{
 const text=source.replace('schema_version: 2','schema_version: 99');let error;try{parseWbs(text);}catch(e){error=e;}
 const [problem]=describeDocumentErrors(error,text);assert.equal(problem.field,'schema_version');assert.equal(problem.positions[0].line,2);assert.equal(problem.example,'schema_version: 2');
});
test('배포 양식·예제·개발 WBS는 v2이며 오류 예제는 의도한 오류만 가진다',()=>{
 for(const name of ['templates/template.wbs','examples/Visualization-demo.wbs','planning/Worktree.wbs']){
  const model=parseWbs(fs.readFileSync(name,'utf8'));assert.equal(model.schemaVersion,2);assert.ok(model.rows.some(row=>row.milestone));
 }
 const text=fs.readFileSync('examples/Error-demo.wbs','utf8');assert.throws(()=>parseWbs(text),error=>error.diagnostics.length===1&&error.diagnostics[0].code==='INVALID_DEPENDENCY');assert.doesNotThrow(()=>parseWbs(text.replace('16 | W999 |','16 | W002 |')));
});
