export function workOwners(rows){
 return [...new Set(rows.filter(row=>row.type!=='group').map(row=>row.owner))].sort((a,b)=>a==='-'?-1:b==='-'?1:a.localeCompare(b,'ko'));
}

export function matchesWork(row,{query='',status='all',owner='all'},label=id=>id){
 const text=[row.id,label(row.id),row.name,row.owner].join(' ').toLowerCase();
 return text.includes(query.trim().toLowerCase())&&(status==='all'||row.status===status)&&(!owner||owner==='all'||owner==='owner:'+row.owner);
}
