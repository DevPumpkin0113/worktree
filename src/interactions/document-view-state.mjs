const scrollers=['.diagram-scroll','.gantt-scroll'];

export function createDocumentViewState(){
 const documents=new Map();
 function state(path){
  if(!documents.has(path))documents.set(path,{views:new Map(),groups:new Map()});
  return documents.get(path);
 }
 return {
  capture(path,view,root){
   if(!path)return;
   const current=state(path);
   const scroll={left:root.scrollLeft||0,top:root.scrollTop||0,nested:{}};
   for(const selector of scrollers){const node=root.querySelector?.(selector);if(node)scroll.nested[selector]={left:node.scrollLeft,top:node.scrollTop};}
   for(const summary of root.querySelectorAll?.('summary[data-work-id]')||[])current.groups.set(summary.dataset.workId,summary.parentElement.open);
   current.views.set(view,scroll);
  },
  restore(path,view,root,rows){
   const current=documents.get(path);
   if(current){
    const ids=new Set(rows.map(row=>row.id));
    for(const id of current.groups.keys())if(!ids.has(id))current.groups.delete(id);
    for(const summary of root.querySelectorAll?.('summary[data-work-id]')||[])if(current.groups.has(summary.dataset.workId))summary.parentElement.open=current.groups.get(summary.dataset.workId);
   }
   const scroll=current?.views.get(view);
   root.scrollLeft=scroll?.left||0;root.scrollTop=scroll?.top||0;
   for(const selector of scrollers){const node=root.querySelector?.(selector);if(node){node.scrollLeft=scroll?.nested[selector]?.left||0;node.scrollTop=scroll?.nested[selector]?.top||0;}}
  },
  forget(path){documents.delete(path);},
 };
}
