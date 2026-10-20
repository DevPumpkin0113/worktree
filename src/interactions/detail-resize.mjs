const MIN_WIDTH=280,MIN_CONTENT=240,CLOSE_WIDTH=160,STEP=24;
export function bindDetailResize({handle,dialog,hide,surface=document.documentElement,viewport=window}){
 let width=null,gesture=null;
 const maximum=()=>Math.max(MIN_WIDTH,viewport.innerWidth-MIN_CONTENT-(Number.parseFloat(viewport.getComputedStyle(surface).getPropertyValue('--workspace-nav-width'))||0));
 function apply(value){width=Math.max(MIN_WIDTH,Math.min(maximum(),value));surface.style.setProperty('--detail-panel-width',width+'px');handle.setAttribute('aria-valuenow',String(Math.round(width)));handle.setAttribute('aria-valuemin',String(MIN_WIDTH));handle.setAttribute('aria-valuemax',String(maximum()));}
 function finish(cancel=false){if(!gesture)return;const saved=gesture;gesture=null;surface.classList.remove('resizing-detail');if(cancel)apply(saved.width);else if(saved.next<CLOSE_WIDTH){apply(saved.width);hide();}if(handle.hasPointerCapture(saved.id))handle.releasePointerCapture(saved.id);}
 handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();const start=dialog.getBoundingClientRect().width;gesture={id:event.pointerId,x:event.clientX,width:start,next:start};handle.setPointerCapture(event.pointerId);surface.classList.add('resizing-detail');};
 handle.onpointermove=event=>{if(!gesture||gesture.id!==event.pointerId)return;gesture.next=gesture.width+gesture.x-event.clientX;apply(gesture.next);};
 handle.onpointerup=()=>finish();handle.onpointercancel=()=>finish(true);handle.onlostpointercapture=()=>finish(true);
 handle.ondblclick=()=>apply(Math.min(520,viewport.innerWidth*.4));
 handle.onkeydown=event=>{if(event.key==='Escape'&&gesture){event.preventDefault();finish(true);return;}if(!['ArrowLeft','ArrowRight','Home','End','Enter'].includes(event.key))return;event.preventDefault();if(event.key==='Enter'){hide();return;}apply(event.key==='Home'?MIN_WIDTH:event.key==='End'?maximum():(width??dialog.getBoundingClientRect().width)+(event.key==='ArrowLeft'?STEP:-STEP));};
 const fit=()=>{if(width!==null)apply(width);};viewport.addEventListener('resize',fit);
 return {fit};
}
