import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSettingsStorage} from '../../src/platform/settings-storage.ts';
const defaults=()=>({schemaVersion:2,language:'ko',idSeparator:'none',detailMode:'sidebar',autoCheckUpdates:true});
function fixture({settings=null,legacy={},failLoad=false,failSave=false}={}){
 const calls=[];let saved=settings;
 const invoke=async(cmd,args)=>{calls.push(cmd);if(cmd==='load_settings'){if(failLoad)throw Error('denied');return {settings:saved,warning:''};}if(cmd==='initialize_settings'){saved??=args.settings;return {...saved};}if(cmd==='save_settings'){if(failSave)throw Error('disk full');await new Promise(resolve=>setImmediate(resolve));saved={...args.settings};return saved;}};
 const storage=createSettingsStorage({invoke,legacyStorage:()=>({getItem:key=>legacy[key]??null,setItem(){throw Error('Legacy storage must remain untouched');}})});
 return {storage,calls,getSaved:()=>saved};
}
test('기존 localStorage 세 항목을 JSON으로 한 번 이전하고 원본은 변경하지 않는다',async()=>{
 const {storage,calls,getSaved}=fixture({legacy:{'worktree.id-separator':'hyphen','worktree.detail-mode':'modal','worktree.autoCheckUpdates':'false'}});await storage.ready;
 assert.deepEqual(getSaved(),{schemaVersion:2,language:'ko',idSeparator:'hyphen',detailMode:'modal',autoCheckUpdates:false});assert.deepEqual(calls,['load_settings','initialize_settings']);assert.equal(storage.getItem('worktree.autoCheckUpdates'),'false');
});
test('JSON이 있으면 이전 localStorage 값을 무시한다',async()=>{
 const {storage,calls}=fixture({settings:defaults(),legacy:{'worktree.id-separator':'hyphen'}});await storage.ready;assert.equal(storage.getItem('worktree.id-separator'),'none');assert.deepEqual(calls,['load_settings']);
});
test('빠르게 연속 저장해도 다른 설정을 덮어쓰지 않는다',async()=>{
 const {storage,getSaved}=fixture();await storage.ready;
 await Promise.all([storage.setItem('worktree.id-separator','hyphen'),storage.setItem('worktree.detail-mode','modal'),storage.setItem('worktree.autoCheckUpdates','false')]);
 assert.deepEqual(getSaved(),{schemaVersion:2,language:'ko',idSeparator:'hyphen',detailMode:'modal',autoCheckUpdates:false});
});
test('저장 실패 시 메모리 설정을 바꾸지 않고 다음 저장을 재시도할 수 있다',async()=>{
 let attempts=0;const saved=defaults();const storage=createSettingsStorage({legacyStorage:()=>null,invoke:async(cmd,args)=>{if(cmd==='load_settings')return {settings:saved};if(!attempts++)throw Error('full');return args.settings;}});await storage.ready;
 await assert.rejects(storage.setItem('worktree.id-separator','hyphen'));assert.equal(storage.getItem('worktree.id-separator'),'none');await storage.setItem('worktree.id-separator','hyphen');assert.equal(storage.getItem('worktree.id-separator'),'hyphen');
});
test('읽기 실패 시 기본값을 저장해 원본을 덮어쓰지 않는다',async()=>{
 const {storage,calls}=fixture({failLoad:true});await assert.rejects(storage.ready);await assert.rejects(storage.setItem('worktree.id-separator','hyphen'));assert.deepEqual(calls,['load_settings']);
});
test('없는 값과 잘못된 이전 값은 기본값을 사용하며 자동 확인 끄기는 유지한다',async()=>{
 const {storage,getSaved}=fixture({legacy:{'worktree.id-separator':'invalid','worktree.autoCheckUpdates':'false'}});await storage.ready;assert.deepEqual(getSaved(),{...defaults(),autoCheckUpdates:false});
});


test('언어가 없는 v1 설정은 한국어로 읽고 언어 저장 시 v2로 기존 값을 보존한다',async()=>{
 const {storage,getSaved}=fixture({settings:{schemaVersion:1,idSeparator:'hyphen',detailMode:'modal',autoCheckUpdates:false}});
 await storage.ready;
 assert.equal(storage.getItem('worktree.language'),'ko');
 await storage.setItem('worktree.language','en');
 assert.deepEqual(getSaved(),{schemaVersion:2,language:'en',idSeparator:'hyphen',detailMode:'modal',autoCheckUpdates:false});
 await assert.rejects(storage.setItem('worktree.language','invalid'));
 assert.equal(storage.getItem('worktree.language'),'en');
});
