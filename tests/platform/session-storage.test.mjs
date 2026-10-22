import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionStorage,emptySession,validateSession} from '../../src/platform/session-storage.ts';
const path='C:\\documents\\일정.wbs';
const sample=()=>({...emptySession(),recentFiles:[path],tabs:[{path,view:'gantt',ganttUnit:'week'}],activePath:path,projects:[{path:'C:\\documents',activePath:path}],activeProjectPath:'C:\\documents',recentProjects:['C:\\documents']});

test('세션 저장은 스냅샷을 순서대로 쓰고 실패 후 다음 저장을 재시도한다',async()=>{
 const calls=[];let fail=true;
 const storage=createSessionStorage(async(command,args)=>{
  if(command==='load_session')return emptySession();
  calls.push(args.session);if(fail){fail=false;throw Error('저장 실패');}
 });
 await storage.load();
 const first=sample();const failed=storage.save(first);first.tabs[0].view='tree';
 const second=storage.save(sample());await assert.rejects(failed,/저장 실패/);await second;
 assert.equal(calls[0].tabs[0].view,'gantt');assert.equal(calls.length,2);
});

test('손상·미지원 세션은 보존하고 값·중복·경로·탭 개수를 검사한다',async()=>{
 let writes=0;const storage=createSessionStorage(async command=>{if(command==='save_session')writes++;return {schemaVersion:99};});
 await assert.rejects(storage.load(),/원본은 보존/);assert.equal(await storage.save(emptySession()),false);assert.equal(writes,0);
 for(const modify of [value=>value.tabs[0].view='bad',value=>value.tabs[0].path='relative.wbs',value=>value.activePath='C:\\missing.wbs',value=>value.recentFiles.push(path),value=>value.tabs.push(...Array(40).fill(value.tabs[0]))]){
  const value=sample();modify(value);assert.throws(()=>validateSession(value));
 }
 assert.equal(validateSession(sample()).activePath,path);
});


test('문서 세션 v1을 폴더별 프로젝트로 묶고 저장 전에는 원본을 유지한다',async()=>{
 const first='C:\\plans\\one.wbs',second='C:\\plans\\two.wbs',other='C:\\elsewhere\\three.wbs';
 const legacy={schemaVersion:1,recentFiles:[first,second,other],tabs:[first,second,other].map(path=>({path,view:'gantt',ganttUnit:'week'})),activePath:second};
 const original=structuredClone(legacy);let writes=0;
 const storage=createSessionStorage(async command=>{if(command==='load_session')return legacy;if(command==='save_session')writes++;});
 const session=await storage.load();
 assert.equal(session.schemaVersion,2);assert.equal(session.projects.length,2);
 assert.equal(session.projects[0].activePath,second);assert.equal(session.activePath,second);
 assert.equal(session.recentProjects.length,2);assert.equal(writes,0);assert.deepEqual(legacy,original);
 await storage.save(session);assert.equal(writes,1);
});

test('프로젝트 세션의 경계 밖 파일·경로 중복·선택 불일치를 거부하고 빈 프로젝트를 허용한다',()=>{
 const empty={...emptySession(),projects:[{path:'C:\\empty',activePath:null}],activeProjectPath:'C:\\empty'};
 assert.doesNotThrow(()=>validateSession(empty));
 for(const modify of [value=>value.projects[0].path='C:\\other',value=>value.projects.push({...value.projects[0],path:'c:/DOCUMENTS/'}),value=>value.activeProjectPath='C:\\unknown',value=>value.recentProjects=['relative'],value=>value.projects[0].path='C:\\documents\\..']){
  const value=sample();modify(value);assert.throws(()=>validateSession(value));
 }
});


test('작업 탭 순서와 활성 탭은 깊은 스냅샷으로 저장하고 잘못된 목록은 거부한다',async()=>{
 const value=sample();value.tabs[0].taskTabs=['W002','W001'];value.tabs[0].activeTaskTab='W001';
 const copy=validateSession(value);value.tabs[0].taskTabs.reverse();
 assert.deepEqual(copy.tabs[0].taskTabs,['W002','W001']);
 for(const modify of [v=>v.tabs[0].taskTabs=['W001','W001'],v=>v.tabs[0].taskTabs=['../W001'],v=>v.tabs[0].taskTabs=null,v=>v.tabs[0].activeTaskTab='W999']){
  const invalid=structuredClone(copy);modify(invalid);assert.throws(()=>validateSession(invalid));
 }
 let saved;const storage=createSessionStorage(async(command,args)=>command==='load_session'?emptySession():(saved=args.session));
 await storage.load();await storage.save(copy);
 assert.deepEqual(saved.tabs[0].taskTabs,['W002','W001']);assert.equal(saved.tabs[0].activeTaskTab,'W001');
});
