import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {saveProjectComment} from '@worktree/core/comment-editing';
import {projectFixture} from '../helpers/project-fixture.ts';
const main=fileURLToPath(new URL('../../apps/cli/src/main.ts',import.meta.url));
function run(root,...args){return spawnSync(process.execPath,['--import','tsx',main,...args],{cwd:root,encoding:'utf8',env:{...process.env,NODE_OPTIONS:''}});}
// Keep cwd at the repository so the test loader resolves; --project selects the isolated data.
const repository=fileURLToPath(new URL('../../',import.meta.url));
function cli(root,...args){return run(repository,...args,'--project',root);}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-cli-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=JSON.parse(saveProjectComment(projectFixture(),'W001','박대호','CLI 조회 예시'));
 fs.writeFileSync(path.join(root,'worktree.json'),JSON.stringify({dataDirectory:source.dataDirectory}));
 for(const [key,value] of Object.entries(source.files)){const file=path.join(root,source.dataDirectory,key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
 return root;
}
function digest(root){
 const hash=createHash('sha256');
 function visit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else hash.update(path.relative(root,file)).update(fs.readFileSync(file));}}
 visit(root);return hash.digest('hex');
}
test('CLI 요약·필터·상세·검증은 JSON을 반환하고 파일을 변경하지 않는다',t=>{
 const root=fixture(t),before=digest(root);
 const status=cli(root,'status','--json');assert.equal(status.status,0,status.stderr);const summary=JSON.parse(status.stdout);assert.equal(summary.taskCount,2);assert.equal(summary.milestoneCount,1);assert.equal(summary.completedTasks,1);assert.equal(summary.comments,1);
 const list=cli(root,'task','list','--status','done','--owner','박대호','--json');assert.equal(list.status,0,list.stderr);assert.deepEqual(JSON.parse(list.stdout).tasks.map(t=>t.id),['W002']);
 const show=cli(root,'task','show','W001','--json');assert.equal(show.status,0,show.stderr);assert.deepEqual(JSON.parse(show.stdout).successors,['W002']);assert.equal(JSON.parse(show.stdout).comments[0].text,'CLI 조회 예시');
 const valid=cli(path.join(root,'worktree.json'),'validate','--json');assert.equal(valid.status,0,valid.stderr);assert.equal(JSON.parse(valid.stdout).valid,true);assert.equal(before,digest(root));
});
test('CLI 한국어·영어 일반 출력과 빈 검색 결과',t=>{
 const root=fixture(t);
 assert.match(cli(root,'status','--lang','ko').stdout,/작업: 1\/2/);
 assert.match(cli(root,'status','--lang','en').stdout,/Tasks: 1\/2/);
 assert.match(cli(root,'task','list','--owner','없음','--lang','ko').stdout,/일치하는 작업이 없습니다/);
});
test('CLI 도움말·버전은 프로젝트 없이 실행하고 잘못된 명령은 종료 코드 2',()=>{
 assert.equal(run(repository,'--help').status,0);
 assert.match(run(repository,'--version').stdout,/Worktree CLI/);
 for(const args of [['task','dance'],['status','--unknown'],['task','list','--status','wrong'],['status','--owner','name'],['status','--project'],['status','--json','--json']]){
  const result=run(repository,...args,'--json');assert.equal(result.status,2,result.stderr);assert.equal(result.stdout,'');assert.equal(JSON.parse(result.stderr).error.code,'USAGE');
 }
});
test('CLI 문서 오류는 파일·필드·행을 구조화하고 없는 작업은 코드 1',t=>{
 const root=fixture(t);const missing=cli(root,'task','show','W999','--json');assert.equal(missing.status,1);assert.equal(JSON.parse(missing.stderr).error.code,'TASK_NOT_FOUND');
 const file=path.join(root,'docs/worktree/tasks/W001.md');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('status: "doing"','status: "wrong"'));
 const invalid=cli(root,'validate','--json');assert.equal(invalid.status,1);assert.equal(invalid.stdout,'');const {error}=JSON.parse(invalid.stderr);assert.equal(error.code,'INVALID_DOCUMENT');assert.equal(error.file,'tasks/W001.md');assert.equal(error.field,'status');assert.ok(error.line>0);
});
test('CLI는 외부 경로를 거부하고 미완료 저장 기록을 복구·삭제하지 않는다',t=>{
 const root=fixture(t),marker=path.join(root,'worktree.json');
 fs.writeFileSync(marker,JSON.stringify({dataDirectory:'../outside'}));assert.equal(JSON.parse(cli(root,'validate','--json').stderr).error.code,'UNSAFE_PATH');
 fs.writeFileSync(marker,JSON.stringify({dataDirectory:'docs/worktree'}));
 for(const journal of [path.join(root,'.worktree-reset.json'),path.join(root,'docs/worktree/.worktree-transaction.json')]){
  fs.writeFileSync(journal,'pending');const result=cli(root,'validate','--json');assert.equal(result.status,1);assert.equal(JSON.parse(result.stderr).error.code,'RECOVERY_REQUIRED');assert.equal(fs.readFileSync(journal,'utf8'),'pending');fs.unlinkSync(journal);
 }
});
test('CLI는 junction 데이터 폴더를 따라가지 않는다',t=>{
 const root=fixture(t),link=path.join(root,'linked');fs.symlinkSync(path.join(root,'docs/worktree'),link,process.platform==='win32'?'junction':'dir');
 fs.writeFileSync(path.join(root,'worktree.json'),JSON.stringify({dataDirectory:'linked'}));const result=cli(root,'validate','--json');assert.equal(result.status,1);assert.equal(JSON.parse(result.stderr).error.code,'UNSAFE_PATH');
});
test('CLI는 UTF-8이 아닌 본문과 용량 제한 초과 파일을 거부한다',t=>{
 const root=fixture(t),file=path.join(root,'docs/worktree/tasks/W001.md');fs.writeFileSync(file,Buffer.from([0xff,0xfe]));assert.equal(cli(root,'validate','--json').status,1);
 const fd=fs.openSync(file,'w');fs.ftruncateSync(fd,16*1024*1024+1);fs.closeSync(fd);assert.equal(JSON.parse(cli(root,'validate','--json').stderr).error.code,'LIMIT');
});

test('CLI 전체 파일 수와 합계 용량 제한도 적용한다',t=>{
 const root=fixture(t),folder=path.join(root,'docs/worktree/tasks');
 for(let index=3;index<=2001;index++)fs.writeFileSync(path.join(folder,`W${String(index).padStart(3,'0')}.md`),'x');
 assert.equal(JSON.parse(cli(root,'validate','--json').stderr).error.code,'LIMIT');
 const other=fixture(t);for(const id of ['W001','W002'])fs.writeFileSync(path.join(other,'docs/worktree/tasks',id+'.md'),'x'.repeat(9*1024*1024));
 assert.equal(JSON.parse(cli(other,'validate','--json').stderr).error.code,'LIMIT');
});
