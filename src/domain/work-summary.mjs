export function summarizeWork(rows){
 const leaves=rows.filter(row=>row.type!=='group');
 const tasks=leaves.filter(row=>row.type==='task');
 const milestones=leaves.filter(row=>row.type==='milestone');
 const missingEfforts=tasks.filter(row=>row.effort==='-').length;
 const totalEffort=tasks.reduce((total,row)=>total+(Number(row.effort)||0),0);
 const completedEffort=tasks.filter(row=>row.status==='done').reduce((total,row)=>total+Number(row.effort),0);
 return {
  taskCount:tasks.length,
  milestoneCount:milestones.length,
  completedTasks:tasks.filter(row=>row.status==='done').length,
  completedMilestones:milestones.filter(row=>row.status==='done').length,
  groupCount:rows.length-leaves.length,
  missingDates:leaves.filter(row=>row.start==='-').length,
  missingEfforts,
  progress:!missingEfforts&&totalEffort?Math.round(completedEffort/totalEffort*100):null,
 };
}
