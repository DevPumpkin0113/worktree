import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPriorities, validPriorities, movePriority } from '@worktree/core/project-priorities';
import { projectFixture } from '../helpers/project-fixture.ts';
import { projectSettingsDraft, updateProjectSettings } from '@worktree/core/project-settings';
import { projectTaskDraft, updateProjectTask } from '@worktree/core/task-editing';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource } from '@worktree/core/project-source';
test('우선순위는 중복·빈 이름·예약 ID를 거부하고 순서만 바꾼다',()=>{
 const values=defaultPriorities();assert.equal(validPriorities(values),true);
 for(const invalid of [[...values,values[0]],[{id:'-',name:'미지정'}],[{id:'x',name:''}],[{id:'x',name:' 이름 '}],[{id:'a',name:'같음'},{id:'b',name:'같음'}]])assert.equal(validPriorities(invalid),false);
 assert.deepEqual(movePriority(values,0,2).map(p=>p.id),['normal','low','high']);assert.equal(values[0].id,'high');assert.equal(movePriority(values,-1,1),values);
});
test('우선순위 이름·순서 수정과 담당자 목록 제거는 기존 작업 원본을 바꾸지 않는다',()=>{
 const source=projectFixture();const before=readSource(source);
 const priorities=[{id:'high',name:'최우선'},{id:'normal',name:'기본'},{id:'low',name:'나중'}];
 const updated=updateProjectSettings(source,{...projectSettingsDraft(source),priorities,assignees:'새 담당자'});
 assert.deepEqual(parseProject(updated).priorities,priorities);assert.deepEqual(parseProject(updated).assignees,['새 담당자']);
 for(const [file,text] of Object.entries(before.files))if(file!=='project.json')assert.equal(readSource(updated).files[file],text);
 assert.equal(parseProject(updated).rows.find(r=>r.id==='W001').owner,'codex');
 assert.throws(()=>updateProjectSettings(source,{...projectSettingsDraft(source),priorities:priorities.filter(p=>p.id!=='normal')}));
});
test('새 작업은 미지정으로 시작하고 사용자 우선순위를 원본 ID로 저장한다',()=>{
 let source=projectFixture();source=updateProjectSettings(source,{...projectSettingsDraft(source),priorities:[...defaultPriorities(),{id:'custom',name:'긴급 검토'}],assignees:'팀원'});
 const draft=projectTaskDraft(source);assert.equal(draft.priority,'-');
 const added=updateProjectTask(source,{...draft,name:'새 작업',priority:'custom',owner:'팀원'});
 assert.equal(parseProject(added.text).rows.find(r=>r.id===added.id).priority,'custom');
 assert.throws(()=>updateProjectTask(source,{...draft,name:'오류',priority:'missing'}));
 const unassigned=updateProjectTask(source,{...draft,name:'미지정 작업'});assert.equal(parseProject(unassigned.text).rows.find(r=>r.id===unassigned.id).priority,'-');
});
test('프로젝트 규칙은 중복 담당자와 잘못된 우선순위를 저장 경계에서 거부한다',()=>{
 const source=projectFixture();const draft=projectSettingsDraft(source);
 assert.throws(()=>updateProjectSettings(source,{...draft,assignees:'팀원, 팀원'}));
 assert.throws(()=>updateProjectSettings(source,{...draft,priorities:[{id:'normal',name:''}]}));
 const data=readSource(source),config=JSON.parse(data.files['project.json']);config.priorities=[{id:'low',name:'낮음'}];data.files['project.json']=JSON.stringify(config);assert.throws(()=>parseProject(serializeSource(data)));
});
