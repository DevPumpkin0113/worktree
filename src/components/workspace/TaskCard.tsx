import { TaskTypeBadge } from '../shared/TaskTypeBadge';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type WorkRow } from '../../app/types';
export function TaskCard({
  row,
  label,
  onSelect,
  selected,
}: {
  row: WorkRow;
  label: (id: string) => string;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  return (
    <div
      className={'task' + (selected ? ' detail-selected' : '')}
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
      <span className="id">{label(row.id)}</span>
      <div>
        {row.name}
        <div className="sub">
          <TaskTypeBadge type={row.taskType ?? 'task'} /> ·{' '}
          {row.owner === '-' ? messages.unassigned : row.owner}
        </div>
      </div>
      <span className={'tag ' + row.status}>{STATUS_NAMES[row.status]}</span>
    </div>
  );
}
