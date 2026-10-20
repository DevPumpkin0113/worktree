import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeGroups} from '../../src/domain/group-summary.ts';
import {groupSchedule,groupEffort,groupProgress} from '../../src/views/group-summary.ts';
import {renderTaskDetail} from '../helpers/render-helpers.tsx';
import {renderTree} from '../helpers/render-helpers.tsx';
const row=(id,parent,type,effort='-',start='-',end='-',status='todo')=>({id,parent,type,effort,start,end,status,name:id,owner:'-',criteria:'확인',deps:[]});

test('중첩 그룹은 말단만 한 번 집계하며 마일스톤은 일정·완료 개수에만 포함한다',()=>{
 const rows=[row('W001','-','group'),row('W002','W001','group'),row('W003','W002','task','2','2026-10-20','2026-10-21','done'),row('W004','W001','task','6','2026-10-22','2026-10-24','doing'),row('W005','W002','milestone','0','2026-10-29','2026-10-29','done')];
 const original=structuredClone(rows),groups=summarizeGroups(rows),summary=groups.get('W001');
 assert.equal(summary.effort,8);assert.equal(summary.completedEffort,2);assert.equal(summary.progress,25);assert.equal(summary.taskCount,2);assert.equal(summary.completedMilestones,1);
 assert.equal(summary.start,'2026-10-20');assert.equal(summary.end,'2026-10-29');assert.equal(summary.missingDates,0);
 assert.equal(groups.get('W002').progress,100);assert.deepEqual(rows,original);
 assert.match(renderTaskDetail({rows},'W001',id=>id).body,/집계 공수/);
 assert.match(renderTree(rows,()=>true,id=>id),/8 h/);
 // Filtering does not turn a group subtotal into a different total.
 assert.match(renderTree(rows,item=>item.id==='W003',id=>id),/8 h/);
});

test('미정·일부 일정·소수 공수·마일스톤 전용 그룹의 표시를 구분한다',()=>{
 const rows=[row('W001','-','group'),row('W002','W001','task','0.1','2026-10-20','2026-10-21','done'),row('W003','W001','task','0.2'),row('W004','W001','task')];
 const summary=summarizeGroups(rows).get('W001');
 assert.equal(summary.missingDates,2);assert.equal(summary.missingEfforts,1);assert.equal(summary.progress,null);
 assert.match(groupSchedule(summary),/일정 미정 포함/);assert.match(groupEffort(summary),/소계 0.3 h \+ 미정 1개/);assert.equal(groupProgress(summary),'진척도 산정 불가');
 const only=summarizeGroups([row('W001','-','group'),row('W002','W001','milestone','0')]).get('W001');
 assert.equal(groupSchedule(only),'일정 미정');assert.equal(groupEffort(only),'0 h');assert.equal(only.progress,null);assert.equal(only.missingEfforts,0);
});

test('문서 공수 숨김은 트리와 그룹·작업 상세에 함께 적용된다',()=>{
 const rows=[row('W001','-','group'),row('W002','W001','task','4')];
 assert.doesNotMatch(renderTree(rows,()=>true,id=>id,false),/공수|진척도/);
 for(const id of ['W001','W002'])assert.doesNotMatch(renderTaskDetail({rows,useEffort:false},id,id=>id).body,/집계 공수|예상 공수|진척도/);
 assert.match(renderTaskDetail({rows,useEffort:true},'W002',id=>id).body,/예상 공수/);
});
