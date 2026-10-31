import { Trash2 } from 'lucide-react';
import { Icon } from '../shared/Icon';
import { useModalDismiss } from '../../hooks/use-modal-dismiss';
import { DeleteDependencyImpact } from './DeleteDependencyImpact';
import { parseProject } from '@worktree/core/project-document';
import { createIdLabels } from '@worktree/core/id-display';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import type { DeleteOptions } from '@worktree/core/task-deletion';
import { projectDeletionImpact as deletionImpact } from '@worktree/core/task-deletion';
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
  onDelete: (options: Pick<DeleteOptions, 'detachPredecessors'>) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [detach, setDetach] = useState(false);
  const [error, setError] = useState('');
  const dismiss = useModalDismiss(onClose, () => busy.current);
  const labels = useMemo(() => {
    const model = parseProject(session.text);
    return createIdLabels(model, model.idSeparator ?? 'none');
  }, [session.text]);
  const label = (id: string) => labels.get(id) ?? id;
  const impact = useMemo(
    () => deletionImpact(session.text, session.id, 'keep'),
    [session.text, session.id],
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
      await onDelete({ detachPredecessors: detach });
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
      aria-describedby="taskDeleteHint"
      {...dismiss}
    >
      <form
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          void remove();
        }}
      >
        <div className="task-editor-heading delete-dialog-heading">
          <span className="delete-dialog-icon" aria-hidden="true">
            <Trash2 size={18} strokeWidth={1.5} />
          </span>
          <h2 id="taskDeleteTitle">
            {impact.target.epic
              ? messages.deleteEpic
              : impact.target.milestone
                ? messages.deleteMilestone
                : messages.deleteTask}
          </h2>
          <button
            className="delete-dialog-close"
            type="button"
            disabled={saving}
            aria-label={messages.close}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="task-delete-body">
          <div className="delete-target">
            <span className="id">{label(impact.target.id)}</span>
            <strong>{impact.target.name}</strong>
          </div>
          <p id="taskDeleteHint" className="task-editor-hint">
            {messages.deleteSourceHint}
          </p>
          {impact.target.epic && impact.childRows.length ? (
            <p className="task-editor-hint">{messages.epicDeleteKeepHint}</p>
          ) : null}
          {impact.commentCount ? (
            <p className="task-editor-hint">
              {messages.commentsDeletedWithTask(impact.commentCount)}
            </p>
          ) : null}
          {impact.target.milestone && impact.childRows.length ? (
            <p className="task-editor-hint">
              {impact.target.parent !== '-'
                ? messages.milestoneDeleteKeepInEpicHint(impact.childRows.length)
                : messages.milestoneDeleteKeepUnassignedHint(impact.childRows.length)}
            </p>
          ) : null}
          {impact.dependents.length ? (
            <DeleteDependencyImpact
              dependents={impact.dependents}
              removedRows={[impact.target]}
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
          <button
            data-variant="secondary"
            className="action-button"
            type="button"
            id="taskDeleteCancel"
            disabled={saving}
            onClick={onClose}
          >
            {messages.cancelEdit}
          </button>
          <button
            data-variant="danger"
            type="submit"
            id="taskDeleteConfirm"
            className="task-delete action-button"
            disabled={saving || (impact.dependents.length > 0 && !detach)}
          >
            {saving
              ? messages.deletingTask
              : impact.target.epic
                ? messages.deleteEpic
                : impact.target.milestone
                  ? messages.deleteMilestone
                  : messages.deleteTask}
          </button>
        </div>
      </form>
    </dialog>
  );
}
