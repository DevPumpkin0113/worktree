export const MAX_RECENT_FILES=12;
export const MAX_SESSION_TABS=40;
export const emptySession=()=>({schemaVersion:1,recentFiles:[],tabs:[],activePath:null});
const validPath=path=>typeof path==='string'&&path.length>0&&path.length<=32767&&!path.includes('\0')&&/^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(path)&&/\.(?:wbs|md|markdown)$/i.test(path);

export function validateSession(value){
 if(!value||value.schemaVersion!==1||!Array.isArray(value.recentFiles)||!Array.isArray(value.tabs)||value.recentFiles.length>MAX_RECENT_FILES||value.tabs.length>MAX_SESSION_TABS||!value.recentFiles.every(validPath)||!value.tabs.every(tab=>tab&&validPath(tab.path)&&['tree','board','flow','gantt'].includes(tab.view)&&['day','week'].includes(tab.ganttUnit))||new Set(value.recentFiles).size!==value.recentFiles.length||new Set(value.tabs.map(tab=>tab.path)).size!==value.tabs.length||!(value.activePath===null||value.tabs.some(tab=>tab.path===value.activePath)))throw Error('세션 파일의 버전 또는 값이 올바르지 않습니다. 원본은 보존합니다.');
 return {schemaVersion:1,recentFiles:[...value.recentFiles],tabs:value.tabs.map(tab=>({...tab})),activePath:value.activePath};
}

export function createSessionStorage(invoke){
 let queue=Promise.resolve(),failed=false;
 return {
  async load(){try{return validateSession(await invoke('load_session'));}catch(error){failed=true;throw error;}},
  save(value){
   if(failed)return Promise.resolve(false);
   const snapshot=validateSession(value);
   const operation=queue.catch(()=>{}).then(()=>invoke('save_session',{session:snapshot}));
   queue=operation;return operation.then(()=>true);
  },
 };
}
