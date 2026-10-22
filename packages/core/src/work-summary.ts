import { messages } from './i18n/messages';
import type { WorkRow } from './types';
export function summarizeWork(rows: WorkRow[]) {
  const leaves = rows.filter((row) => row.type !== 'group');
  const tasks = leaves.filter((row) => row.type === 'task');
  const milestones = rows.filter((row) => row.milestone);
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
    messages.structureNotice(summary.groupCount, summary.missingDates) +
    (useEffort ? messages.missingEffortNotice(summary.missingEfforts) : '')
  );
}
