const keys={
 'worktree.id-separator':'idSeparator',
 'worktree.detail-mode':'detailMode',
 'worktree.autoCheckUpdates':'autoCheckUpdates',
};
const defaults=()=>({schemaVersion:1,idSeparator:'none',detailMode:'sidebar',autoCheckUpdates:true});
function valueFor(field,value){
 if(field==='idSeparator'&&['none','hyphen'].includes(value))return value;
 if(field==='detailMode'&&['modal','sidebar'].includes(value))return value;
 if(field==='autoCheckUpdates'&&['true','false'].includes(value))return value==='true';
 throw Error('올바르지 않은 설정입니다.');
}

export function createSettingsStorage({invoke,legacyStorage}){
 let settings=defaults(),failure=null,queue=Promise.resolve();
 const storage={warning:'',getItem:key=>keys[key]?String(settings[keys[key]]):null,
  setItem(key,value){
   const field=keys[key];if(!field)return Promise.reject(Error('알 수 없는 설정입니다.'));
   const operation=queue.catch(()=>{}).then(async()=>{
    await storage.ready;
    if(failure)throw failure;
    const next={...settings,[field]:valueFor(field,value)};
    settings=await invoke('save_settings',{settings:next});
   });queue=operation;return operation;
  },
 };
 storage.ready=(async()=>{
  try{
   const result=await invoke('load_settings');storage.warning=result.warning||'';
   if(result.settings){settings=result.settings;return;}
   const migrated=defaults();
   // The first native window reuses the old WebView profile; no LevelDB parsing or profile copy.
   try{const legacy=legacyStorage();for(const [key,field] of Object.entries(keys)){const value=legacy.getItem(key);if(value!==null&&value!==undefined){try{migrated[field]=valueFor(field,value);}catch{}}}}
   catch{throw Error('기존 설정을 읽지 못했습니다. 이전 데이터는 그대로 두었습니다. 앱을 다시 실행해 주세요.');}
   settings=await invoke('initialize_settings',{settings:migrated});
  }catch(error){failure=error;throw error;}
 })();
 return storage;
}
