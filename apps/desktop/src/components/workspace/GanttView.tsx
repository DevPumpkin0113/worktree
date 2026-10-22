import { useContext } from 'react';
import { ProjectPriorityContext, priorityStyle } from '../../app/project-priority-context';
import { useMemo, useRef } from 'react';
import { messages } from '../../i18n/messages';
import { FilterDropdown } from '../shared/FilterDropdown';
import {
  DAY_MS,
  dateString,
  ganttTicks,
  seoulToday,
  timelineRange,
  type GanttUnit,
} from '../../views/gantt-timeline';
import { useChartPan } from '../../hooks/use-chart-pan';
import { useGanttViewport } from './use-gantt-viewport';
import { GanttAxis } from './GanttAxis';
import { GanttTaskRow } from './GanttTaskRow';
import type { ListProps } from './types';
export function GanttView({
  rows,
  rangeRows,
  label,
  selectedId,
  onSelect,
  unit,
  onUnit,
  onScroll,
  today = seoulToday(),
}: ListProps & {
  rangeRows: ListProps['rows'];
  unit: GanttUnit;
  onUnit: (unit: GanttUnit) => void;
  onScroll: () => void;
  today?: string;
}) {
  const priorities = useContext(ProjectPriorityContext);
  const root = useRef<HTMLDivElement>(null);
  const consumeClick = useChartPan(root);
  const known = useMemo(() => rows.filter((row) => row.start !== '-'), [rows]);
  const unknown = useMemo(() => rows.filter((row) => row.start === '-'), [rows]);
  const range = useMemo(
    () => (known.length ? timelineRange(rangeRows, unit, today) : null),
    [known.length, rangeRows, unit, today],
  );
  const { scroller, geometry, start, updateScroll, scrollbarWidth } = useGanttViewport(
    range,
    unit,
    today,
  );
  const ticks = geometry ? ganttTicks(start, unit, geometry) : [];
  const todayX = geometry
    ? ((Date.parse(today) - start) / DAY_MS) * geometry.dayWidth + geometry.dayWidth / 2
    : 0;
  function select(id: string) {
    if (!consumeClick()) onSelect(id);
  }
  return (
    <div ref={root} className="gantt-view">
      <div className="schedule-toolbar">
        <div>
          <strong>{messages.gantt}</strong>
          <span className="sub">
            {messages.ganttScheduledPrefix}
            {known.length}
            {messages.ganttUnknownPrefix}
            {unknown.length}
          </span>
        </div>
        <FilterDropdown
          id="ganttUnit"
          label={messages.ganttDateAxis}
          value={unit}
          options={[
            { value: 'day', label: messages.dayUnit },
            { value: 'week', label: messages.weekUnit },
          ]}
          onChange={(value) => onUnit(value as GanttUnit)}
        />
      </div>
      {range && geometry ? (
        <>
          <p className="sub">
            {dateString(start)} ~ {dateString(start + geometry.windowDays * DAY_MS - 1)}
            {messages.ganttRangeHint}
          </p>
          <div className="chart-scroll-frame gantt-frame">
            <div className="gantt-fixed-heading">
              <div className="gantt-heading-viewport" style={{ marginRight: scrollbarWidth }}>
                <table className="gantt-table" style={{ width: geometry.viewportWidth }}>
                  <colgroup>
                    <col style={{ width: geometry.labelWidth }} />
                    <col style={{ width: geometry.timelineWidth }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        style={{
                          width: geometry.labelWidth,
                          minWidth: geometry.labelWidth,
                          maxWidth: geometry.labelWidth,
                        }}
                      >
                        {messages.workList}
                      </th>
                      <th scope="col">
                        <GanttAxis
                          geometry={geometry}
                          ticks={ticks}
                          unit={unit}
                          todayX={todayX}
                          today={today}
                        />
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
            <div
              className="gantt-scroll"
              ref={scroller}
              tabIndex={0}
              aria-label={messages.ganttScrollLabel}
              data-visible-days={geometry.windowDays}
              data-window-start={start}
              data-initial-scroll-left={geometry.initialScroll}
              onScroll={() => {
                updateScroll();
                onScroll();
              }}
            >
              <div className="gantt-canvas" style={{ width: geometry.canvasWidth }}>
                <table
                  className="gantt-table gantt-viewport-table"
                  aria-label={messages.workList}
                  style={{ width: geometry.viewportWidth }}
                >
                  <colgroup>
                    <col style={{ width: geometry.labelWidth }} />
                    <col style={{ width: geometry.timelineWidth }} />
                  </colgroup>

                  <tbody>
                    {known.map((row) => (
                      <GanttTaskRow
                        key={row.id}
                        row={row}
                        geometry={geometry}
                        ticks={ticks}
                        start={start}
                        todayX={todayX}
                        today={today}
                        label={label(row.id)}
                        selected={row.id === selectedId}
                        onSelect={() => select(row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty">{messages.ganttEmpty}</div>
      )}
      {unknown.length ? (
        <details className="unscheduled" open>
          <summary>
            {messages.unscheduledPrefix}
            {unknown.length}
            {messages.countSuffix}
          </summary>
          <div className="unscheduled-list">
            {unknown.map((row) => (
              <button
                type="button"
                key={row.id}
                style={priorityStyle(row.priority ?? '-', priorities)}
                data-id={row.id}
                className={selectedId === row.id ? 'detail-selected' : undefined}
                aria-current={selectedId === row.id ? 'true' : undefined}
                onClick={() => select(row.id)}
              >
                <span className="id">{label(row.id)}</span> {row.name}
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
