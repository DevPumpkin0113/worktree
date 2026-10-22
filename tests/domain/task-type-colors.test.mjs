import { DEFAULT_TASK_TYPES, defaultTaskTypeColors } from '../../src/domain/default-task-types.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validTaskTypeColors, taskTypeColor } from '../../src/domain/task-type-colors.ts';
import { projectSettingsDraft, updateProjectSettings } from '../../src/domain/project-settings.ts';
import { projectFixture } from '../helpers/project-fixture.ts';
import { readSource, serializeSource } from '../../src/domain/project-source.ts';
import { parseProject } from '../../src/domain/project-document.ts';
test('작업 유형 색상은 정의된 유형과 6자리 HEX만 허용한다',()=>{
 assert.equal(validTaskTypeColors({feature:'#AAbb00'},['feature']),true);
 for(const value of [null,[],{feature:'red'},{feature:'#fff'},{feature:'#ff00ff00'},{feature:'var(--color-primary)'},{outside:'#112233'}]) assert.equal(validTaskTypeColors(value,['feature']),false);
 assert.equal(taskTypeColor({},'constructor'),undefined);
 assert.equal(taskTypeColor({feature:'#aabb00'},'feature'),'#aabb00');
});
test('유형 색상 저장은 작업 파일·ID를 보존하고 제거된 유형의 색상만 정리한다',()=>{
 const source=projectFixture();const before=readSource(source);
 const updated=updateProjectSettings(source,{...projectSettingsDraft(source),taskTypeColors:{feature:'#123456',bug:'#abcdef'}});
 assert.deepEqual(parseProject(updated).taskTypeColors,{feature:'#123456',bug:'#abcdef'});
 for(const [file,text] of Object.entries(before.files))if(file!=='project.json')assert.equal(readSource(updated).files[file],text);
 const removed=updateProjectSettings(updated,{...projectSettingsDraft(updated),taskTypes:'feature, improvement, task'});
 assert.deepEqual(parseProject(removed).taskTypeColors,{feature:'#123456'});
 assert.throws(()=>updateProjectSettings(source,{...projectSettingsDraft(source),taskTypeColors:{feature:'red'}}));
 const data=readSource(source);const config=JSON.parse(data.files['project.json']);config.taskTypeColors={outside:'#123456'};data.files['project.json']=JSON.stringify(config);assert.throws(()=>parseProject(serializeSource(data)));
});

test('기본 유형 7종과 팔레트가 일치하고 사용자 색상이 기본색보다 우선한다',()=>{
 assert.deepEqual([...DEFAULT_TASK_TYPES],['feature','bug','improvement','task','docs','spike','chore']);
 assert.deepEqual(Object.keys(defaultTaskTypeColors()),[...DEFAULT_TASK_TYPES]);
 assert.equal(taskTypeColor(undefined,'feature'),'#a2eeef');
 assert.equal(taskTypeColor({feature:'#010203'},'feature'),'#010203');
 assert.equal(taskTypeColor({},'custom'),undefined);
 assert.equal(validTaskTypeColors(defaultTaskTypeColors(),[...DEFAULT_TASK_TYPES]),true);
});
