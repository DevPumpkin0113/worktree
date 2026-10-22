import { useModalDismiss } from '../../hooks/use-modal-dismiss';
import { DeleteDependencyImpact } from './DeleteDependencyImpact';
import { DeleteChildTasks } from './DeleteChildTasks';
import { parseProject } from '../../domain/project-document';
import { createIdLabels } from '../../domain/id-display';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import type { DeleteOptions } from '../../domain/task-deletion';
import { projectDeletionImpact as deletionImpact } from '../../domain/task-deletion';
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
  const dismiss = useModalDismiss(onClose, () => busy.current);
  const labels = useMemo(() => {
    const model = parseProject(session.text);
    return createIdLabels(model, model.idSeparator ?? 'none');
  }, [session.text]);
  const label = (id: string) => labels.get(id) ?? id;
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
    if (busy.current || (impact.dependents.length > 0 && !detach)) return;
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
      className={'task-editor' + (impact.childRows.length ? ' milestone-delete-dialog' : '')}
      aria-labelledby="taskDeleteTitle"
      {...dismiss}
    >
      <form
        autoComplete="off"
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
        <div className="task-delete-body">
          <p className="delete-target">{label(impact.target.id) + ' · ' + impact.target.name}</p>
          <p className="task-editor-hint">{messages.deleteSourceHint}</p>
          {impact.commentCount ? (
            <p className="task-editor-hint">
              {messages.commentsDeletedWithTask(impact.commentCount)}
            </p>
          ) : null}
          {impact.childRows.length ? (
            <DeleteChildTasks
              rows={impact.childRows}
              value={children}
              disabled={saving}
              label={label}
              onChange={(value) => {
                setChildren(value);
                setDetach(false);
              }}
            />
          ) : null}
          {impact.dependents.length ? (
            <DeleteDependencyImpact
              dependents={impact.dependents}
              removedRows={[impact.target, ...impact.childRows].filter((row) =>
                impact.removed.has(row.id),
              )}
              label={label}
              checked={detach}
              disabled={saving}
              onChange={setDetach}
            />
          ) : null}
          {error ? (
            <p id="taskDeleteError" className="task-editor-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
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
            {saving
              ? messages.deletingTask
              : impact.target.milestone
                ? messages.deleteMilestone
                : messages.deleteTask}
          </button>
        </div>
      </form>
    </dialog>
  );
}
