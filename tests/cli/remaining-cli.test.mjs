import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const main=fileURLToPath(new URL('../../apps/cli/dist/main.js',import.meta.url));
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-cli-extra-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));ok(root,['init']);return root;}
function run(root,args,input){return spawnSync(process.execPath,[main,...args,'--project',root,'--json'],{encoding:'utf8',input});}
function ok(root,args,input){const r=run(root,args,input);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
function file(root,name,content){const p=path.join(root,name);fs.writeFileSync(p,content);return p;}
function snapshot(root){const files={};for(const folder of ['','tasks','milestones'])for(const name of fs.readdirSync(path.join(root,'docs/worktree',folder))){const p=path.join(root,'docs/worktree',folder,name);if(fs.statSync(p).isFile()&&(name==='project.json'||name.endsWith('.md')))files[(folder?folder+'/':'')+name]=fs.readFileSync(p,'utf8');}return {dataDirectory:'docs/worktree',files};}
test('UTF-8 body files and stdin preserve multiline text and reject competing sources',t=>{
 const root=fixture(t),body='첫 줄 "quote"\n```ts\nconst value = 1;\n```\n';const source=file(root,'body.md','\ufeff'+body);
 ok(root,['task','add','--title','Task','--description-file',source]);assert.equal(ok(root,['task','show','W001']).task.description.trim(),body.trim());
 ok(root,['comment','add','W001','--author','Alice','--text-file','-'],body);assert.equal(ok(root,['comment','list','W001']).comments[0].text.trim(),body.trim());
 ok(root,['task','edit','W001','--input','-'],JSON.stringify({description:'From JSON stdin'}));assert.equal(ok(root,['task','show','W001']).task.description,'From JSON stdin');
 for(const args of [['task','edit','W001','--description','a','--description-file',source],['task','edit','W001','--input','-','--description-file','-'],['comment','edit','W001','#001','--text-file',file(root,'bad.bin',Buffer.from([255]))]]){assert.notEqual(run(root,args).status,0);}
});
test('shell rejects stdin body reads and continues to process later commands',t=>{
 const root=fixture(t);ok(root,['task','add','--title','Task']);const r=spawnSync(process.execPath,[main,'shell','--project',root,'--json'],{encoding:'utf8',input:'comment add W001 --author Alice --text-file -\nstatus\nexit\n'});assert.equal(r.status,0);assert.match(r.stderr,/Standard input requires/);assert.match(r.stdout,/"taskCount": 1/);assert.equal(ok(root,['comment','list','W001']).comments.length,0);
});
test('batch commits once, reports IDs, previews without writing, and rejects partial failure',t=>{
 const root=fixture(t);const commands=[['milestone','add','--title','Goal'],['task','add','--title','First','--milestone','MS001'],['task','add','--title','Second','--deps','W001'],['comment','add','W001','--author','Alice','--text','Review']];const input=file(root,'batch.json',JSON.stringify({commands}));const before=ok(root,['status']).revision;
 assert.equal(ok(root,['batch','--input',input,'--dry-run']).results.length,4);assert.equal(ok(root,['status']).revision,before);
 const saved=ok(root,['batch','--input',input,'--expect',before]);assert.deepEqual(saved.results.slice(0,3).map(r=>r.id),['MS001','W001','W002']);assert.equal(ok(root,['status']).taskCount,2);
 assert.notEqual(run(root,['batch','--input',input,'--expect',before]).status,0);
 const revision=ok(root,['status']).revision;const invalid=JSON.stringify({commands:[['task','add','--title','Must not persist'],['task','edit','W999','--title','Fail']]});assert.notEqual(run(root,['batch','--input','-'],invalid).status,0);assert.equal(ok(root,['status']).revision,revision);
 const removal=file(root,'remove.json',JSON.stringify({commands:[['task','delete','W002']]}));assert.notEqual(run(root,['batch','--input',removal]).status,0);ok(root,['batch','--input',removal,'--yes']);assert.equal(ok(root,['status']).taskCount,1);
});
test('save recovery previews, rolls back interrupted data and preserves external changes',t=>{
 const root=fixture(t);ok(root,['task','add','--title','Before']);const before=snapshot(root),after=structuredClone(before);after.files['tasks/W001.md']=after.files['tasks/W001.md'].replace('Before','After');
 const journal=path.join(root,'docs/worktree/.worktree-transaction.json');fs.writeFileSync(journal,JSON.stringify({before,after}));fs.writeFileSync(path.join(root,'docs/worktree/tasks/W001.md'),after.files['tasks/W001.md']);
 assert.deepEqual(ok(root,['recover','--dry-run']).recovery.pending,['save']);assert.equal(fs.existsSync(journal),true);assert.notEqual(run(root,['recover']).status,0);ok(root,['recover','--yes']);assert.equal(ok(root,['task','show','W001']).task.name,'Before');
 fs.writeFileSync(journal,JSON.stringify({before,after}));fs.writeFileSync(path.join(root,'docs/worktree/tasks/W001.md'),'external edit');assert.notEqual(run(root,['recover','--yes']).status,0);assert.equal(fs.readFileSync(path.join(root,'docs/worktree/tasks/W001.md'),'utf8'),'external edit');assert.equal(fs.existsSync(journal),true);
});
test('reset recovery restores pending moves and completes committed deletion',t=>{
 const root=fixture(t),marker=fs.readFileSync(path.join(root,'worktree.json'),'utf8'),stage='.worktree-reset-data-test123';fs.mkdirSync(path.join(root,stage));fs.renameSync(path.join(root,'docs/worktree'),path.join(root,stage,'data'));fs.rmSync(path.join(root,'worktree.json'));
 const journal=file(root,'.worktree-reset.json',JSON.stringify({state:'pending',directory:'docs/worktree',stage,marker}));assert.deepEqual(ok(root,['recover','--dry-run']).recovery.pending,['reset']);ok(root,['recover','--yes']);assert.equal(ok(root,['status']).taskCount,0);
 fs.mkdirSync(path.join(root,stage));fs.renameSync(path.join(root,'docs/worktree'),path.join(root,stage,'data'));fs.rmSync(path.join(root,'worktree.json'));fs.writeFileSync(journal,JSON.stringify({state:'deleting',directory:'docs/worktree',stage}));const result=ok(root,['recover','--yes']);assert.equal(result.recovery.initialized,false);assert.equal(fs.existsSync(path.join(root,stage)),false);assert.equal(fs.existsSync(path.join(root,'docs')),true);
});
test('CLI errors localize before parsing and keep stable machine codes',t=>{
 const root=fixture(t);for(const args of [['--unknown'],['help','missing'],['task','show','W999']]){
  const ko=JSON.parse(run(root,[...args,'--lang','ko']).stderr).error,en=JSON.parse(run(root,[...args,'--lang','en']).stderr).error;assert.equal(ko.code,en.code);assert.match(ko.message,/[가-힣]/);assert.doesNotMatch(en.message,/[가-힣]/);
 }
 const missing=JSON.parse(run(root,['project','edit','--input','missing-file.json','--lang','ko']).stderr).error;assert.equal(missing.code,'ENOENT');assert.match(missing.message,/찾을 수 없습니다/);assert.ok(missing.cause);
 const invalid=file(root,'invalid.json','{');const json=JSON.parse(run(root,['project','edit','--input',invalid,'--lang','ko']).stderr).error;assert.equal(json.code,'USAGE');assert.match(json.message,/JSON/);
});
test('batch rejects unsafe command overrides and oversized input without writing',t=>{
 const root=fixture(t),before=ok(root,['status']).revision;
 for(const commands of [[],Array.from({length:101},()=>['task','add','--title','Too many']),[['init']],[['task','add','--title','No','--project','elsewhere']],[['task','add','--title','No','--text-file','-']]]){
  const source=file(root,'invalid-batch.json',JSON.stringify({commands}));assert.notEqual(run(root,['batch','--input',source]).status,0);assert.equal(ok(root,['status']).revision,before);
 }
 const invalid=JSON.stringify({commands:[['task','add','--title','Temporary'],['task','edit','W999','--title','Missing']]});const error=JSON.parse(run(root,['batch','--input','-'],invalid).stderr).error;assert.equal(error.batchIndex,1);assert.equal(error.code,'TASK_NOT_FOUND');
 const huge=file(root,'huge.md','x'.repeat(16*1024*1024+1));assert.equal(JSON.parse(run(root,['task','add','--title','Huge','--description-file',huge]).stderr).error.code,'LIMIT');assert.equal(ok(root,['status']).revision,before);
});
test('malformed recovery journals are preserved and no-journal recovery is harmless',t=>{
 const root=fixture(t),before=ok(root,['status']).revision;assert.deepEqual(ok(root,['recover','--yes']).recovery.pending,[]);assert.equal(ok(root,['status']).revision,before);
 const journal=file(root,'.worktree-reset.json','broken');assert.notEqual(run(root,['recover','--yes']).status,0);assert.equal(fs.readFileSync(journal,'utf8'),'broken');
});
test('all batch item failures include position and preserve the project',t=>{
 const root=fixture(t),before=ok(root,['status']).revision;
 for(const item of [42,['task','edit','W001','--status','invalid'],['task','add','--title','No','--project','outside'],['status'],['task','edit','W999','--title','Missing']]){
  const input=JSON.stringify({commands:[['task','add','--title','Temporary'],item]});const result=run(root,['batch','--input','-'],input);assert.notEqual(result.status,0);const error=JSON.parse(result.stderr).error;assert.equal(error.batchIndex,1);assert.equal(error.batchCommand,2);assert.equal(ok(root,['status']).revision,before);
 }
 const input=file(root,'position.json',JSON.stringify({commands:[['task','add','--title','Temporary'],['task','add','--status','invalid']]}));
 const text=spawnSync(process.execPath,[main,'batch','--input',input,'--project',root],{encoding:'utf8'});assert.match(text.stderr,/Batch command #2/);
});
test('shell JSON session commands and transitions only emit JSON responses',t=>{
 const root=fixture(t),other=fixture(t);const input=['author Alice','language ko',`use "${other}"`,'format table','format json','quit'].join('\n');
 const result=spawnSync(process.execPath,[main,'shell','--project',root,'--json'],{encoding:'utf8',input});assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');const replies=result.stdout.trim().split(/\r?\n/).map(line=>JSON.parse(line));assert.deepEqual(replies.map(r=>r.command),['author','language','use','format','format','quit']);assert.ok(replies.every(r=>r.ok===true));assert.equal(replies[2].value,other);
});
