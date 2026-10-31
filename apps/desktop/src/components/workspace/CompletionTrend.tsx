import { useMemo, useState } from 'react';
import type { WorkRow } from '../../app/types';
import { completionTrend } from '../../views/completion-trend';
import { dateString, DAY_MS, seoulToday } from '../../views/gantt-timeline';
import { messages } from '../../i18n/messages';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { FilterDropdown } from '../shared/FilterDropdown';

export function CompletionTrend({ rows }: { rows: WorkRow[] }) {
  const today = seoulToday();
  const [period, setPeriod] = useState('7');
  const [customFrom, setFrom] = useState(dateString(Date.parse(today) - 29 * DAY_MS));
  const [customTo, setTo] = useState(today);
  const from =
    period === 'custom'
      ? customFrom
      : dateString(Date.parse(today) - (Number(period) - 1) * DAY_MS);
  const to = period === 'custom' ? customTo : today;
  const data = useMemo(() => completionTrend(rows, from, to), [rows, from, to]);
  const { date } = useProjectDates();
  const maximum = Math.max(1, ...(data?.days.map((day) => day.count) ?? []));
  return (
    <section className="analytics-card insight-trend" aria-labelledby="completion-trend-title">
      <div className="insight-card-heading">
        <h3 id="completion-trend-title">{messages.completionTrendTitle}</h3>
        <FilterDropdown
          id="completionPeriod"
          label={messages.completionPeriod}
          value={period}
          onChange={setPeriod}
          options={[
            { value: '7', label: messages.last7Days },
            { value: '30', label: messages.last30Days },
            { value: 'custom', label: messages.customPeriod },
          ]}
        />
      </div>
      {period === 'custom' ? (
        <div className="insight-date-range">
          <label>
            {messages.startDate}
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            {messages.endDate}
            <input type="date" value={customTo} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      ) : null}
      {data ? (
        <>
          <p className="insight-trend-summary">
            <strong>{data.total}</strong> {messages.completedInPeriod}{' '}
            <small>
              {date(from)} ~ {date(to)}
            </small>
          </p>
          <div className="insight-trend-scroll">
            <div className="insight-trend-bars" style={{ minWidth: data.days.length * 28 }}>
              {data.days.map((day, index) => (
                <div
                  className="insight-day"
                  key={day.date}
                  title={date(day.date) + ' · ' + day.count}
                  aria-label={date(day.date) + ' · ' + day.count}
                >
                  <div className="insight-day-track">
                    <span
                      className="insight-day-fill"
                      style={{ height: (day.count / maximum) * 100 + '%' }}
                    />
                    {day.count ? (
                      <span
                        className="insight-day-count"
                        style={{ bottom: `calc(${(day.count / maximum) * 100}% + 6px)` }}
                      >
                        {day.count}
                      </span>
                    ) : null}
                  </div>
                  <span className="insight-day-label">
                    {index % Math.ceil(data.days.length / 5) === 0 || index === data.days.length - 1
                      ? date(day.date)
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {!data.total ? <p className="insight-empty">{messages.noPeriodCompletions}</p> : null}
          {data.unknown ? (
            <p className="insight-empty">
              {messages.unknownCompletionDates} {data.unknown}
            </p>
          ) : null}
        </>
      ) : (
        <p className="task-editor-error" role="alert">
          {messages.invalidCompletionPeriod}
        </p>
      )}
      <small>{messages.completionTrendBasis}</small>
    </section>
  );
}
