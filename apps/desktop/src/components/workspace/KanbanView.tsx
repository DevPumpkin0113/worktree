import { STATUS_NAMES } from '../../app/types';
import type { ListProps } from './types';
import { TaskCard } from './TaskCard';
export function KanbanView(props: ListProps) {
  return (
    <div className="lanes kanban-view">
      {Object.entries(STATUS_NAMES).map(([status, name]) => {
        const rows = props.rows.filter((row) => row.status === status);
        return (
          <section
            className="lane"
            key={status}
            data-status={status}
            aria-labelledby={'kanban-heading-' + status}
          >
            <h3 className="lane-heading" id={'kanban-heading-' + status}>
              <span>{name}</span>
              <span className="lane-count">{rows.length}</span>
            </h3>
            {rows.map((row) => (
              <TaskCard
                kanban
                key={row.id}
                row={row}
                {...props}
                selected={props.selectedId === row.id}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
