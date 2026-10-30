import { useMemo, useRef } from 'react';
import { messages } from '../../i18n/messages';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { FilterDropdown } from '../shared/FilterDropdown';
import {
  DAY_MS,
  dateString,
  ganttTicks,
  seoulToday,
  timelineRange,
  initialWindowStart,
  visibleDays,
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
  const { date } = useProjectDates();
  const root = useRef<HTMLDivElement>(null);
  const consumeClick = useChartPan(root);
  const known = useMemo(
    () =>
      rows
        .filter((row) => row.start !== '-' && row.end !== '-')
        .sort((a, b) => b.start.localeCompare(a.start) || b.end.localeCompare(a.end)),
    [rows],
  );
  const unknown = useMemo(() => rows.filter((row) => row.start === '-' || row.end === '-'), [rows]);
  const range = useMemo(() => {
    if (!rows.length) return null;
    const scheduledRange = timelineRange(rangeRows, unit, today);
    if (scheduledRange) return scheduledRange;
    const start = initialWindowStart(today, unit),
      days = visibleDays(unit);
    return { start, end: start + (days - 1) * DAY_MS, days };
  }, [rows.length, rangeRows, unit, today]);
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
      <div className="schedule-toolbar gantt-toolbar">
        <div>
          <strong title={messages.ganttRangeHint}>
            {range && geometry
              ? `${date(dateString(start))} ~ ${date(dateString(start + geometry.windowDays * DAY_MS - 1))}`
              : messages.gantt}
          </strong>
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
                    {[...known, ...unknown].map((row, index) => (
                      <GanttTaskRow
                        key={row.id}
                        row={row}
                        unscheduledStart={index === known.length && known.length > 0}
                        unit={unit}
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
    </div>
  );
}
