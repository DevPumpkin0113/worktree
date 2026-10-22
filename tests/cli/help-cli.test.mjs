import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const main=fileURLToPath(new URL('../../apps/cli/dist/main.js',import.meta.url));
function run(args,input){return spawnSync(process.execPath,[main,...args],{encoding:'utf8',input});}
test('command help works without a project and matches help subcommands',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-help-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const missing=path.join(root,'missing');
 for(const args of [['task','add'],['milestone','delete'],['comment','edit'],['project','edit'],['init'],['schema'],['shell']]){
  const direct=run([...args,'--help','--project',missing]);const explicit=run(['help',...args,'--project',missing]);assert.equal(direct.status,0,direct.stderr);assert.equal(direct.stdout,explicit.stdout);assert.match(direct.stdout,new RegExp('worktree '+args.join(' ')));assert.equal(fs.existsSync(missing),false);
 }
 const creation=run(['task','add','--help','--lang','ko']);assert.match(creation.stdout,/제목 필수/);assert.match(creation.stdout,/기본: 프로젝트 유형 목록의 첫 항목/);assert.doesNotMatch(creation.stdout,/--children/);
 const deletion=run(['milestone','delete','--help','--lang','ko']);assert.match(deletion.stdout,/--children keep\|delete/);assert.match(deletion.stdout,/하위 작업이 있으면 필수/);
});
test('help is localized, JSON-compatible and validates unknown topics',()=>{
 const ko=run(['help','task','list','--json','--lang','ko']);assert.equal(ko.status,0,ko.stderr);assert.match(JSON.parse(ko.stdout).help,/선택 필터/);
 const en=run(['task','add','--help','--lang','en']);assert.match(en.stdout,/Required input/);assert.match(en.stdout,/Default: the first project type/);assert.doesNotMatch(en.stdout,/[가-힣]/);
 for(const args of [['help','unknown'],['task','dance','--help'],['help','project','delete'],['help','init','extra']]){const r=run([...args,'--json']);assert.equal(r.status,2,r.stderr);assert.equal(JSON.parse(r.stderr).error.code,'USAGE');}
 for(const group of ['task','milestone','comment','project'])assert.match(run([group,'--help','--lang','ko']).stdout,/하위 명령/);
 assert.equal(run(['task','show','W001','-h']).status,0);
});
test('shell command help uses the same renderer and leaves its session usable',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-help-shell-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const result=run(['shell','--project',root,'--lang','ko'],'help task add\ntask delete --help\nhelp unknown\nhelp project edit\nexit\n');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/제목 필수/);assert.match(result.stdout,/--input FILE.json/);assert.match(result.stderr,/알 수 없는 도움말 주제/);assert.equal(fs.existsSync(path.join(root,'worktree.json')),false);
});
test('English is the default and shell help makes exit discoverable',t=>{
 const english=run(['--help']);assert.equal(english.status,0,english.stderr);assert.match(english.stdout,/Default: en/);assert.doesNotMatch(english.stdout,/[가-힣]/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-shell-exit-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const session=run(['shell','--project',root],'help\nlanguage ko\nhelp\nquit\ninit\n');assert.equal(session.status,0,session.stderr);assert.match(session.stdout,/Type exit or quit to leave/);assert.match(session.stdout,/exit \/ quit  Exit the shell/);assert.match(session.stdout,/exit \/ quit  shell 종료/);assert.equal(fs.existsSync(path.join(root,'worktree.json')),false);
});
test('help includes an executable batch JSON example and revision workflow',()=>{
 const batch=run(['batch','--help']);assert.equal(batch.status,0,batch.stderr);assert.match(batch.stdout,/Example batch.json/);const start=batch.stdout.indexOf('  {\n'),end=batch.stdout.indexOf('\n  }',start);const example=JSON.parse(batch.stdout.slice(start,end+4));assert.equal(example.commands.length,2);assert.deepEqual(example.commands[0],['task','add','--title','First task']);
 assert.match(batch.stdout,/batchCommand/);assert.match(run(['status','--help']).stdout,/entire project state/);assert.match(run(['project','show','--help','--lang','ko']).stdout,/프로젝트 전체/);
});
