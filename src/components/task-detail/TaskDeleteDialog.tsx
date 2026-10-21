import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import { deletionImpact, type DeleteOptions } from '../../domain/task-deletion';
export interface TaskDeleteSession {
  path: string;
  text: string;
  id: string;
}
export function TaskDeleteDialog({
  session,
  onDelete,
  onClose,
}: {
  session: TaskDeleteSession;
  onDelete: (options: DeleteOptions) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [children, setChildren] = useState<DeleteOptions['children']>('keep');
  const [detach, setDetach] = useState(false);
  const [error, setError] = useState('');
  const impact = useMemo(
    () => deletionImpact(session.text, session.id, children),
    [session.text, session.id, children],
  );
  useLayoutEffect(() => {
    const node = dialog.current!;
    node.showModal();
    node.querySelector<HTMLButtonElement>('#taskDeleteCancel')?.focus();
    return () => node.close();
  }, []);
  async function remove() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await onDelete({ children, detachPredecessors: detach });
      onClose();
    } catch (error) {
      setError(messages.deleteFailed + String(error instanceof Error ? error.message : error));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      id="taskDeleteDialog"
      className="task-editor"
      aria-labelledby="taskDeleteTitle"
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy.current) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void remove();
        }}
      >
        <div className="task-editor-heading">
          <h2 id="taskDeleteTitle">
            {impact.target.milestone ? messages.deleteMilestone : messages.deleteTask}
          </h2>
        </div>
        <p className="delete-target">
          {impact.target.milestone
            ? impact.target.name
            : impact.target.id + ' · ' + impact.target.name}
        </p>
        <p className="task-editor-hint">{messages.deleteSourceHint}</p>
        <p className="task-editor-source" title={session.path}>
          {session.path.split(/[\\/]/).at(-1)}
        </p>
        {impact.childRows.length ? (
          <fieldset className="delete-options" disabled={saving}>
            <legend>{messages.deleteChildrenTitle(impact.childRows.length)}</legend>
            <ul>
              {impact.childRows.map((row) => (
                <li key={row.id}>{row.id + ' · ' + row.name}</li>
              ))}
            </ul>
            {(['keep', 'delete'] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="deleteChildren"
                  value={value}
                  checked={children === value}
                  onChange={() => {
                    setChildren(value);
                    setDetach(false);
                  }}
                />
                {value === 'keep' ? messages.deleteKeepChildren : messages.deleteWithChildren}
              </label>
            ))}
          </fieldset>
        ) : null}
        {impact.dependents.length ? (
          <fieldset className="delete-options" disabled={saving}>
            <legend>{messages.deleteDependentTitle(impact.dependents.length)}</legend>
            <ul>
              {impact.dependents.map((row) => (
                <li key={row.id}>{row.id + ' · ' + row.name}</li>
              ))}
            </ul>
            <label>
              <input
                id="deleteDetachPredecessors"
                type="checkbox"
                checked={detach}
                onChange={(event) => setDetach(event.target.checked)}
              />
              {messages.deleteDetachPredecessors}
            </label>
          </fieldset>
        ) : null}
        {error ? (
          <p id="taskDeleteError" className="task-editor-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="task-editor-actions">
          <button type="button" id="taskDeleteCancel" disabled={saving} onClick={onClose}>
            {messages.cancelEdit}
          </button>
          <button
            type="submit"
            id="taskDeleteConfirm"
            className="task-delete"
            disabled={saving || (impact.dependents.length > 0 && !detach)}
          >
            {saving ? messages.deletingTask : messages.confirmDeleteCount(impact.removed.size)}
          </button>
        </div>
      </form>
    </dialog>
  );
}
