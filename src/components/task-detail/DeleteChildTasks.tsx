import type { WorkRow } from '../../app/types';
import type { DeleteOptions } from '../../domain/task-deletion';
import { messages } from '../../i18n/messages';

export function DeleteChildTasks({
  rows,
  value,
  disabled,
  label,
  onChange,
}: {
  rows: WorkRow[];
  value: DeleteOptions['children'];
  disabled: boolean;
  label: (id: string) => string;
  onChange: (value: DeleteOptions['children']) => void;
}) {
  return (
    <fieldset className="delete-options" disabled={disabled}>
      <legend>{messages.deleteChildrenTitle(rows.length)}</legend>
      {(['keep', 'delete'] as const).map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="deleteChildren"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option === 'keep' ? messages.deleteKeepChildren : messages.deleteWithChildren}
        </label>
      ))}
      <ul className="delete-child-list">
        {rows.map((row) => (
          <li key={row.id} className="delete-dependency-card">
            <div className="delete-dependency-heading">
              <span className="delete-dependency-id">{label(row.id)}</span>
              <strong>{row.name}</strong>
              <span className={value === 'keep' ? 'delete-kept-badge' : 'delete-removed-badge'}>
                {value === 'keep' ? messages.deleteTaskKept : messages.deleteTaskRemoved}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
