import { STATUS_NAMES, TYPE_NAMES, type WorkRow } from '../../app/types';
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
        {row.type === 'milestone' ? <span aria-hidden="true">◇ </span> : null}
        {row.name}
        <div className="sub">
          <span className={'work-type-badge work-type-' + row.type}>
            {TYPE_NAMES[row.type] === '작업 그룹' ? '그룹' : TYPE_NAMES[row.type]}
          </span>{' '}
          · {row.owner === '-' ? '담당 미정' : row.owner}
        </div>
      </div>
      <span className={'tag ' + row.status}>{STATUS_NAMES[row.status]}</span>
    </div>
  );
}
