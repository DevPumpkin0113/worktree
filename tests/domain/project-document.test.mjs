import { saveProjectComment } from '@worktree/core/comment-editing';
import { deleteProjectTask } from '@worktree/core/task-deletion';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { projectFixture, timestamp } from '../helpers/project-fixture.ts';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource } from '@worktree/core/project-source';
import { readTaskFile, writeTaskFile } from '@worktree/core/task-file';
import { projectTaskDraft, updateProjectTask, nextProjectId } from '@worktree/core/task-editing';
import { describeDocumentErrors, formatDocumentProblem } from '../../apps/desktop/src/domain/document-errors.ts';
import { createIdLabels } from '@worktree/core/id-display';
import { setLanguage } from '../../apps/desktop/src/i18n/messages.ts';
const source = projectFixture();
function changeFile(file, edit) { const value=readSource(source);value.files[file]=edit(value.files[file]);return serializeSource(value); }
test('프로젝트 문서 집합을 읽고 마일스톤 상태와 고정 프리픽스를 적용한다',()=>{
 const model=parseProject(source);assert.equal(model.rows.length,3);assert.equal(model.rows[0].milestone,true);assert.equal(model.rows[0].status,'doing');assert.equal(model.rows[1].description,'입력 확인');assert.equal(model.useEffort,false);
 assert.equal(createIdLabels(model,'hyphen').get('W001'),'W-001');assert.deepEqual(model.rows[2].deps,['W001']);
});
test('제목만으로 작업을 생성하고 프로젝트 번호를 예약하며 다른 파일은 보존한다',()=>{
 const draft=projectTaskDraft(source);draft.name='새 작업';const result=updateProjectTask(source,draft,undefined,timestamp),files=readSource(result.text).files;
 assert.equal(result.id,'W003');assert.equal(parseProject(result.text).rows.at(-1).description,'');assert.equal(JSON.parse(files['project.json']).nextTaskNumber,4);assert.equal(files['tasks/W001.md'],readSource(source).files['tasks/W001.md']);assert.equal(nextProjectId(result.text),'W004');
});
test('여러 줄 설명·라벨·막힘 사유·참조와 생성/수정 시각을 보존한다',()=>{
 const draft=projectTaskDraft(source,'W001');Object.assign(draft,{name:'변경',description:'# 설명\n\n- 항목 | 표\n<script>text</script>',priority:'high',taskType:'bug',labels:'ui, api, ui',blockedReason:'외부 응답 대기\n내일 확인',references:[{type:'text',value:'https://example.com/issue'},{type:'file',value:'docs/spec.md'}]});
 const result=updateProjectTask(source,draft,'W001','2026-10-22T03:00:00.000Z');const row=parseProject(result.text).rows.find(r=>r.id==='W001');assert.equal(row.description,draft.description);assert.deepEqual(row.labels,['ui','api']);assert.equal(row.createdAt,timestamp);assert.equal(row.updatedAt,'2026-10-22T03:00:00.000Z');assert.equal(row.references.length,2);assert.equal(readSource(result.text).files['tasks/W002.md'],readSource(source).files['tasks/W002.md']);
});
test('알 수 없는 메타데이터는 편집할 때 보존하고 미래 수정 시각을 뒤로 돌리지 않는다',()=>{
 const text=changeFile('tasks/W001.md',text=>text.replace('title:', 'externalKey: {"note":"보존"}\ntitle:').replace('updatedAt: "'+timestamp+'"','updatedAt: "2026-10-23T00:00:00.000Z"'));
 const result=updateProjectTask(text,projectTaskDraft(text,'W001'),'W001',timestamp);assert.match(readSource(result.text).files['tasks/W001.md'],/externalKey: \{"note":"보존"\}/);assert.equal(parseProject(result.text).rows[1].updatedAt,'2026-10-23T00:00:00.000Z');
});
test('마일스톤은 별도 번호로 제목·선택 기간만 저장한다',()=>{
 const draft={...projectTaskDraft(source),type:'milestone',name:'출시',start:'2026-11-01',end:'2026-11-05'};const result=updateProjectTask(source,draft,undefined,timestamp);assert.equal(result.id,'MS002');assert.ok(readSource(result.text).files['milestones/MS002.md']);assert.equal(nextProjectId(result.text),'W003');assert.equal(parseProject(result.text).rows.find(r=>r.id==='MS002').status,'todo');
});
test('선행 참조가 있는 작업 삭제는 명시적인 해제 선택을 요구한다',()=>{
 assert.throws(()=>deleteProjectTask(source,'W001',{children:'keep',detachPredecessors:false}));const text=deleteProjectTask(source,'W001',{children:'keep',detachPredecessors:true});assert.deepEqual(parseProject(text).rows.find(r=>r.id==='W002').deps,[]);assert.ok(!readSource(text).files['tasks/W001.md']);
});
test('마일스톤 삭제 시 하위 유지·함께 삭제와 ID 재사용 방지를 처리한다',()=>{
 const keep=deleteProjectTask(source,'MS001',{children:'keep',detachPredecessors:false});assert.ok(parseProject(keep).rows.every(r=>r.parent==='-'));assert.equal(nextProjectId(keep,true),'MS002');const remove=deleteProjectTask(source,'MS001',{children:'delete',detachPredecessors:false});assert.equal(parseProject(remove).rows.length,0);assert.equal(nextProjectId(remove),'W003');
});
test('외부에서 번호가 늘어난 파일도 삭제 후 번호를 재사용하지 않는다',()=>{
 const data=readSource(source);data.files['tasks/W100.md']=data.files['tasks/W001.md'].replace('id: "W001"','id: "W100"');const value=serializeSource(data);assert.equal(nextProjectId(value),'W101');const removed=deleteProjectTask(value,'W100',{children:'keep',detachPredecessors:false});assert.equal(nextProjectId(removed),'W101');
});
for(const [field,value] of [['status','invalid'],['start','2026-02-30'],['effort','0'],['priority','other'],['type','unknown'],['createdAt','invalid'],['updatedAt','2020-01-01T00:00:00.000Z'],['milestone','MS999'],['dependencies',['W999']],['references',[{type:'file',value:'../outside.txt'}]]]) {
 test('잘못된 작업 필드를 원본 파일·행과 함께 거부: '+field,()=>{
  const text=changeFile('tasks/W001.md',text=>{const {metadata,description}=readTaskFile('tasks/W001.md',text);metadata[field]=value;return writeTaskFile(metadata,description);});let caught;try{parseProject(text);}catch(error){caught=error;}assert.ok(caught,field);const [problem]=describeDocumentErrors(caught,text,'C:/project/worktree.json');assert.equal(problem.field,field);assert.match(problem.source,/docs\/worktree\/tasks\/W001\.md$/);assert.ok(problem.lineNumbers.length);assert.ok(formatDocumentProblem(problem).includes(field));
 });
}
test('중복 메타데이터·파일명 불일치·순환·선행 일정 위반을 거부한다',()=>{
 assert.throws(()=>parseProject(changeFile('tasks/W001.md',text=>text.replace('title:', 'id: "W001"\ntitle:'))));
 assert.throws(()=>parseProject(changeFile('tasks/W001.md',text=>text.replace('id: "W001"','id: "W999"'))));
 assert.throws(()=>parseProject(changeFile('tasks/W001.md',text=>text.replace('dependencies: []','dependencies: ["W002"]'))));
 const d=readSource(source);for(const id of ['W001','W002']){const {metadata}=readTaskFile('tasks/'+id+'.md',d.files['tasks/'+id+'.md']);metadata.start='2026-10-21';metadata.end='2026-10-22';d.files['tasks/'+id+'.md']=writeTaskFile(metadata);}assert.throws(()=>parseProject(serializeSource(d)));
});
test('새 규격 오류는 언어 전환 후에도 실제 파일·행·입력값을 유지한다',()=>{
 const text=changeFile('tasks/W001.md',text=>text.replace('status: "doing"','status: "wrong"'));let caught;try{parseProject(text);}catch(e){caught=e;}const [problem]=describeDocumentErrors(caught,text,'C:/p/worktree.json');const location=problem.lineNumbers;setLanguage('en');assert.match(problem.message,/check/);assert.deepEqual(problem.lineNumbers,location);assert.equal(problem.value,'"wrong"');setLanguage('ko');assert.match(problem.message,/확인/);
});
test('레거시 WBS·표 형식은 프로젝트 문서로 읽지 않는다',()=>{assert.throws(()=>parseProject('---\nschema_version: 2\n---\n## 작업 목록'));});
test('프로젝트 자체의 문서 집합이 유효하고 WBS·템플릿 파일은 제거되어 있다',()=>{
 const directory=JSON.parse(fs.readFileSync('worktree.json','utf8')).dataDirectory;const files={'project.json':fs.readFileSync(path.join(directory,'project.json'),'utf8')};for(const folder of ['tasks','milestones'])for(const file of fs.readdirSync(path.join(directory,folder)))files[folder+'/'+file]=fs.readFileSync(path.join(directory,folder,file),'utf8');const model=parseProject(serializeSource({dataDirectory:directory,files}));assert.ok(model.rows.some(row=>!row.milestone));assert.ok(model.rows.some(row=>row.milestone));for(const dir of ['templates','examples','planning'])if(fs.existsSync(dir))assert.ok(fs.readdirSync(dir).every(file=>!file.endsWith('.wbs')));
});


test('작업과 마일스톤 구분자는 표시만 변경하며 원본 ID·파일명·참조는 유지한다',()=>{
 const data=readSource(source), config=JSON.parse(data.files['project.json']);config.idSeparator='hyphen';data.files['project.json']=JSON.stringify(config);
 let text=serializeSource(data);
 const result=updateProjectTask(text,{...projectTaskDraft(text),type:'milestone',name:'마일스톤'},undefined,timestamp);
 assert.equal(result.id,'MS002');text=result.text;
 assert.ok(readSource(text).files['milestones/MS002.md']);
 assert.equal(readTaskFile('milestones/MS002.md',readSource(text).files['milestones/MS002.md']).metadata.id,'MS002');
 const labels=createIdLabels(parseProject(text),'hyphen');
 assert.equal(labels.get('W001'),'W-001');assert.equal(labels.get('MS002'),'MS-002');assert.equal(labels.get('MS001'),'MS-001');
 text=updateProjectTask(text,{...projectTaskDraft(text,'W001'),parent:'MS002'},'W001',timestamp).text;
 text=saveProjectComment(text,'MS002','작성자','마일스톤 댓글',undefined,timestamp);
 assert.equal(parseProject(text).rows.find(row=>row.id==='W001').parent,'MS002');
 assert.equal(parseProject(text).comments[0].taskId,'MS002');
 assert.equal(nextProjectId(text,true),'MS003');
 const changed=readSource(text), settings=JSON.parse(changed.files['project.json']);settings.idSeparator='none';changed.files['project.json']=JSON.stringify(settings);
 const withoutSeparator=serializeSource(changed);
 assert.equal(createIdLabels(parseProject(withoutSeparator),'none').get('MS002'),'MS002');
 assert.equal(readSource(withoutSeparator).files['milestones/MS002.md'],readSource(text).files['milestones/MS002.md']);
 assert.equal(parseProject(withoutSeparator).rows.find(row=>row.id==='W001').parent,'MS002');
 assert.equal(nextProjectId(withoutSeparator,true),'MS003');
});
