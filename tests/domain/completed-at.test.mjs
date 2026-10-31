import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture } from '../helpers/project-fixture.ts';
import { projectTaskDraft, updateProjectTask } from '@worktree/core/task-editing';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource } from '@worktree/core/project-source';
import { readTaskFile, writeTaskFile } from '@worktree/core/task-file';

test('완료/수정/재오픈/재완료 시각과 예정 종료일을 공통 편집에서 관리한다',()=>{
 let text=projectFixture();
 const save=(status,now)=>{text=updateProjectTask(text,{...projectTaskDraft(text,'W001'),status,start:'2026-10-21',end:'2026-10-22'},'W001',now).text;return parseProject(text).rows.find(r=>r.id==='W001');};
 const first='2026-10-23T00:00:00.000Z',second='2026-10-24T00:00:00.000Z';
 assert.equal(save('done',first).completedAt,first);
 assert.equal(save('done',second).completedAt,first);
 assert.equal(save('doing',second).completedAt,undefined);
 const row=save('done','2026-10-25T00:00:00.000Z');
 assert.equal(row.completedAt,'2026-10-25T00:00:00.000Z');assert.equal(row.end,'2026-10-22');
 const legacy=updateProjectTask(text,{...projectTaskDraft(text,'W002'),name:'Legacy edited'},'W002',second).text;
 assert.equal(parseProject(legacy).rows.find(r=>r.id==='W002').completedAt,undefined);
 const created=updateProjectTask(text,{...projectTaskDraft(text),name:'Created done',status:'done'},undefined,second);
 assert.equal(parseProject(created.text).rows.find(r=>r.id===created.id).completedAt,second);
});

test('완료 시각은 UTC 정규 시각·완료 상태·수정 시각 상한을 검증한다',()=>{
 for(const completedAt of ['bad','2026-02-30T00:00:00.000Z','2099-01-01T00:00:00.000Z']){
  const source=readSource(projectFixture());const file='tasks/W002.md';const task=readTaskFile(file,source.files[file]);task.metadata.completedAt=completedAt;source.files[file]=writeTaskFile(task.metadata,task.description);assert.throws(()=>parseProject(serializeSource(source)));
 }
});

test('회고 등록한 완료 이슈는 문서 생성일보다 이전 시각으로 명시 보정할 수 있다',()=>{
 const text=projectFixture(),at='2026-10-19T15:00:00.000Z';
 const corrected=updateProjectTask(text,{...projectTaskDraft(text,'W002'),completedAt:at},'W002','2026-10-31T00:00:00.000Z');
 assert.equal(parseProject(corrected.text).rows.find(r=>r.id==='W002').completedAt,at);
 assert.throws(()=>updateProjectTask(text,{...projectTaskDraft(text,'W001'),completedAt:at},'W001'));
});
