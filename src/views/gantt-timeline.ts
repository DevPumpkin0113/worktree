import type { WorkRow } from '../domain/types';
export const DAY_MS = 86_400_000;
export const MAX_GANTT_SCROLL = 18_000;
export type GanttUnit = 'day' | 'week';
export const dateString = (time: number) => new Date(time).toISOString().split('T')[0];
export const seoulToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
export const visibleDays = (unit: GanttUnit) => (unit === 'day' ? 7 : 35);
export function monday(time: number) {
  return time - ((new Date(time).getUTCDay() + 6) % 7) * DAY_MS;
}
export function isoWeek(time: number) {
  const start = monday(time);
  const thursday = new Date(start + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  thursday.setUTCMonth(0, 4);
  const first = monday(thursday.getTime());
  return { year, week: Math.round((start - first) / (7 * DAY_MS)) + 1 };
}
export function initialWindowStart(today: string, unit: GanttUnit) {
  const time = Date.parse(today);
  return unit === 'day' ? time - 3 * DAY_MS : monday(time) - 14 * DAY_MS;
}
export function timelineRange(rows: WorkRow[], unit: GanttUnit = 'day', today = seoulToday()) {
  const scheduled = rows.filter((row) => row.start !== '-' && row.end !== '-');
  if (!scheduled.length) return null;
  const first = initialWindowStart(today, unit);
  let start = Math.min(first, ...scheduled.map((row) => Date.parse(row.start)));
  let end = Math.max(
    first + (visibleDays(unit) - 1) * DAY_MS,
    ...scheduled.map((row) => Date.parse(row.end)),
  );
  if (unit === 'week') {
    start = monday(start);
    end = monday(end) + 6 * DAY_MS;
  }
  return { start, end, days: Math.round((end - start) / DAY_MS) + 1 };
}
export type TimelineRange = NonNullable<ReturnType<typeof timelineRange>>;
export function ganttGeometry(range: TimelineRange, unit: GanttUnit, width: number, today: string) {
  const viewportWidth = Math.max(1, width);
  const labelWidth = Math.min(
    240,
    Math.max(80, Math.floor(viewportWidth * 0.3)),
    viewportWidth * 0.5,
  );
  const timelineWidth = viewportWidth - labelWidth;
  const windowDays = visibleDays(unit);
  const dayWidth = timelineWidth / windowDays;
  const maxStart = range.end - (windowDays - 1) * DAY_MS;
  const maxScroll = Math.min(MAX_GANTT_SCROLL, Math.ceil((range.days - windowDays) * dayWidth));
  const scrollForDate = (time: number) =>
    maxStart > range.start
      ? Math.max(0, Math.min(1, (time - range.start) / (maxStart - range.start))) * maxScroll
      : 0;
  const dateForScroll = (scroll: number) =>
    Math.round(
      range.start +
        (maxScroll ? Math.max(0, Math.min(1, scroll / maxScroll)) * (maxStart - range.start) : 0),
    );
  return {
    viewportWidth,
    labelWidth,
    timelineWidth,
    windowDays,
    dayWidth,
    maxScroll,
    canvasWidth: viewportWidth + maxScroll,
    initialScroll: scrollForDate(initialWindowStart(today, unit)),
    scrollForDate,
    dateForScroll,
  };
}
export type GanttGeometry = ReturnType<typeof ganttGeometry>;
export function ganttTicks(start: number, unit: GanttUnit, geometry: GanttGeometry) {
  const step = unit === 'day' ? 1 : 7;
  const first =
    unit === 'day'
      ? Math.floor(start / DAY_MS) * DAY_MS
      : monday(Math.floor(start / DAY_MS) * DAY_MS);
  const end = start + geometry.windowDays * DAY_MS;
  const ticks = [];
  for (let time = first; time < end; time += step * DAY_MS) {
    ticks.push({
      time,
      x: ((time - start) / DAY_MS) * geometry.dayWidth,
      width: step * geometry.dayWidth,
    });
  }
  return ticks;
}
export function ganttBar(row: WorkRow, start: number, geometry: GanttGeometry) {
  const x = ((Date.parse(row.start) - start) / DAY_MS) * geometry.dayWidth;
  const end = ((Date.parse(row.end) + DAY_MS - start) / DAY_MS) * geometry.dayWidth;
  const left = Math.max(0, x);
  const right = Math.min(geometry.timelineWidth, end);
  return right > left ? { x: left, width: right - left } : null;
}
