import type { WorkRow } from '@worktree/core/types';

export const UNASSIGNED_EPIC_GROUP = '@unassigned-epics';

export function treeGroupKeys(rows: WorkRow[]) {
  const keys = new Set(rows.filter((row) => row.type === 'group').map((row) => row.id));
  if (rows.some((row) => !row.epic && row.parent === '-')) keys.add(UNASSIGNED_EPIC_GROUP);
  return keys;
}
