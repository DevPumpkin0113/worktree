import { getLanguage, messages } from '../../i18n/messages';
import { priorityLabel, taskTypeLabel } from './task-labels';
import type { WorkRow } from '../../domain/types';
export function TaskMetadata({ row }: { row: WorkRow }) {
  const date = (value?: string) =>
    value
      ? new Intl.DateTimeFormat(getLanguage(), { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(value),
        )
      : '—';
  return (
    <>
      {!row.milestone ? (
        <div className="detail-facts">
          <div className="detail-fact">
            <span>{messages.priority}</span>
            <strong>{priorityLabel(row.priority ?? 'normal')}</strong>
          </div>
          <div className="detail-fact">
            <span>{messages.taskType}</span>
            <strong>{taskTypeLabel(row.taskType ?? 'task')}</strong>
          </div>
          {row.labels?.length ? (
            <div className="detail-fact">
              <span>{messages.labels}</span>
              <strong>{row.labels.join(' · ')}</strong>
            </div>
          ) : null}
        </div>
      ) : null}
      {!row.milestone && row.blockedReason ? (
        <section className="detail-section">
          <h3>{messages.blockedReason}</h3>
          <p className="detail-description detail-blocked">{row.blockedReason}</p>
        </section>
      ) : null}
      {!row.milestone && row.references?.length ? (
        <section className="detail-section">
          <h3>{messages.references}</h3>
          <ul>
            {row.references.map((reference, index) => (
              <li key={index} className="task-reference-value">
                <span>
                  {reference.type === 'file' ? messages.referenceFile : messages.referenceText}
                </span>{' '}
                {reference.value}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="detail-facts">
        <div className="detail-fact">
          <span>{messages.createdAt}</span>
          <strong title={row.createdAt}>{date(row.createdAt)}</strong>
        </div>
        <div className="detail-fact">
          <span>{messages.updatedAt}</span>
          <strong title={row.updatedAt}>{date(row.updatedAt)}</strong>
        </div>
      </div>
    </>
  );
}
