import { usePriorityStyle } from '../../app/project-priority-context';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { STATUS_NAMES, type WorkRow } from '../../app/types';
import { messages } from '../../i18n/messages';
import {
  ganttBar,
  type GanttGeometry,
  type GanttUnit,
  type ganttTicks,
} from '../../views/gantt-timeline';
const ROW_HEIGHT = 36;
const BAR_HEIGHT = 14;
export function GanttTaskRow({
  row,
  unscheduledStart,
  unit,
  geometry,
  ticks,
  start,
  todayX,
  today,
  label,
  selected,
  onSelect,
}: {
  row: WorkRow;
  unscheduledStart: boolean;
  unit: GanttUnit;
  geometry: GanttGeometry;
  ticks: ReturnType<typeof ganttTicks>;
  start: number;
  todayX: number;
  today: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const priorityStyle = usePriorityStyle(row.priority ?? '-');
  const { date } = useProjectDates();
  const scheduled = row.start !== '-' && row.end !== '-';
  const bar = scheduled ? ganttBar(row, start, geometry) : null;
  const scheduleLabel = scheduled
    ? `${date(row.start)} ~ ${date(row.end)}`
    : messages.ganttUnscheduled;
  return (
    <tr className={unscheduledStart ? 'gantt-unscheduled-start' : undefined}>
      <th
        scope="row"
        style={{
          width: geometry.labelWidth,
          minWidth: geometry.labelWidth,
          maxWidth: geometry.labelWidth,
        }}
      >
        <button
          type="button"
          className={'gantt-label' + (selected ? ' detail-selected' : '')}
          style={priorityStyle}
          data-id={row.id}
          aria-current={selected ? 'true' : undefined}
          title={row.name}
          onClick={onSelect}
        >
          <span
            className={'gantt-status state-' + row.status}
            title={STATUS_NAMES[row.status]}
            aria-label={STATUS_NAMES[row.status]}
          />
          <span className="id">{label}</span>
          <span>{row.name}</span>
        </button>
      </th>
      <td>
        <svg
          width={geometry.timelineWidth}
          height={ROW_HEIGHT}
          data-id={row.id}
          className={'timeline-row' + (selected ? ' detail-selected' : '')}
          role="button"
          tabIndex={0}
          aria-label={`${row.name} ${scheduleLabel}`}
          aria-current={selected ? 'true' : undefined}
          onClick={onSelect}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect();
            }
          }}
        >
          <title>{`${row.name} · ${scheduleLabel} · ${STATUS_NAMES[row.status]}`}</title>
          {unit === 'day'
            ? ticks
                .filter((tick) => [0, 6].includes(new Date(tick.time).getUTCDay()))
                .map((tick) => (
                  <rect
                    key={'weekend-' + tick.time}
                    x={tick.x}
                    y={0}
                    width={tick.width}
                    height={ROW_HEIGHT}
                    className="gantt-weekend"
                  />
                ))
            : null}
          {ticks.map((tick) => (
            <path key={tick.time} d={`M${tick.x} 0v${ROW_HEIGHT}`} className="date-grid" />
          ))}
          {bar ? (
            <rect
              x={bar.x}
              y={(ROW_HEIGHT - BAR_HEIGHT) / 2}
              width={bar.width}
              height={BAR_HEIGHT}
              rx={3}
              className={'schedule-bar state-' + row.status}
            />
          ) : null}
          {!scheduled ? (
            <text x={12} y={23} className="gantt-unscheduled-label">
              {messages.ganttUnscheduled}
            </text>
          ) : null}
          {todayX >= 0 && todayX <= geometry.timelineWidth ? (
            <path d={`M${todayX} 0v${ROW_HEIGHT}`} className="today-line">
              <title>{messages.todayPrefix + today}</title>
            </path>
          ) : null}
        </svg>
      </td>
    </tr>
  );
}
