import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEpics } from '../../apps/desktop/src/views/epic-overview.ts';
import { parseProject } from '@worktree/core/project-document';
import { projectTaskDraft, updateProjectTask } from '@worktree/core/task-editing';
import { projectFixture } from '../helpers/project-fixture.ts';

test('에픽 현황은 마일스톤·직속 이슈를 한 번씩 집계하고 미지정 이슈는 제외한다', () => {
 const rows=parseProject(projectFixture()).rows, task=rows.find(r=>r.type==='task'), milestone=rows.find(r=>r.milestone);
 const epic={...milestone,id:'EP001',name:'목표',epic:true,milestone:false,parent:'-'};
 const result=summarizeEpics([epic,{...milestone,parent:'EP001'},...rows.filter(r=>r.type==='task'),{...task,id:'W003',parent:'EP001',status:'blocked'},{...task,id:'W004',parent:'-',status:'blocked'},{...epic,id:'EP002'}]);
 assert.equal(result[0].total,3); assert.equal(result[0].completed,1); assert.equal(result[0].progress,33); assert.equal(result[0].blocked,1);
 assert.equal(result[1].total,0);assert.equal(result[1].progress,0);assert.equal(result[1].start,null);
});
test('명시한 에픽 목표 기간이 우선이며 없으면 하위 일정과 미정 개수를 반환한다',()=>{
 const rows=parseProject(projectFixture()).rows, task=rows.find(r=>r.type==='task'), group=rows.find(r=>r.milestone);
 const epic={...group,id:'EP001',epic:true,milestone:false,parent:'-',start:'-',end:'-'};
 const tasks=[{...task,parent:'EP001',start:'2026-11-05',end:'2026-11-06'},{...task,id:'W003',parent:'EP001',start:'-',end:'-'}];
 const [aggregate]=summarizeEpics([epic,...tasks]);assert.equal(aggregate.start,'2026-11-05');assert.equal(aggregate.end,'2026-11-06');assert.equal(aggregate.missingDates,1);assert.equal(aggregate.target,false);
 const [target]=summarizeEpics([{...epic,start:'2026-12-01',end:'2026-12-31'},...tasks]);assert.equal(target.start,'2026-12-01');assert.equal(target.target,true);
 assert.deepEqual(summarizeEpics([]),[]);
});
test('에픽 Markdown 목표는 생성·수정과 다른 필드 부분 변경에서 보존된다',()=>{
 let source=projectFixture();const draft=projectTaskDraft(source);draft.type='epic';draft.name='에픽';draft.description='# 목표\n\n- 결과';
 const created=updateProjectTask(source,draft);source=created.text;assert.equal(parseProject(source).rows.find(r=>r.id===created.id).description,draft.description);
 const next=projectTaskDraft(source,created.id);next.name='변경';source=updateProjectTask(source,next,created.id).text;
 assert.equal(parseProject(source).rows.find(r=>r.id===created.id).description,draft.description);
});
