import { TaskTypeBadge } from '../shared/TaskTypeBadge';
import { messages } from '../../i18n/messages';
import { PriorityBadge } from './PriorityBadge';
import type { WorkRow } from '../../domain/types';
export function TaskMetadata({
  row,
  priorities,
}: {
  row: WorkRow;
  priorities?: import('../../domain/project-priorities').ProjectPriority[];
}) {
  return (
    <>
      {!row.milestone ? (
        <div className="detail-facts">
          <div className="detail-fact">
            <span>{messages.priority}</span>
            <strong>
              <PriorityBadge value={row.priority ?? '-'} priorities={priorities} />
            </strong>
          </div>
          <div className="detail-fact">
            <span>{messages.taskType}</span>
            <strong>
              <TaskTypeBadge type={row.taskType ?? 'task'} />
            </strong>
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
    </>
  );
}
