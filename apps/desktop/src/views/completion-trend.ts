import type { WorkRow } from '../app/types';
import { DAY_MS, dateString } from './gantt-timeline';

export const MAX_COMPLETION_DAYS = 366;
export function completionTrend(rows: WorkRow[], from: string, to: string) {
  const start = Date.parse(from),
    end = Date.parse(to);
  const valid = (value: string, time: number) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && dateString(time) === value;
  const length = Math.round((end - start) / DAY_MS) + 1;
  if (!valid(from, start) || !valid(to, end) || length < 1 || length > MAX_COMPLETION_DAYS)
    return null;
  const days = Array.from({ length }, (_, index) => ({
    date: dateString(start + index * DAY_MS),
    count: 0,
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  let unknown = 0;
  for (const row of rows) {
    if (row.type !== 'task' || row.status !== 'done') continue;
    if (!row.completedAt) {
      unknown++;
      continue;
    }
    const key = new Date(row.completedAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const day = byDate.get(key);
    if (day) day.count++;
  }
  return { days, unknown, total: days.reduce((sum, day) => sum + day.count, 0) };
}
