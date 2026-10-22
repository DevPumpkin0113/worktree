import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {projectFixture} from '../helpers/project-fixture.ts';
const repository=fileURLToPath(new URL('../../',import.meta.url));
const main=path.join(repository,'apps/cli/dist/main.js');
function fixture(t,name='Example'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-write-cli-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=JSON.parse(projectFixture(name));fs.writeFileSync(path.join(root,'worktree.json'),JSON.stringify({dataDirectory:source.dataDirectory}));
 for(const [key,value] of Object.entries(source.files)){const file=path.join(root,source.dataDirectory,key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
 return root;
}
function cli(root,args,input){return spawnSync(process.execPath,[main,...args,'--project',root],{cwd:repository,encoding:'utf8',input});}
function ok(root,...args){const result=cli(root,[...args,'--json']);assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}
function error(root,code,...args){const result=cli(root,[...args,'--json']);assert.equal(result.status,1,result.stdout);assert.equal(JSON.parse(result.stderr).error.code,code,result.stderr);}

test('작업 생성·JSON 편집·원본 ID·선행 관계 저장과 dry-run 불변성',t=>{
 const root=fixture(t);const revision=ok(root,'status').revision;
 const preview=ok(root,'task','add','--title','새 작업','--dry-run');assert.equal(preview.dryRun,true);assert.equal(ok(root,'status').revision,revision);
 const added=ok(root,'task','add','--title','새 작업','--milestone','MS001','--owner','박대호','--deps','W001','--expect',revision);assert.equal(added.id,'W003');
 const input=path.join(root,'edit.json');fs.writeFileSync(input,JSON.stringify({title:'수정한 작업',description:'여러 줄\n설명',priority:'high',labels:['ui','api'],references:[{type:'text',value:'참고 자료'}]}));
 ok(root,'task','edit','W003','--input',input);const show=ok(root,'task','show','W003');assert.equal(show.task.name,'수정한 작업');assert.deepEqual(show.task.deps,['W001']);assert.equal(show.task.description,'여러 줄\n설명');assert.equal(show.task.references[0].value,'참고 자료');
 error(root,'CONFLICT','task','edit','W003','--title','덮어쓰기','--expect',revision);assert.equal(ok(root,'task','show','W003').task.name,'수정한 작업');
});
test('삭제는 동의를 요구하고 외부 선행 참조 해제와 번호 재사용 방지를 적용한다',t=>{
 const root=fixture(t);error(root,'CONFIRMATION_REQUIRED','task','delete','W001');error(root,'REFERENCES_EXIST','task','delete','W001','--yes');
 const preview=ok(root,'task','delete','W001','--dry-run');assert.ok(preview.changedFiles.includes('tasks/W002.md'));assert.equal(ok(root,'status').taskCount,2);
 ok(root,'task','delete','W001','--yes','--detach');assert.deepEqual(ok(root,'task','show','W002').task.deps,[]);assert.equal(ok(root,'task','add','--title','다음 작업').id,'W003');
});
test('마일스톤 생성·조회·편집과 하위 작업 유지/삭제',t=>{
 const root=fixture(t);const item=ok(root,'milestone','add','--title','두 번째 목표');assert.equal(item.id,'MS002');
 ok(root,'milestone','edit','MS002','--title','바뀐 목표','--start','2026-10-25','--end','2026-10-26');assert.equal(ok(root,'milestone','show','MS002').task.name,'바뀐 목표');
 assert.equal(ok(root,'milestone','list').tasks.length,2);error(root,'CHILD_POLICY_REQUIRED','milestone','delete','MS001','--yes');
 ok(root,'milestone','delete','MS001','--yes','--children','keep');assert.equal(ok(root,'task','show','W001').task.parent,'-');
 ok(root,'task','edit','W001','--milestone','MS002');ok(root,'task','edit','W002','--milestone','MS002');
 ok(root,'milestone','delete','MS002','--yes','--children','delete');assert.equal(ok(root,'status').taskCount,0);
});
test('댓글·답글·수정 제한·삭제 표식·작업 삭제 연계를 적용한다',t=>{
 const root=fixture(t);const comment=ok(root,'comment','add','W001','--text','초기 의견','--author','박대호');
 ok(root,'comment','edit','W001','#001','--text','수정 의견');
 const reply=ok(root,'comment','add','W001','--text','답글','--author','CODEX','--reply-to','#001');assert.notEqual(reply.id,comment.id);
 error(root,'COMMENT_HAS_REPLIES','comment','edit','W001','#001','--text','수정 불가');
 error(root,'CONFIRMATION_REQUIRED','comment','delete','W001','#001');ok(root,'comment','delete','W001','#001','--yes');
 const comments=ok(root,'comment','list','W001').comments;assert.equal(comments.length,2);assert.equal(comments[0].deleted||comments[1].deleted,true);assert.ok(comments.some(c=>c.replyTo===comment.id));
 ok(root,'task','delete','W001','--yes','--detach');assert.equal(ok(root,'status').comments,0);
});
test('저장 helper는 오래된 스냅샷을 거부하고 외부 변경을 보존한다',t=>{
 const root=fixture(t);const before=JSON.parse(projectFixture('Example'));const file=path.join(root,'docs/worktree/tasks/W001.md');fs.appendFileSync(file,'외부 변경\n');
 const helper=path.join(repository,'apps/cli/dist/worktree-store'+(process.platform==='win32'?'.exe':''));
 const result=spawnSync(helper,[],{encoding:'utf8',input:JSON.stringify({operation:'save',root,expected:JSON.stringify(before),text:JSON.stringify(before),language:'ko'})});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).status,'conflict');assert.ok(fs.readFileSync(file,'utf8').includes('외부 변경'));
});
test('shell은 프로젝트·언어·작성자를 유지하고 오류 뒤에도 명령을 처리한다',t=>{
 const root=fixture(t,'첫 프로젝트'),other=fixture(t,'두 번째 프로젝트');
 const lines=['task list','task show UNKNOWN','author "세션 작성자"','comment add W001 --text "세션 댓글"',`use "${other}"`,'language en','format json','status','exit','task delete W001 --yes --detach'].join('\n');
 const result=cli(root,['shell'],lines);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/┌/);assert.match(result.stderr,/TASK_NOT_FOUND/);assert.match(result.stdout,/"project": "두 번째 프로젝트"/);assert.equal(ok(root,'comment','list','W001').comments[0].author,'세션 작성자');assert.equal(ok(other,'status').taskCount,2);
});
test('잘못된 편집·조회·확인되지 않은 입력은 데이터를 바꾸지 않는다',t=>{
 const root=fixture(t);const before=ok(root,'status').revision;
 const bad=cli(root,['task','edit','W001','--references','not-json','--json']);assert.equal(bad.status,2);
 error(root,'TASK_NOT_FOUND','comment','list','W999');
 assert.equal(ok(root,'status').revision,before);
});

test('dry-run은 최종 용량 제한을 검증하고 알 수 없는 JSON 필드를 거부한다',t=>{
 const root=fixture(t),before=ok(root,'status').revision,input=path.join(root,'input.json');
 fs.writeFileSync(input,JSON.stringify({title:'제한 검사',description:'x'.repeat(16*1024*1024)}));error(root,'LIMIT','task','add','--input',input,'--dry-run');
 fs.writeFileSync(input,'{"title":"잘못된 필드","constructor":"x"}');const invalid=cli(root,['task','add','--input',input,'--dry-run','--json']);assert.equal(invalid.status,2);assert.equal(ok(root,'status').revision,before);
});
test('번들·저장 helper만 별도 폴더로 복사해도 쓰기 명령을 실행한다',t=>{
 const root=fixture(t),standalone=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-cli-bundle-'));t.after(()=>fs.rmSync(standalone,{recursive:true,force:true}));
 const helper='worktree-store'+(process.platform==='win32'?'.exe':'');for(const name of ['main.js',helper])fs.copyFileSync(path.join(repository,'apps/cli/dist',name),path.join(standalone,name));
 const result=spawnSync(process.execPath,[path.join(standalone,'main.js'),'task','add','--title','독립 번들','--project',root,'--json'],{cwd:standalone,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).id,'W003');
});

test('BOM·CRLF 원문을 스냅샷에 보존해 정상 저장을 충돌로 처리하지 않는다',t=>{
 const root=fixture(t),file=path.join(root,'docs/worktree/tasks/W001.md');fs.writeFileSync(file,'\ufeff'+fs.readFileSync(file,'utf8').replaceAll('\n','\r\n'));
 const before=ok(root,'status').revision;const changed=ok(root,'task','edit','W001','--title','인코딩 보존 확인','--expect',before);assert.notEqual(changed.revision,before);assert.equal(ok(root,'task','show','W001').task.name,'인코딩 보존 확인');
});

test('댓글 기본 작성자는 앱 표시 이름을 읽고 미지원 설정은 보존한다',t=>{
 const root=fixture(t),settingsRoot=path.join(root,'settings'),folder=path.join(settingsRoot,'Worktree');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'settings.json');
 fs.writeFileSync(file,JSON.stringify({schemaVersion:2,displayName:'앱 표시 이름'}));
 const args=[main,'comment','add','W001','--text','설정 이름 사용','--project',root,'--json'];
 const env={...process.env,LOCALAPPDATA:settingsRoot};const result=spawnSync(process.execPath,args,{cwd:repository,encoding:'utf8',env});assert.equal(result.status,0,result.stderr);assert.equal(ok(root,'comment','list','W001').comments[0].author,'앱 표시 이름');
 fs.writeFileSync(file,JSON.stringify({schemaVersion:99,displayName:'다른 이름'}));const failed=spawnSync(process.execPath,args,{cwd:repository,encoding:'utf8',env});assert.equal(failed.status,1);assert.equal(JSON.parse(failed.stderr).error.code,'AUTHOR_REQUIRED');assert.equal(JSON.parse(fs.readFileSync(file)).schemaVersion,99);
});
