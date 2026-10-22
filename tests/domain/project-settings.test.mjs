import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture } from '../helpers/project-fixture.ts';
import { readSource, serializeSource, projectConfig } from '@worktree/core/project-source';
import { parseProject } from '@worktree/core/project-document';
import { projectSettingsDraft, updateProjectSettings } from '@worktree/core/project-settings';
const source=projectFixture();
test('프로젝트 설정은 허용된 필드만 저장하고 작업 파일·번호·프리픽스를 보존한다',()=>{
 const data=readSource(source);const original=JSON.parse(data.files['project.json']);original.extraKey={note:'preserve'};data.files['project.json']=JSON.stringify(original);const text=serializeSource(data);
 const draft={...projectSettingsDraft(text),name:'  새 이름  ',useEffort:true,taskTypes:'feature, bug, improvement, task, 운영',labels:'ui, api',taskPrefix:'DEV',nextTaskNumber:999};
 const updated=readSource(updateProjectSettings(text,draft));const config=projectConfig(updated);assert.equal(config.name,'새 이름');assert.equal(config.useEffort,true);assert.ok(config.taskTypes.includes('운영'));assert.deepEqual(config.labels,['ui','api']);assert.equal(config.taskPrefix,'W');assert.equal(config.nextTaskNumber,3);assert.deepEqual(JSON.parse(updated.files['project.json']).extraKey,{note:'preserve'});assert.equal(updated.dataDirectory,data.dataDirectory);
 for(const [file,content] of Object.entries(data.files))if(file!=='project.json')assert.equal(updated.files[file],content);
});
test('사용 중인 유형은 제거를 막고 사용하지 않는 유형은 제거한다',()=>{
 assert.throws(()=>updateProjectSettings(source,{...projectSettingsDraft(source),taskTypes:'bug'}),/feature/);
 const model=parseProject(updateProjectSettings(source,{...projectSettingsDraft(source),taskTypes:'feature'}));assert.deepEqual(model.taskTypes,['feature']);assert.ok(model.rows.some(row=>row.taskType==='feature'));
});
test('공통 라벨 제거는 작업에 기록된 라벨을 삭제하지 않는다',()=>{
 const data=readSource(source);data.files['tasks/W001.md']=data.files['tasks/W001.md'].replace('labels: []','labels: ["ui"]');const text=serializeSource(data);
 const updated=updateProjectSettings(text,{...projectSettingsDraft(text),labels:''});assert.deepEqual(projectConfig(readSource(updated)).labels,[]);assert.deepEqual(parseProject(updated).rows.find(r=>r.id==='W001').labels,['ui']);
});
for(const change of [{name:''},{name:'x\ny'},{name:'x'.repeat(201)},{taskTypes:''},{taskTypes:'feature, feature'},{labels:'ui, ui'},{taskTypes:'feature, bad\nvalue'}]) {
 test('프로젝트 설정의 잘못된 입력을 저장 전에 거부: '+JSON.stringify(change),()=>assert.throws(()=>updateProjectSettings(source,{...projectSettingsDraft(source),...change})));
}


test('프로젝트 ID 구분자는 기본값과 선택 값을 읽고 원본 ID와 선행 참조를 보존한다', () => {
 const original=parseProject(source);
 assert.equal(original.idSeparator,'none');
 const changed=updateProjectSettings(source,{...projectSettingsDraft(source),idSeparator:'hyphen'});
 const model=parseProject(changed);
 assert.equal(model.idSeparator,'hyphen');
 assert.deepEqual(model.rows.map(row=>[row.id,row.deps]),original.rows.map(row=>[row.id,row.deps]));
 assert.throws(()=>updateProjectSettings(source,{...projectSettingsDraft(source),idSeparator:'bad'}));
 const data=readSource(source);const config=JSON.parse(data.files['project.json']);config.idSeparator='bad';data.files['project.json']=JSON.stringify(config);
 assert.throws(()=>parseProject(serializeSource(data)));
});


test('프로젝트 날짜·시간 표시 규칙은 기본값·저장·잘못된 값 거부를 제공한다', () => {
 const baseline=projectSettingsDraft(source);assert.equal(baseline.dateFormat,'yyyy-MM-dd');assert.equal(baseline.timeFormat,'24h');
 const updated=updateProjectSettings(source,{...baseline,dateFormat:'dd/MM/yyyy',timeFormat:'12h'});assert.equal(parseProject(updated).dateFormat,'dd/MM/yyyy');assert.equal(parseProject(updated).timeFormat,'12h');
 for (const change of [{dateFormat:'bad'},{timeFormat:'bad'}]) assert.throws(()=>updateProjectSettings(source,{...baseline,...change}));
});
