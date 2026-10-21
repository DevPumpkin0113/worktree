import { TaskTypeBadge } from '../shared/TaskTypeBadge';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES } from '../../app/types';
import type { ListProps } from './types';
export function AllTasks(props: ListProps) {
  const { date } = useProjectDates();
  return (
    <div className="all-tasks">
      <table>
        <thead>
          <tr>
            {[messages.task, messages.status, messages.owner, messages.endDate].map((name) => (
              <th scope="col" key={name}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button
                  type="button"
                  className={
                    'all-task-link' + (props.selectedId === row.id ? ' detail-selected' : '')
                  }
                  data-id={row.id}
                  onClick={() => props.onSelect(row.id)}
                >
                  <span className="id">{props.label(row.id)}</span>
                  <span>{row.name}</span>
                  <TaskTypeBadge type={row.taskType ?? 'task'} />
                </button>
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
