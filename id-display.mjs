const KEY='worktree.id-separator';
export function readSeparator(storage){try{return storage.getItem(KEY)==='hyphen'?'hyphen':'none';}catch{return 'none';}}
export function saveSeparator(storage,value){if(!['none','hyphen'].includes(value))throw Error('잘못된 ID 구분자 설정입니다.');storage.setItem(KEY,value);}
export function createIdLabels(model,separator){
 const labels=new Map(),counts=new Map();
 for(const row of model.rows){const number=row.id.match(/(\d+)$/)?.[1];const label=model.idPrefix+(separator==='hyphen'?'-':'')+number;labels.set(row.id,label);counts.set(label,(counts.get(label)||0)+1);}
 for(const [id,label] of labels)if(counts.get(label)>1)labels.set(id,label+' ['+id+']');
 return labels;
}
