import { useMemo } from 'react';
import { messages } from '../../i18n/messages';
import { summarizeEpics } from '../../views/epic-overview';
import { WorkGroupIcon } from '../shared/WorkGroupIcon';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { type WorkModel } from '../../app/types';

export function EpicOverview({
  model,
  label,
  onOpen,
  onAdd,
}: {
  model: WorkModel | null;
  label: (id: string) => string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const summaries = useMemo(() => summarizeEpics(model?.rows ?? []), [model?.rows]);
  const { date } = useProjectDates();
  function period(entry: (typeof summaries)[number]) {
    return entry?.start && entry.end
      ? date(entry.start) + ' ~ ' + date(entry.end)
      : messages.unscheduled;
  }
  if (!model) return <p className="empty">{messages.projectOpenPrompt}</p>;
  return (
    <div className="epic-overview">
      <div className="epic-overview-toolbar">
        <span>{messages.epicCount(summaries.length)}</span>
        <button type="button" className="action-button" data-variant="secondary" onClick={onAdd}>
          {messages.addEpic}
        </button>
      </div>
      {!summaries.length ? (
        <div className="epic-overview-empty">
          <p>{messages.epicsEmpty}</p>
          <button type="button" className="action-button" data-variant="primary" onClick={onAdd}>
            {messages.addEpic}
          </button>
        </div>
      ) : (
        <div className="epic-overview-layout">
          <div className="epic-overview-table-scroll">
            <table className="epic-overview-table">
              <thead>
                <tr>
                  <th>{messages.epic}</th>
                  <th>{messages.completedTotal}</th>
                  <th>{messages.progress}</th>
                  <th>{messages.targetPeriod}</th>
                  <th>{messages.blocked}</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((entry) => (
                  <tr
                    key={entry.epic.id}
                    data-epic-overview-row={entry.epic.id}
                    onClick={() => onOpen(entry.epic.id)}
                  >
                    <td>
                      <button type="button" className="epic-overview-select">
                        <WorkGroupIcon
                          epic
                          icon={entry.epic.icon}
                          iconColor={entry.epic.iconColor}
                        />
                        <span>
                          <strong>{entry.epic.name}</strong>
                          <small>{label(entry.epic.id)}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {entry.completed}/{entry.total}
                    </td>
                    <td>
                      <div className="epic-overview-progress">
                        <progress
                          value={entry.completed}
                          max={entry.total || 1}
                          aria-label={entry.epic.name + ' · ' + messages.progress}
                        />
                        <span>{entry.total ? entry.progress + '%' : '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="epic-overview-period">{period(entry)}</span>
                      {entry.start ? (
                        <small>
                          {entry.target
                            ? messages.epicTargetSchedule
                            : messages.epicAggregatedSchedule}
                          {!entry.target && entry.missingDates
                            ? ' · ' + messages.epicPartialSchedule
                            : ''}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      <span className={entry.blocked ? 'epic-blocked-count' : ''}>
                        {entry.blocked}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
