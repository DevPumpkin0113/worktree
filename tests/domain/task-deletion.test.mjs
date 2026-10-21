import {nextTaskId,nextMilestoneId} from '../../src/domain/task-editing.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deleteTaskSource,deletionImpact} from '../../src/domain/task-deletion.ts';
import {parseWbs} from '../../src/domain/model.ts';
const source=fs.readFileSync('examples/Visualization-demo.wbs','utf8');
test('선행 참조 해제를 승인한 경우에만 작업을 삭제하고 관련 작업은 유지한다',()=>{
 assert.throws(()=>deleteTaskSource(source,'W002',{children:'keep',detachPredecessors:false}),/선행 참조/);
 const result=deleteTaskSource(source,'W002',{children:'keep',detachPredecessors:true});
 const rows=parseWbs(result).rows;assert.ok(!rows.some(row=>row.id==='W002'));assert.deepEqual(rows.find(row=>row.id==='W003').deps,[]);assert.deepEqual(rows.find(row=>row.id==='W005').deps,['W003','W004']);
});
test('마일스톤 소속만 해제하거나 하위 작업을 함께 삭제할 수 있다',()=>{
 const kept=parseWbs(deleteTaskSource(source,'MS001',{children:'keep',detachPredecessors:false}));
 assert.equal(kept.rows.length,6);assert.ok(kept.rows.every(row=>row.parent==='-'));assert.deepEqual(kept.rows.find(row=>row.id==='W005').deps,['W003','W004']);
 const removed=parseWbs(deleteTaskSource(source,'MS001',{children:'delete',detachPredecessors:false}));assert.equal(removed.rows.length,0);
});
test('함께 삭제할 작업의 외부 선행 참조도 확인하고 다른 문맥의 같은 ID를 보존한다',()=>{
 const extra=source+'| W008 | - | task | 외부 작업 | 확인 | - | todo | - | - | - | W005 |\n\n## 참고\nW005 원문 보존\n';
 const impact=deletionImpact(extra,'MS001','delete');assert.deepEqual(impact.dependents.map(row=>row.id),['W008']);
 assert.throws(()=>deleteTaskSource(extra,'MS001',{children:'delete',detachPredecessors:false}));
 const result=deleteTaskSource(extra,'MS001',{children:'delete',detachPredecessors:true});assert.deepEqual(parseWbs(result).rows.map(row=>row.id),['W008']);assert.match(result,/W005 원문 보존/);
});
test('BOM·CRLF·기존 셀 공백과 설명은 필요한 행·참조 이외에 유지한다',()=>{
 const text='\uFEFF'+source.replace(/\r?\n/g,'\r\n');
 const result=deleteTaskSource(text,'W007',{children:'keep',detachPredecessors:false});
 assert.ok(result.startsWith('\uFEFF'));assert.ok(!result.replaceAll('\r\n','').includes('\n'));assert.match(result,/화면 검증용 가상 데이터/);
 assert.throws(()=>deleteTaskSource(text,'W999',{children:'keep',detachPredecessors:true}));assert.throws(()=>deleteTaskSource(text,'W007',{children:'bad',detachPredecessors:true}));
});

test('최대 번호의 작업·마일스톤을 삭제해도 번호를 재사용하지 않는다',()=>{
 const beforeTask=nextTaskId(source),beforeMilestone=nextMilestoneId(source);
 const after=deleteTaskSource(source,'MS001',{children:'delete',detachPredecessors:false});
 assert.equal(nextTaskId(after),beforeTask);assert.equal(nextMilestoneId(after),beforeMilestone);
 assert.throws(()=>parseWbs(after.replace('next_task_number: 8','next_task_number: invalid')),/next_task_number/);
});
import {describeDocumentErrors} from '../../src/domain/document-errors.ts';
test('번호 기록의 잘못된 값은 정확한 메타데이터 위치를 안내하고 기존 기록은 유지한다',()=>{
 for(const value of ['', '0', '-1', '1.2', 'invalid']) {
  const text=source.replace('schema_version: 2','schema_version: 2\nnext_task_number: '+value);
  let error;try {parseWbs(text);} catch(e) {error=e;}
  const [problem]=describeDocumentErrors(error,text);assert.equal(problem.field,'next_task_number');assert.equal(problem.positions[0].line,4);assert.equal(problem.example,'next_task_number: 1');
 }
 const tracked=source.replace('schema_version: 2','schema_version: 2\nnext_task_number: 99\nnext_milestone_number: 10');
 const after=deleteTaskSource(tracked,'MS001',{children:'delete',detachPredecessors:false});
 assert.equal(nextTaskId(after),'DEMO099');assert.equal(nextMilestoneId(after),'MS010');
 assert.equal((after.match(/next_task_number:/g)||[]).length,1);
});
