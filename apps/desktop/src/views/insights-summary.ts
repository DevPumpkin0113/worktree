import { summarizeGroups } from '@worktree/core/group-summary';
import type { Status, WorkRow } from '../app/types';

export const INSIGHT_STATUSES: Status[] = ['todo', 'doing', 'blocked', 'done'];

export function summarizeInsights(rows: WorkRow[]) {
  const tasks = rows.filter((row) => row.type === 'task');
  const statuses = INSIGHT_STATUSES.map((status) => ({
    status,
    count: tasks.filter((row) => row.status === status).length,
  }));
  const owners = new Map<
    string,
    { owner: string; total: number; completed: number; blocked: number }
  >();
  for (const row of tasks) {
    const entry = owners.get(row.owner) ?? { owner: row.owner, total: 0, completed: 0, blocked: 0 };
    entry.total++;
    if (row.status === 'done') entry.completed++;
    if (row.status === 'blocked') entry.blocked++;
    owners.set(row.owner, entry);
  }
  const groups = summarizeGroups(rows);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const unassigned = tasks.filter((row) => {
    const parent = byId.get(row.parent);
    return !parent?.epic && !byId.get(parent?.parent ?? '-')?.epic;
  });
  const epics = rows
    .filter((row) => row.epic)
    .map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      iconColor: row.iconColor,
      unassigned: false,
      total: groups.get(row.id)?.taskCount ?? 0,
      completed: groups.get(row.id)?.completedTasks ?? 0,
    }));
  if (unassigned.length)
    epics.push({
      id: '-',
      name: '',
      icon: undefined,
      iconColor: undefined,
      unassigned: true,
      total: unassigned.length,
      completed: unassigned.filter((row) => row.status === 'done').length,
    });
  return {
    total: tasks.length,
    statuses,
    owners: [...owners.values()].sort(
      (a, b) => b.total - a.total || a.owner.localeCompare(b.owner),
    ),
    epics,
  };
}
