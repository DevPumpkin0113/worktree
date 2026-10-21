import type { WorkRow } from './types';
export function workOwners(rows: WorkRow[]) {
  return [...new Set(rows.filter((row) => row.type !== 'group').map((row) => row.owner))].sort(
    (a, b) => (a === '-' ? -1 : b === '-' ? 1 : a.localeCompare(b, 'ko')),
  );
}

export function matchesWork(
  row: WorkRow,
  {
    query = '',
    status = 'all',
    owner = 'all',
  }: { query?: string; status?: string; owner?: string },
  label: (id: string) => string = (id) => id,
) {
  const text = [
    row.id,
    label(row.id),
    row.name,
    row.owner,
    row.description,
    row.taskType,
    ...(row.labels ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return (
    text.includes(query.trim().toLowerCase()) &&
    (status === 'all' || row.status === status) &&
    (!owner || owner === 'all' || owner === 'owner:' + row.owner)
  );
}
