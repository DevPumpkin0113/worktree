import type { DateFormat, TimeFormat } from '@worktree/core/project-display';
export {
  DATE_FORMATS,
  TIME_FORMATS,
  type DateFormat,
  type TimeFormat,
} from '@worktree/core/project-display';
export function formatProjectDate(value: string, format: DateFormat = 'yyyy-MM-dd') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return format.replace('yyyy', match[1]).replace('MM', match[2]).replace('dd', match[3]);
}
export function formatProjectTimestamp(
  value: string | undefined,
  dateFormat: DateFormat = 'yyyy-MM-dd',
  timeFormat: TimeFormat = '24h',
  locale = 'ko',
) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: timeFormat === '24h' ? 'h23' : 'h12',
  }).format(date);
  return formatProjectDate(local, dateFormat) + ' ' + time;
}
