import type { WorkRow } from './types';
export function summarizeWork(rows: WorkRow[]) {
  const leaves = rows.filter((row) => row.type !== 'group');
  const tasks = leaves.filter((row) => row.type === 'task');
  const milestones = leaves.filter((row) => row.type === 'milestone');
  const missingEfforts = tasks.filter((row) => row.effort === '-').length;
  const totalEffort = tasks.reduce((total, row) => total + (Number(row.effort) || 0), 0);
  const completedEffort = tasks
    .filter((row) => row.status === 'done')
    .reduce((total, row) => total + Number(row.effort), 0);
  const completedTasks = tasks.filter((row) => row.status === 'done').length;
  return {
    taskCount: tasks.length,
    milestoneCount: milestones.length,
    completedTasks,
    completedMilestones: milestones.filter((row) => row.status === 'done').length,
    groupCount: rows.length - leaves.length,
    missingDates: leaves.filter((row) => row.start === '-').length,
    missingEfforts,
    taskProgress: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : null,
    progress:
      !missingEfforts && totalEffort ? Math.round((completedEffort / totalEffort) * 100) : null,
  };
}

export function statusNotice(summary: ReturnType<typeof summarizeWork>, useEffort = true) {
  return (
    `구조 검사 통과 · ${summary.groupCount}개 그룹 · 일정 미정 ${summary.missingDates}개` +
    (useEffort ? ` · 공수 미정 ${summary.missingEfforts}개` : '')
  );
}
