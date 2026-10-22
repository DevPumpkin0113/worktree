import { TaskTypeBadge } from '../shared/TaskTypeBadge';
import { messages } from '../../i18n/messages';
import { PriorityBadge } from './PriorityBadge';
import type { WorkRow } from '@worktree/core/types';
import type { ReactNode } from 'react';
import { STATUS_NAMES } from '../../app/types';
import { Badge } from '../shared/Badge';
export function TaskMetadata({
  row,
  priorities,
  useEffort,
  milestone,
}: {
  row: WorkRow;
  priorities?: import('@worktree/core/project-priorities').ProjectPriority[];
  useEffort: boolean;
  milestone: ReactNode;
}) {
  return (
    <>
      {!row.milestone ? (
        <div className="detail-facts">
          <div className="detail-fact">
            <span>{messages.parentMilestone}</span>
            <strong>{milestone}</strong>
          </div>
          <div className="detail-fact">
            <span>{messages.owner}</span>
            <strong>
              {!row.owner || row.owner === '-' ? messages.unassignedAssignee : row.owner}
            </strong>
          </div>
          <div className="detail-fact">
            <span>{messages.status}</span>
            <strong>{STATUS_NAMES[row.status]}</strong>
          </div>
          <div className="detail-fact">
            <span>{messages.priority}</span>
            <strong>
              <PriorityBadge value={row.priority || '-'} priorities={priorities} />
            </strong>
          </div>
          <div className="detail-fact">
            <span>{messages.taskType}</span>
            <strong>
              <TaskTypeBadge type={row.taskType ?? 'task'} />
            </strong>
          </div>
          <div className="detail-fact">
            <span>{messages.labels}</span>
            <strong className="detail-label-badges">
              {row.labels?.length
                ? row.labels.map((label) => <Badge key={label} label={label} />)
                : messages.none}
            </strong>
          </div>
          {useEffort ? (
            <div className="detail-fact">
              <span>{messages.effort}</span>
              <strong>{row.effort === '-' ? messages.unknown : row.effort + ' h'}</strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
