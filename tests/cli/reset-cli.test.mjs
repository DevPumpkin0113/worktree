import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArguments} from '../../apps/cli/src/arguments.ts';
import {resetWizard,wantsResetWizard} from '../../apps/cli/src/reset-wizard.ts';
import {execute} from '../../apps/cli/src/commands.ts';
const main=fileURLToPath(new URL('../../apps/cli/dist/main.js',import.meta.url));
function run(root,args){return spawnSync(process.execPath,[main,...args,'--project',root,'--json'],{encoding:'utf8'});}
function ok(root,args){const result=run(root,args);assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-reset-cli-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));ok(root,['init','--name','Reset example','--directory','docs/planning','--prefix','OBS']);ok(root,['milestone','add','--title','Goal']);ok(root,['task','add','--title','Task','--milestone','MS001']);ok(root,['comment','add','OBS001','--author','Test','--text','Note']);fs.writeFileSync(path.join(root,'source.txt'),'keep');fs.writeFileSync(path.join(root,'docs','keep.md'),'keep');fs.mkdirSync(path.join(root,'docs/planning/extra'));fs.writeFileSync(path.join(root,'docs/planning/extra/unknown.txt'),'remove');return root;}
const resetArgs=['project','reset','--confirm-name','Reset example','--yes'];

test('reset preview is read-only; exact name and yes are both required',t=>{
 const root=fixture(t),before=ok(root,['status']).revision,marker=fs.readFileSync(path.join(root,'worktree.json'),'utf8');
 const preview=ok(root,['project','reset','--dry-run']);assert.equal(preview.reset,false);assert.equal(preview.initialized,true);assert.equal(preview.taskCount,1);assert.equal(preview.milestoneCount,1);assert.equal(preview.commentCount,1);assert.equal(preview.deletedPaths[0],path.join(root,'docs/planning'));
 for(const args of [['project','reset'],['project','reset','--yes'],['project','reset','--confirm-name','Reset example'],['project','reset','--yes','--confirm-name','wrong']]){const result=run(root,args);assert.notEqual(result.status,0);assert.equal(JSON.parse(result.stderr).error.code,'CONFIRMATION_REQUIRED');}
 assert.equal(ok(root,['status']).revision,before);assert.equal(fs.readFileSync(path.join(root,'worktree.json'),'utf8'),marker);assert.equal(fs.existsSync(path.join(root,'.worktree-reset.json')),false);
});

test('reset removes the whole custom data folder, keeps outside files and permits fresh settings',t=>{
 const root=fixture(t);const result=ok(root,[...resetArgs,'--expect',ok(root,['status']).revision]);assert.equal(result.reset,true);assert.equal(result.initialized,false);assert.equal(fs.existsSync(path.join(root,'docs/planning')),false);assert.equal(fs.existsSync(path.join(root,'worktree.json')),false);assert.equal(fs.readFileSync(path.join(root,'source.txt'),'utf8'),'keep');assert.equal(fs.readFileSync(path.join(root,'docs/keep.md'),'utf8'),'keep');assert.deepEqual(fs.readdirSync(root).filter(n=>n.startsWith('.worktree-reset')),[]);
 ok(root,['init','--name','New project','--prefix','NEW']);const status=ok(root,['status']);assert.equal(status.taskCount,0);assert.equal(status.comments,0);assert.equal(ok(root,['task','add','--title','New']).id,'NEW001');assert.equal(ok(root,['validate']).valid,true);
});

test('stale reset revisions preserve newer tasks',t=>{
 const root=fixture(t),before=ok(root,['status']).revision;ok(root,['task','add','--title','External change']);const result=run(root,[...resetArgs,'--expect',before]);assert.equal(JSON.parse(result.stderr).error.code,'CONFLICT');assert.equal(ok(root,['status']).taskCount,2);
});

test('preview and reset reject readonly unknown data files before any deletion',t=>{
 const root=fixture(t),file=path.join(root,'docs/planning/extra/unknown.txt');fs.chmodSync(file,0o444);try{for(const args of [['project','reset','--dry-run'],resetArgs])assert.notEqual(run(root,args).status,0);assert.equal(fs.existsSync(path.join(root,'worktree.json')),true);assert.equal(fs.existsSync(path.join(root,'.worktree-reset.json')),false);}finally{fs.chmodSync(file,0o666);}
});

test('reset wizard cancels wrong names and freezes the preview revision',async t=>{
 const root=fixture(t);for(const answer of [undefined,'','wrong']){const options=parseArguments(['project','reset','--project',root],root);assert.equal(await resetWizard(options,async()=>answer,()=>{}),false);assert.equal(fs.existsSync(path.join(root,'worktree.json')),true);}
 const options=parseArguments(['project','reset','--project',root],root);assert.equal(await resetWizard(options,async(_label,initial)=>{assert.equal(initial,'');ok(root,['task','add','--title','Concurrent change']);return 'Reset example';},()=>{}),true);assert.throws(()=>execute(options),error=>error.code==='CONFLICT');assert.equal(ok(root,['status']).taskCount,2);
 assert.equal(wantsResetWizard(parseArguments(['project','reset'],root),true),true);assert.equal(wantsResetWizard(parseArguments(['project','reset','--json'],root),true),false);assert.equal(wantsResetWizard(parseArguments(['project','reset','--dry-run'],root),true),false);
});

test('shell can reset and init again without exiting',t=>{
 const root=fixture(t);const result=spawnSync(process.execPath,[main,'shell','--project',root,'--json'],{encoding:'utf8',input:'project reset --confirm-name "Reset example" --yes\ninit --name "Again" --prefix NEW --yes\nstatus\nexit\n'});assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.match(result.stdout,/"reset": true/);assert.equal(ok(root,['status']).project,'Again');assert.equal(ok(root,['status']).taskCount,0);
});

test('reset help is available without a project and explains destructive scope',()=>{
 for(const lang of ['ko','en']){const result=spawnSync(process.execPath,[main,'project','reset','--help','--lang',lang],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/--confirm-name/);assert.match(result.stdout,/worktree init/);}
 assert.throws(()=>parseArguments(['batch','--confirm-name','No'],'.'));
});


test('reset rejects unknown nested junctions without following or deleting their targets',t=>{
 const root=fixture(t),outside=path.join(root,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep.txt'),'safe');const link=path.join(root,'docs/planning/extra/link');fs.symlinkSync(outside,link,'junction');
 for(const args of [['project','reset','--dry-run'],resetArgs])assert.notEqual(run(root,args).status,0);
 assert.equal(fs.readFileSync(path.join(outside,'keep.txt'),'utf8'),'safe');assert.equal(fs.existsSync(path.join(root,'worktree.json')),true);assert.equal(fs.existsSync(path.join(root,'.worktree-reset.json')),false);
});
