import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionStorage,emptySession,validateSession} from '../../src/platform/session-storage.ts';
const path='C:\\documents\\일정.wbs';
const sample=()=>({...emptySession(),recentFiles:[path],tabs:[{path,view:'gantt',ganttUnit:'week'}],activePath:path});

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
