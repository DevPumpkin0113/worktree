export function setupSettingsNavigation(root){
 const pages=['display','about'];
 const tabs=pages.map(page=>root.getElementById(page==='display'?'settingsDisplayTab':'settingsAboutTab'));
 const panels=pages.map(page=>root.getElementById(page==='display'?'settingsDisplayPage':'settingsAboutPage'));
 function activate(page,focus=false){
  const selected=pages.indexOf(page);if(selected<0)return;
  tabs.forEach((tab,index)=>{const active=index===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.classList.toggle('active',active);panels[index].hidden=!active;});
  if(focus)tabs[selected].focus?.();
 }
 tabs.forEach((tab,index)=>{
  tab.onclick=()=>activate(pages[index]);
  tab.onkeydown=event=>{
   let next;
   if(event.key==='ArrowDown')next=(index+1)%pages.length;
   else if(event.key==='ArrowUp')next=(index+pages.length-1)%pages.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=pages.length-1;
   else return;
   event.preventDefault();activate(pages[next],true);
  };
 });
 activate('display');
 return {activate};
}
