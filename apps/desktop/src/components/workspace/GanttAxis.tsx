import { messages } from '../../i18n/messages';
import {
  DAY_MS,
  dateString,
  isoWeek,
  type GanttGeometry,
  type GanttUnit,
  type ganttTicks,
} from '../../views/gantt-timeline';
export function GanttAxis({
  geometry,
  ticks,
  unit,
  todayX,
  today,
}: {
  geometry: GanttGeometry;
  ticks: ReturnType<typeof ganttTicks>;
  unit: GanttUnit;
  todayX: number;
  today: string;
}) {
  const months: { key: string; x: number; end: number }[] = [];
  for (const tick of ticks) {
    const key = dateString(tick.time).slice(0, 7);
    const previous = months.at(-1);
    const x = Math.max(0, tick.x),
      end = Math.min(geometry.timelineWidth, tick.x + tick.width);
    if (previous?.key === key) previous.end = end;
    else months.push({ key, x, end });
  }
  return (
    <svg width={geometry.timelineWidth} height={48} role="img" aria-label={messages.dateAxis}>
      {months.map((month) => (
        <text
          key={month.key}
          x={(month.x + month.end) / 2}
          y={14}
          textAnchor="middle"
          className="gantt-month-label"
        >
          {month.key.replace('-', '.')}
        </text>
      ))}
      <path d={`M0 21h${geometry.timelineWidth}`} className="date-grid" />
      {ticks.map((tick) => {
        const date = dateString(tick.time);
        const week = isoWeek(tick.time);
        const text =
          unit === 'week'
            ? messages.ganttWeekLabel(week.week)
            : geometry.dayWidth < 38
              ? String(new Date(tick.time).getUTCDate())
              : date.slice(5).replace('-', '/');
        return (
          <g key={tick.time}>
            <path d={`M${tick.x} 0v48`} className="date-grid" />
            <text x={tick.x + tick.width / 2} y={38} textAnchor="middle" className="date-label">
              <title>
                {unit === 'week'
                  ? `${week.year} · ${text} · ${date} ~ ${dateString(tick.time + 6 * DAY_MS)}`
                  : date}
              </title>
              {text}
            </text>
          </g>
        );
      })}
      {todayX >= 0 && todayX <= geometry.timelineWidth ? (
        <path d={`M${todayX} 0v48`} className="today-line">
          <title>{messages.todayPrefix + today}</title>
        </path>
      ) : null}
    </svg>
  );
}
