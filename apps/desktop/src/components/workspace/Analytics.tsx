import { useMemo } from 'react';
import { messages } from '../../i18n/messages';
import { summarizeInsights } from '../../views/insights-summary';
import { Metrics } from './Metrics';
import { CompletionTrend } from './CompletionTrend';
import { WorkGroupIcon } from '../shared/WorkGroupIcon';
import { STATUS_NAMES, type WorkModel } from '../../app/types';

function Completion({
  name,
  completed,
  total,
}: {
  name: string;
  completed: number;
  total: number;
}) {
  return (
    <div className="insight-completion">
      <span>
        {completed}/{total}
      </span>
      <progress
        max={total || 1}
        value={completed}
        aria-label={name + ' · ' + messages.completedTotal}
      />
      <small>{total ? Math.round((completed / total) * 100) + '%' : '—'}</small>
    </div>
  );
}

export function Analytics({ model }: { model: WorkModel | null }) {
  const summary = useMemo(() => summarizeInsights(model?.rows ?? []), [model?.rows]);
  if (!model) return <p className="empty">{messages.insightsEmpty}</p>;
  return (
    <div className="analytics-view">
      <Metrics rows={model.rows} useEffort={model.useEffort} />
      <div className="analytics-grid">
        <CompletionTrend rows={model.rows} />
        <section className="analytics-card" aria-labelledby="insight-status-title">
          <h3 id="insight-status-title">{messages.workStatus}</h3>
          <div className="insight-status-bar" aria-hidden="true">
            {summary.statuses.map(({ status, count }) => (
              <span
                key={status}
                style={{ flex: count, background: `var(--color-chart-${status})` }}
              />
            ))}
          </div>
          <dl className="insight-status-list">
            {summary.statuses.map(({ status, count }) => (
              <div key={status} data-insight-status={status}>
                <dt>
                  <i style={{ background: `var(--color-chart-${status})` }} />
                  {STATUS_NAMES[status]}
                </dt>
                <dd>
                  <strong>{count}</strong>
                  <small>{summary.total ? Math.round((count / summary.total) * 100) : 0}%</small>
                </dd>
              </div>
            ))}
          </dl>
          {!summary.total ? <p className="insight-empty">{messages.noTasks}</p> : null}
        </section>
        <section className="analytics-card" aria-labelledby="insight-owner-title">
          <div className="insight-card-heading">
            <h3 id="insight-owner-title">{messages.teamDistribution}</h3>
            <small>{messages.completedTotal}</small>
          </div>
          <div className="insight-list">
            {summary.owners.map(({ owner, total, completed, blocked }) => (
              <div className="insight-row" key={owner} data-insight-owner={owner}>
                <div className="insight-name">
                  <span title={owner === '-' ? messages.unassigned : owner}>
                    {owner === '-' ? messages.unassigned : owner}
                  </span>
                  {blocked ? (
                    <small className="insight-blocked">
                      {STATUS_NAMES.blocked} {blocked}
                    </small>
                  ) : null}
                </div>
                <Completion
                  name={owner === '-' ? messages.unassigned : owner}
                  total={total}
                  completed={completed}
                />
              </div>
            ))}
            {!summary.owners.length ? <p className="insight-empty">{messages.noTasks}</p> : null}
          </div>
        </section>
        <section className="analytics-card insight-epics" aria-labelledby="insight-epic-title">
          <div className="insight-card-heading">
            <h3 id="insight-epic-title">{messages.epicProgressOverview}</h3>
            <small>{messages.completedTotal}</small>
          </div>
          <div className="insight-list">
            {summary.epics.map(({ id, name, icon, iconColor, unassigned, total, completed }) => (
              <div className="insight-row" key={id} data-insight-epic={id}>
                <div className="insight-name">
                  <WorkGroupIcon epic icon={icon} iconColor={iconColor} />
                  <span title={unassigned ? messages.unassignedEpic : name}>
                    {unassigned ? messages.unassignedEpic : name}
                  </span>
                </div>
                <Completion
                  name={unassigned ? messages.unassignedEpic : name}
                  total={total}
                  completed={completed}
                />
              </div>
            ))}
            {!summary.epics.length ? (
              <p className="insight-empty">{messages.noInsightEpics}</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
