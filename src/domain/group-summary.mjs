export function summarizeGroups(rows){
 const children=new Map(),summaries=new Map();
 for(const row of rows){if(!children.has(row.parent))children.set(row.parent,[]);children.get(row.parent).push(row);}
 function aggregate(row){
  if(row.type!=='group'){
   const task=row.type==='task',known=typeof row.start==='string'&&row.start!=='-'&&typeof row.end==='string'&&row.end!=='-';
   const effort=task&&row.effort!=='-'?Number(row.effort)||0:0;
   return {start:known?row.start:null,end:known?row.end:null,missingDates:known?0:1,effort,missingEfforts:task&&(row.effort==='-'||row.effort===undefined)?1:0,taskCount:task?1:0,milestoneCount:task?0:1,completedTasks:task&&row.status==='done'?1:0,completedMilestones:!task&&row.status==='done'?1:0,completedEffort:task&&row.status==='done'?effort:0};
  }
  if(summaries.has(row.id))return summaries.get(row.id);
  const result={start:null,end:null,missingDates:0,effort:0,missingEfforts:0,taskCount:0,milestoneCount:0,completedTasks:0,completedMilestones:0,completedEffort:0};
  for(const child of children.get(row.id)||[]){
   const summary=aggregate(child);
   if(summary.start&&(!result.start||summary.start<result.start))result.start=summary.start;
   if(summary.end&&(!result.end||summary.end>result.end))result.end=summary.end;
   for(const key of ['missingDates','effort','missingEfforts','taskCount','milestoneCount','completedTasks','completedMilestones','completedEffort'])result[key]+=summary[key];
  }
  result.progress=!result.missingEfforts&&result.effort?Math.round(result.completedEffort/result.effort*100):null;
  summaries.set(row.id,result);return result;
 }
 for(const row of rows)if(row.type==='group')aggregate(row);
 return summaries;
}
