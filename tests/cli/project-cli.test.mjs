import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const main=fileURLToPath(new URL('../../apps/cli/dist/main.js',import.meta.url));
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-settings-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));ok(root,'init');return root;}
function call(root,...args){return spawnSync(process.execPath,[main,...args,'--project',root,'--json'],{encoding:'utf8'});}
function ok(root,...args){const r=call(root,...args);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
function input(root,value){const file=path.join(root,'input.json');fs.writeFileSync(file,JSON.stringify(value));return file;}
test('project edit preserves fixed fields, previews changes and checks revisions',t=>{
 const root=fixture(t),before=ok(root,'project','show'),file=input(root,{name:'Changed',assignees:['Alice'],labels:['api'],useEffort:true});
 const preview=ok(root,'project','edit','--input',file,'--dry-run');assert.deepEqual(preview.changedFiles,['project.json']);assert.equal(ok(root,'status').revision,before.revision);
 ok(root,'project','edit','--input',file,'--expect',before.revision);const after=ok(root,'project','show');assert.equal(after.config.name,'Changed');assert.equal(after.config.taskPrefix,before.config.taskPrefix);assert.deepEqual(after.config.assignees,['Alice']);assert.equal(after.config.useEffort,true);
 const conflict=call(root,'project','edit','--input',file,'--expect',before.revision);assert.equal(JSON.parse(conflict.stderr).error.code,'CONFLICT');
});
test('project edit rejects unknown fields, invalid types and removing used rules',t=>{
 const root=fixture(t);ok(root,'task','add','--title','Existing','--type','feature');const before=ok(root,'status').revision;
 for(const patch of [{taskPrefix:'OTHER'},{useEffort:'yes'},{assignees:'Alice'},{taskTypes:['task'],taskTypeColors:{}},{priorities:[{id:'wrong',name:'Wrong'}]}]){
  if(patch.priorities)ok(root,'task','edit','W001','--priority',ok(root,'schema').schema.project.priorities[0].id);
  const revision=ok(root,'status').revision;assert.notEqual(call(root,'project','edit','--input',input(root,patch)).status,0);assert.equal(ok(root,'status').revision,revision);
 }
 assert.notEqual(ok(root,'status').revision,before);
});
test('list combines search and project-specific filters without writing',t=>{
 const root=fixture(t);ok(root,'milestone','add','--title','Goal');const priority=ok(root,'schema').schema.project.priorities[0].id;
 ok(root,'task','add','--title','API Search','--type','feature','--labels','api','--priority',priority,'--milestone','MS001');ok(root,'task','add','--title','Other');
 const before=ok(root,'status').revision;
 assert.deepEqual(ok(root,'task','list','--search','search','--type','feature','--label','api','--priority',priority,'--milestone','MS001').tasks.map(t=>t.id),['W001']);
 assert.equal(ok(root,'task','list','--search','W002','--milestone','-').tasks.length,1);assert.equal(ok(root,'task','list','--label','missing').tasks.length,0);assert.equal(ok(root,'status').revision,before);
});
test('schema exposes current allowed values and shell supports project commands',t=>{
 const root=fixture(t);ok(root,'project','edit','--input',input(root,{assignees:['Alice'],labels:['api']}));const schema=ok(root,'schema');
 assert.deepEqual(schema.schema.task.owner.suggestions,['Alice']);assert.deepEqual(schema.schema.task.labels.suggestions,['api']);assert.ok(schema.schema.project.readOnly.includes('taskPrefix'));
 assert.equal(schema.schema.task.title.required,true);assert.equal(schema.schema.task.description.required,false);
 const result=spawnSync(process.execPath,[main,'shell','--project',root,'--json'],{encoding:'utf8',input:'project show\nschema\nexit\n'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/"schema"/);assert.match(result.stdout,/"config"/);
});
