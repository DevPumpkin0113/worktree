import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { STATUS_NAMES, type WorkRow } from '../../app/types';
import { messages } from '../../i18n/messages';
import { ganttBar, type GanttGeometry, type ganttTicks } from '../../views/gantt-timeline';
export function GanttTaskRow({
  row,
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
  geometry: GanttGeometry;
  ticks: ReturnType<typeof ganttTicks>;
  start: number;
  todayX: number;
  today: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { date } = useProjectDates();
  const bar = ganttBar(row, start, geometry);
  return (
    <tr>
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
          data-id={row.id}
          aria-current={selected ? 'true' : undefined}
          title={row.name}
          onClick={onSelect}
        >
          <span className="id">{label}</span>
          <span>{row.name}</span>
        </button>
      </th>
      <td>
        <svg
          width={geometry.timelineWidth}
          height={48}
          data-id={row.id}
          className={'timeline-row' + (selected ? ' detail-selected' : '')}
          role="button"
          tabIndex={0}
          aria-label={`${row.name} ${date(row.start)} ~ ${date(row.end)}`}
          aria-current={selected ? 'true' : undefined}
          onClick={onSelect}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect();
            }
          }}
        >
          <title>{`${row.name} · ${date(row.start)} ~ ${date(row.end)} · ${STATUS_NAMES[row.status]}`}</title>
          {ticks.map((tick) => (
            <path key={tick.time} d={`M${tick.x} 0v48`} className="date-grid" />
          ))}
          {bar ? (
            <rect
              x={bar.x}
              y={14}
              width={bar.width}
              height={20}
              rx={4}
              className={'schedule-bar state-' + row.status}
            />
          ) : null}
          {todayX >= 0 && todayX <= geometry.timelineWidth ? (
            <path d={`M${todayX} 0v48`} className="today-line">
              <title>{messages.todayPrefix + today}</title>
            </path>
          ) : null}
        </svg>
      </td>
    </tr>
  );
}
