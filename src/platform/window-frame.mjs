import {getCurrentWindow} from '@tauri-apps/api/window';
const appWindow=getCurrentWindow();
export function setWindowTitle(title){appWindow.setTitle(title==='Worktree'?title:title+' — Worktree').catch(console.error);document.title=title;}
export function setupWindowFrame(onError){
  const run=action=>()=>action().catch(onError);
  document.getElementById('windowMinimize').onclick=run(()=>appWindow.minimize());
  document.getElementById('windowMaximize').onclick=run(()=>appWindow.toggleMaximize());
  document.getElementById('windowClose').onclick=run(()=>appWindow.close());
  const drag=document.getElementById('titleDrag');
  drag.onmousedown=e=>{if(e.button!==0)return;e.preventDefault();if(e.detail===2)appWindow.toggleMaximize().catch(onError);else appWindow.startDragging().catch(onError);};
  const update=async()=>{const maximized=await appWindow.isMaximized();const button=document.getElementById('windowMaximize');button.title=maximized?'이전 크기로 복원':'최대화';button.setAttribute('aria-label',button.title);button.innerHTML=maximized?'<svg viewBox="0 0 12 12"><path d="M3.5 3.5v-2h7v7h-2"/><rect x="1.5" y="3.5" width="7" height="7"/></svg>':'<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9"/></svg>';};
  appWindow.onResized(()=>update().catch(onError)).catch(onError);update().catch(onError);
}
