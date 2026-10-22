import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repository=fileURLToPath(new URL('../../',import.meta.url)),main=path.join(repository,'apps/cli/dist/main.js');
function location(t){const parent=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-cli-init-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));return path.join(parent,'new-project');}
function cli(root,args,input){return spawnSync(process.execPath,[main,...args,'--project',root],{cwd:repository,encoding:'utf8',input});}
function ok(root,...args){const result=cli(root,[...args,'--json']);assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}

test('없는 폴더를 초기화하고 데스크톱 없이 첫 작업·마일스톤·댓글을 생성한다',t=>{
 const root=location(t);const init=ok(root,'init','--name','CLI 테스트','--prefix','task','--directory','plans/worktree','--id-separator','hyphen');assert.equal(init.prefix,'TASK');assert.equal(init.initialized,true);
 assert.equal(ok(root,'status').taskCount,0);assert.equal(ok(root,'milestone','add','--title','첫 목표').id,'MS001');assert.equal(ok(root,'task','add','--title','첫 작업','--milestone','MS001').id,'TASK001');
 ok(root,'comment','add','TASK001','--text','처음부터 CLI로 작성','--author','박대호');assert.equal(ok(root,'validate').valid,true);assert.equal(ok(root,'status').comments,1);
 const config=JSON.parse(fs.readFileSync(path.join(root,'plans/worktree/project.json'),'utf8'));assert.equal(config.idSeparator,'hyphen');assert.deepEqual(config.priorities.map(p=>p.name),['High','Medium','Low']);
});
test('빈 폴더의 일반 파일은 보존하고 두 번째 초기화는 거부한다',t=>{
 const root=location(t);fs.mkdirSync(root);fs.writeFileSync(path.join(root,'keep.txt'),'keep');ok(root,'init');const before=fs.readFileSync(path.join(root,'docs/worktree/project.json'),'utf8');
 const second=cli(root,['init','--name','덮어쓰기','--json']);assert.equal(second.status,1);assert.equal(JSON.parse(second.stderr).error.code,'ALREADY_INITIALIZED');assert.equal(fs.readFileSync(path.join(root,'keep.txt'),'utf8'),'keep');assert.equal(fs.readFileSync(path.join(root,'docs/worktree/project.json'),'utf8'),before);
});
test('init dry-run·잘못된 접두어·경로·설정은 폴더를 생성하지 않는다',t=>{
 const root=location(t);assert.equal(ok(root,'init','--dry-run').dryRun,true);assert.equal(fs.existsSync(root),false);
 for(const args of [['--prefix','MS'],['--directory','../outside'],['--time-format','wrong'],['--use-effort','maybe']]){const result=cli(root,['init',...args,'--json']);assert.notEqual(result.status,0);assert.equal(fs.existsSync(root),false);}
});
test('기존 데이터와 미완료 초기화 기록을 덮어쓰지 않는다',t=>{
 const root=location(t);fs.mkdirSync(path.join(root,'docs/worktree'),{recursive:true});fs.writeFileSync(path.join(root,'docs/worktree/keep.txt'),'keep');const existing=cli(root,['init','--json']);assert.equal(JSON.parse(existing.stderr).error.code,'TARGET_EXISTS');assert.equal(fs.existsSync(path.join(root,'worktree.json')),false);
 const resetRoot=location(t);fs.mkdirSync(resetRoot);fs.writeFileSync(path.join(resetRoot,'.worktree-reset.json'),'pending');const pending=cli(resetRoot,['init','--json']);assert.equal(JSON.parse(pending.stderr).error.code,'RECOVERY_REQUIRED');assert.equal(fs.readFileSync(path.join(resetRoot,'.worktree-reset.json'),'utf8'),'pending');
});
test('새 폴더 세션에서 init 후 작업 생성·조회까지 이어서 실행한다',t=>{
 const root=location(t);const input=['status','init --name "빈 폴더 세션" --prefix TASK','task add --title "첫 작업"','format json','task show TASK001','exit'].join('\n');
 const result=cli(root,['shell'],input);assert.equal(result.status,0,result.stderr);assert.match(result.stderr,/NOT_INITIALIZED/);assert.match(result.stdout,/INITIALIZED 빈 폴더 세션/);assert.match(result.stdout,/"name": "첫 작업"/);assert.equal(ok(root,'status').taskCount,1);
});
test('깨진 기존 프로젝트는 초기화되지 않은 폴더로 취급하지 않는다',t=>{
 const root=location(t);fs.mkdirSync(root);fs.writeFileSync(path.join(root,'worktree.json'),'broken');const shell=cli(root,['shell'],'init\nexit\n');assert.equal(shell.status,1);assert.equal(fs.readFileSync(path.join(root,'worktree.json'),'utf8'),'broken');
});
