import type { WorkRow } from '../../app/types';
import { messages } from '../../i18n/messages';
export function DeleteDependencyImpact({
  dependents,
  removedRows,
  label,
  checked,
  disabled,
  onChange,
}: {
  dependents: WorkRow[];
  removedRows: WorkRow[];
  label: (id: string) => string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const removed = new Map(removedRows.map((row) => [row.id, row]));
  return (
    <fieldset className="delete-options delete-dependency-impact" disabled={disabled}>
      <legend>{messages.deleteDependentTitle(dependents.length)}</legend>
      <p className="delete-dependency-explanation">{messages.deleteDependentHint}</p>
      <ul className="delete-dependency-list">
        {dependents.map((row) => (
          <li key={row.id} className="delete-dependency-card">
            <div className="delete-dependency-heading">
              <span className="delete-dependency-id">{label(row.id)}</span>
              <strong>{row.name}</strong>
              <span className="delete-kept-badge">{messages.deleteTaskKept}</span>
            </div>
            <div className="delete-removed-links">
              <span>{messages.deleteRemovedLinks}</span>
              <div>
                {row.deps
                  .filter((id) => removed.has(id))
                  .map((id) => (
                    <span className="delete-removed-link" key={id}>
                      {label(id)} · {removed.get(id)!.name}
                    </span>
                  ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <label className="delete-dependency-consent">
        <input
          id="deleteDetachPredecessors"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{messages.deleteDetachPredecessors}</span>
      </label>
    </fieldset>
  );
}
