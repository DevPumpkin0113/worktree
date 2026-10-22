import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PassThrough} from 'node:stream';
import readline from 'node:readline';
import {initWizard,wantsInitWizard} from '../../apps/cli/src/init-wizard.ts';
import {readlineAsk} from '../../apps/cli/src/init-prompts.ts';
import {initializeProject} from '../../apps/cli/src/init-command.ts';
import {parseArguments} from '../../apps/cli/src/arguments.ts';
import {setLanguage} from '@worktree/core/i18n/messages';
function fixture(t){const parent=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-wizard-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));return path.join(parent,'new-project');}
function answers(root,values){return async(label,initial)=>{assert.equal(fs.existsSync(path.join(root,'worktree.json')),false);const next=values.shift();return next===''?initial:next;};}
test('wizard defaults are previewed and written only after final confirmation',async t=>{
 setLanguage('en');const root=fixture(t),options=parseArguments(['init','--project',root],root),output=[];
 assert.equal(await initWizard(options,answers(root,['','','','1','1']),s=>output.push(s)),true);assert.equal(fs.existsSync(root),false);initializeProject(options);const config=JSON.parse(fs.readFileSync(path.join(root,'docs/worktree/project.json'),'utf8'));assert.equal(config.taskPrefix,'W');assert.equal(config.name,'new-project');assert.ok(output.join('\n').includes('Review'));
});
test('wizard retries invalid entries and supports custom rules',async t=>{
 setLanguage('en');const root=fixture(t),options=parseArguments(['init','--project',root],root),output=[];
 const values=['Demo','../outside','docs/worktree','MS','demo','9','2','2','2','3','2','2','Alice, Bob','frontend, api','feature, task','Critical, Normal, Low, Trivial','1'];
 assert.equal(await initWizard(options,answers(root,values),s=>output.push(s)),true);assert.equal(values.length,0);initializeProject(options);const config=JSON.parse(fs.readFileSync(path.join(root,'docs/worktree/project.json'),'utf8'));assert.equal(config.taskPrefix,'DEMO');assert.equal(config.dateFormat,'dd/MM/yyyy');assert.equal(config.timeFormat,'12h');assert.equal(config.idSeparator,'hyphen');assert.equal(config.useEffort,true);assert.deepEqual(config.assignees,['Alice','Bob']);assert.equal(config.priorities.length,4);assert.ok(output.join('\n').includes('Enter a number'));
});
test('wizard cancellation or final rejection leaves no files',async t=>{
 for(const values of [[undefined],['','','','1','2']]){const root=fixture(t),options=parseArguments(['init','--project',root],root);assert.equal(await initWizard(options,answers(root,values),()=>{}),false);assert.equal(fs.existsSync(root),false);}
});
test('automation and nonterminal init never start the wizard',()=>{
 const base=parseArguments(['init'],'.');assert.equal(wantsInitWizard(base,true),true);for(const args of [['init','--yes'],['init','--no-interactive'],['init','--json'],['init','--input','file.json'],['status']])assert.equal(wantsInitWizard(parseArguments(args,'.'),true),false);assert.equal(wantsInitWizard(base,false),false);assert.throws(()=>parseArguments(['status','--no-interactive'],'.'));
});
test('readline question cancellation cleans listeners and next question still works',async()=>{
 const source=new PassThrough(),output=new PassThrough();const input=readline.createInterface({input:source,output,terminal:false});const ask=readlineAsk(input);const cancelled=ask('Name','Default');input.emit('SIGINT');assert.equal(await cancelled,undefined);assert.equal(input.listenerCount('SIGINT'),0);const next=ask('Name','Default');source.write('Next\n');assert.equal(await next,'Next');input.close();
});
