import type { WorkRow } from '../../domain/types';
import { messages } from '../../i18n/messages';

export function TaskContentMetadata({ row }: { row: WorkRow }) {
  return (
    <>
      <section
        className={'detail-section' + (row.status !== 'blocked' ? ' detail-section-disabled' : '')}
        aria-disabled={row.status !== 'blocked'}
      >
        <h3>{messages.blockedReason}</h3>
        <p
          className={
            'detail-description ' + (row.blockedReason ? 'detail-blocked' : 'detail-empty')
          }
        >
          {row.blockedReason || messages.none}
        </p>
      </section>
      <section className="detail-section">
        <h3>{messages.references}</h3>
        {row.references?.length ? (
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
        ) : (
          <p className="detail-empty">{messages.none}</p>
        )}
      </section>
    </>
  );
}
