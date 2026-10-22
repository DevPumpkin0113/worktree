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
  return (
    <svg width={geometry.timelineWidth} height={48} role="img" aria-label={messages.dateAxis}>
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
            <text x={tick.x + tick.width / 2} y={28} textAnchor="middle" className="date-label">
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
