import type { WorkRow } from './types';
interface GroupTotals {
  start: string | null;
  end: string | null;
  missingDates: number;
  effort: number;
  missingEfforts: number;
  taskCount: number;
  completedTasks: number;
  completedEffort: number;
}
export interface GroupSummary extends GroupTotals {
  progress: number | null;
}
export function summarizeGroups(rows: WorkRow[]) {
  const children = new Map<string, WorkRow[]>(),
    summaries = new Map<string, GroupSummary>();
  for (const row of rows) {
    if (!children.has(row.parent)) children.set(row.parent, []);
    children.get(row.parent)!.push(row);
  }
  function aggregate(row: WorkRow): GroupTotals {
    if (row.type !== 'group') {
      const known =
        typeof row.start === 'string' &&
        row.start !== '-' &&
        typeof row.end === 'string' &&
        row.end !== '-';
      const effort = row.effort !== '-' ? Number(row.effort) || 0 : 0;
      return {
        start: known ? row.start : null,
        end: known ? row.end : null,
        missingDates: known ? 0 : 1,
        effort,
        missingEfforts: row.effort === '-' || row.effort === undefined ? 1 : 0,
        taskCount: 1,
        completedTasks: row.status === 'done' ? 1 : 0,
        completedEffort: row.status === 'done' ? effort : 0,
      };
    }
    if (summaries.has(row.id)) return summaries.get(row.id)!;
    const result: GroupSummary = {
      progress: null,
      start: null,
      end: null,
      missingDates: 0,
      effort: 0,
      missingEfforts: 0,
      taskCount: 0,
      completedTasks: 0,
      completedEffort: 0,
    };
    for (const child of children.get(row.id) || []) {
      const summary = aggregate(child);
      if (summary.start && (!result.start || summary.start < result.start))
        result.start = summary.start;
      if (summary.end && (!result.end || summary.end > result.end)) result.end = summary.end;
      for (const key of [
        'missingDates',
        'effort',
        'missingEfforts',
        'taskCount',
        'completedTasks',
        'completedEffort',
      ] as const)
        result[key] += summary[key];
    }
    result.progress =
      !result.missingEfforts && result.effort
        ? Math.round((result.completedEffort / result.effort) * 100)
        : null;
    summaries.set(row.id, result);
    return result;
  }
  for (const row of rows) if (row.type === 'group') aggregate(row);
  return summaries;
}
