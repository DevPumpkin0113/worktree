import { useContext } from 'react';
import { ProjectPriorityContext, priorityStyle } from '../../app/project-priority-context';
import { TaskTypeBadge } from '../shared/TaskTypeBadge';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES } from '../../app/types';
import type { ListProps } from './types';
export function AllTasks(props: ListProps) {
  const priorities = useContext(ProjectPriorityContext);
  const { date } = useProjectDates();
  return (
    <div className="all-tasks">
      <table>
        <thead>
          <tr>
            {[
              messages.taskIdColumn,
              messages.taskTitleColumn,
              messages.taskTypeColumn,
              messages.status,
              messages.owner,
              messages.endDate,
            ].map((name) => (
              <th scope="col" key={name}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr
              key={row.id}
              className={'all-task-row' + (props.selectedId === row.id ? ' detail-selected' : '')}
              data-id={row.id}
              tabIndex={0}
              aria-label={props.label(row.id) + ' · ' + row.name}
              aria-selected={props.selectedId === row.id}
              onClick={() => props.onSelect(row.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  props.onSelect(row.id);
                }
              }}
            >
              <td className="all-task-id" style={priorityStyle(row.priority ?? '-', priorities)}>
                <span className="id">{props.label(row.id)}</span>
              </td>
              <td className="all-task-title">{row.name}</td>
              <td>
                <TaskTypeBadge type={row.taskType ?? 'task'} />
              </td>
              <td>
                <span className={'tag ' + row.status}>{STATUS_NAMES[row.status]}</span>
              </td>
              <td>{row.owner === '-' ? messages.unassigned : row.owner}</td>
              <td>{row.end === '-' ? messages.unknown : date(row.end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
