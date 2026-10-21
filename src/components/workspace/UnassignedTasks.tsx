import { messages } from '../../i18n/messages';
import { TaskCard } from './TaskCard';
import { TaskCountProgress } from './TaskCountProgress';
import type { ListProps } from './types';
export function UnassignedTasks({
  rows,
  visibleIds,
  onToggle,
  ...props
}: ListProps & {
  visibleIds: Set<string>;
  onToggle: () => void;
}) {
  const visible = rows.filter((row) => visibleIds.has(row.id));
  if (!visible.length) return null;
  return (
    <details className="group unassigned-tasks" open onToggle={onToggle}>
      <summary data-view-group="unassigned">
        {messages.unassignedMilestone}
        <TaskCountProgress
          completed={rows.filter((row) => row.status === 'done').length}
          total={rows.length}
        />
      </summary>
      <div className="children">
        {visible.map((row) => (
          <TaskCard key={row.id} row={row} {...props} selected={props.selectedId === row.id} />
        ))}
      </div>
    </details>
  );
}
