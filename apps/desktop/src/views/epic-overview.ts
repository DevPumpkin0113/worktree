import { summarizeGroups } from '@worktree/core/group-summary';
import type { WorkRow } from '@worktree/core/types';
export function summarizeEpics(rows: WorkRow[]) {
  const groups = summarizeGroups(rows);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const blocked = new Map<string, number>();
  for (const row of rows) {
    if (row.type !== 'task' || row.status !== 'blocked') continue;
    const parent = byId.get(row.parent);
    const epic = parent?.epic ? parent : byId.get(parent?.parent ?? '-');
    if (epic?.epic) blocked.set(epic.id, (blocked.get(epic.id) ?? 0) + 1);
  }
  return rows
    .filter((row) => row.epic)
    .map((epic) => {
      const summary = groups.get(epic.id);
      const total = summary?.taskCount ?? 0,
        completed = summary?.completedTasks ?? 0;
      const target = epic.start !== '-' && epic.end !== '-';
      return {
        epic,
        total,
        completed,
        progress: total ? Math.round((completed / total) * 100) : 0,
        blocked: blocked.get(epic.id) ?? 0,
        start: target ? epic.start : (summary?.start ?? null),
        end: target ? epic.end : (summary?.end ?? null),
        target,
        missingDates: summary?.missingDates ?? 0,
      };
    });
}
