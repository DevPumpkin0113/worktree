import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupAppInfo} from '../src/interactions/app-info.mjs';

function fixture({auto='false',check=async()=>({kind:'latest',version:'0.5.0',notes:''}),install=async()=>false,failStorage=false}={}){
 const elements=new Map(),calls=[],data=new Map([['worktree.autoCheckUpdates',auto]]);
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,disabled:false,checked:true,value:0,setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}});return elements.get(id);};
 const storage={getItem:k=>data.get(k),setItem(k,v){if(failStorage)throw Error('denied');data.set(k,v);}};
 const invoke=async(command,args)=>{calls.push(command);if(command==='get_build_info')return {version:'0.5.0',builtAt:'1792425600',channel:'development',commit:'abc12345+dirty',platform:'windows x86_64'};if(command==='check_app_update')return check();if(command==='install_app_update')return install(args.onProgress);};
 const app=setupAppInfo({document:{getElementById:element},storage,invoke,makeChannel:fn=>({send:fn}),now:()=>new Date('2026-10-20T00:00:00Z')});
 return {app,element,calls,data};
}

test('자동 확인을 끄면 시작 시 통신하지 않고 빌드 메타데이터만 표시한다',async()=>{
 const {app,element,calls}=fixture();await app.ready;
 assert.deepEqual(calls,['get_build_info']);assert.equal(element('buildChannel').textContent,'개발용');assert.equal(element('buildCommit').textContent,'abc12345+dirty');
});
test('자동 확인 기본값과 개발 버전·최신·수동 설치·미게시 상태를 구분한다',async()=>{
 for(const [kind,title] of [['ahead','개발 버전'],['latest','최신 버전'],['manual','새 버전'],['no-release','공개된 릴리즈']]){
  const {app,element,calls}=fixture({auto:null,check:async()=>({kind,version:'0.4.0',notes:''})});await app.ready;
  assert.equal(calls.filter(x=>x==='check_app_update').length,1);assert.ok(element('updateTitle').textContent.includes(title));assert.equal(element('installUpdate').disabled,true);assert.equal(element('releasePage').hidden,kind!=='manual');
 }
});
test('동시 확인을 합치고 실패 후 재시도하며 설치 가능 상태를 초기화한다',async()=>{
 let resolveCheck,count=0;
 const {app,element}=fixture({check:()=>{count++;return new Promise(resolve=>resolveCheck=resolve);}});await app.ready;
 const pending=app.check();await app.check();assert.equal(count,1);assert.equal(element('checkUpdates').disabled,true);
 resolveCheck({kind:'available',version:'0.6.0',notes:'<script>untrusted</script>'});await pending;
 assert.equal(element('installUpdate').disabled,false);assert.equal(element('updateNotes').textContent,'<script>untrusted</script>');
 const next=app.check();assert.equal(element('installUpdate').disabled,true);resolveCheck({kind:'latest',version:'0.5.0',notes:''});await next;
 assert.equal(element('installUpdate').disabled,true);assert.equal(element('updateNotes').hidden,true);
});
test('확인 실패를 최신으로 표시하지 않으며 버튼을 복구한다',async()=>{
 let count=0;const {app,element}=fixture({check:async()=>{if(!count++)throw Error('offline');return {kind:'latest',version:'0.5.0'};}});await app.ready;
 await app.check();assert.match(element('updateTitle').textContent,/실패/);assert.match(element('updateDescription').textContent,/offline/);assert.equal(element('checkUpdates').disabled,false);
 await app.check();assert.match(element('updateTitle').textContent,/최신/);
});
test('설치는 명시적 클릭만 실행하고 진행률·취소·서명 오류를 처리한다',async()=>{
 let fail=false;const {app,element,calls}=fixture({check:async()=>({kind:'available',version:'0.6.0'}),install:async channel=>{channel.send({phase:'downloading',downloaded:50,total:100});assert.equal(element('updateProgress').value,50);if(fail)throw Error('signature invalid');return false;}});await app.ready;await app.check();
 assert.ok(!calls.includes('install_app_update'));await app.install();assert.match(element('updateTitle').textContent,/취소/);assert.equal(element('installUpdate').disabled,false);
 fail=true;await app.install();assert.match(element('updateTitle').textContent,/설치하지 못/);assert.equal(element('updateProgress').hidden,true);
});
test('설정 저장 실패 시 이전 자동 확인 선택으로 복구한다',async()=>{
 const {app,element}=fixture({failStorage:true});await app.ready;element('autoCheckUpdates').checked=true;await element('autoCheckUpdates').onchange();assert.equal(element('autoCheckUpdates').checked,false);assert.match(element('updatePreferenceError').textContent,/저장하지 못/);
});
test('문제 제보는 작성 화면 열기만 요청한다',async()=>{
 const {app,element,calls}=fixture();await app.ready;await element('reportIssue').onclick();assert.ok(calls.includes('open_issue_report'));assert.match(element('issueFeedback').textContent,/작성한 후 제출/);assert.equal(element('reportIssue').disabled,false);
});
