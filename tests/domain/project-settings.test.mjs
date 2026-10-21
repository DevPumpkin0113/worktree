import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture } from '../helpers/project-fixture.ts';
import { readSource, serializeSource, projectConfig } from '../../src/domain/project-source.ts';
import { parseProject } from '../../src/domain/project-document.ts';
import { projectSettingsDraft, updateProjectSettings } from '../../src/domain/project-settings.ts';
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
