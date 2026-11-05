import type { WorkRow } from '@worktree/core/types';
import { messages } from '../../i18n/messages';
import { TaskReferenceList } from './TaskReferenceList';

export function TaskContentMetadata({ row, project }: { row: WorkRow; project?: string | null }) {
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
          <TaskReferenceList key={row.id} references={row.references} project={project} />
        ) : (
          <p className="detail-empty">{messages.none}</p>
        )}
      </section>
    </>
  );
}
