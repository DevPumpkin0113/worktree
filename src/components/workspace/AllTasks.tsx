import { STATUS_NAMES } from '../../app/types';
import type { ListProps } from './types';
export function AllTasks(props: ListProps) {
  return (
    <div className="all-tasks">
      <table>
        <thead>
          <tr>
            {['작업', '상태', '담당자', '종료일'].map((name) => (
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
                  {row.type === 'milestone' ? (
                    <span className="all-task-type">마일스톤</span>
                  ) : null}
                </button>
              </td>
              <td>
                <span className={'tag ' + row.status}>{STATUS_NAMES[row.status]}</span>
              </td>
              <td>{row.owner === '-' ? '담당 미정' : row.owner}</td>
              <td>{row.end === '-' ? '미정' : row.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
