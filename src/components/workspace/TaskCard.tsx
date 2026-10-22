import { usePriorityStyle } from '../../app/project-priority-context';
import { TaskTypeBadge } from '../shared/TaskTypeBadge';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type WorkRow } from '../../app/types';
export function TaskCard({
  row,
  label,
  onSelect,
  selected,
  kanban = false,
}: {
  row: WorkRow;
  label: (id: string) => string;
  onSelect: (id: string) => void;
  selected: boolean;
  kanban?: boolean;
}) {
  const priorityStyle = usePriorityStyle(row.priority ?? '-');
  return (
    <div
      className={'task' + (selected ? ' detail-selected' : '')}
      style={priorityStyle}
      tabIndex={0}
      role="button"
      data-id={row.id}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(row.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(row.id);
        }
      }}
    >
      {kanban ? (
        <div className="task-card-heading">
          <span className="id">{label(row.id)}</span>
          <TaskTypeBadge type={row.taskType ?? 'task'} />
        </div>
      ) : (
        <span className="id">{label(row.id)}</span>
      )}
      <div>
        {row.name}
        <div className="sub">
          {!kanban ? (
            <>
              <TaskTypeBadge type={row.taskType ?? 'task'} /> ·{' '}
            </>
          ) : null}
          {row.owner === '-' ? messages.unassigned : row.owner}
        </div>
      </div>
      {!kanban ? <span className={'tag ' + row.status}>{STATUS_NAMES[row.status]}</span> : null}
    </div>
  );
}
