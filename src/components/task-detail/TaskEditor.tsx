import { useModalDismiss } from '../../hooks/use-modal-dismiss';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import { parseProject } from '../../domain/project-document';
import { MilestoneEditorFields } from './MilestoneEditorFields';
import { nextProjectId, projectTaskDraft, type ProjectTaskDraft } from '../../domain/task-editing';
import { TaskEditorFields } from './TaskEditorFields';
import { Icon } from '../shared/Icon';
export interface TaskEditorSession {
  path: string;
  text: string;
  id?: string;
  kind?: 'task' | 'milestone';
}
export function TaskEditor({
  session,
  onSave,
  onClose,
}: {
  session: TaskEditorSession;
  onSave: (draft: ProjectTaskDraft) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => {
    const draft = projectTaskDraft(session.text, session.id);
    return !session.id && session.kind === 'milestone'
      ? { ...draft, type: 'milestone' as const, description: '', status: 'auto', effort: '-' }
      : draft;
  });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const dismiss = useModalDismiss(onClose, () => savingRef.current);
  const model = useMemo(() => parseProject(session.text), [session.text]);
  const id = useMemo(
    () =>
      session.id ??
      (session.kind === 'milestone'
        ? nextProjectId(session.text, true)
        : nextProjectId(session.text)),
    [session.id, session.text, session.kind],
  );
  useLayoutEffect(() => {
    const node = dialog.current!;
    node.showModal();
    node.querySelector<HTMLInputElement>('#taskEditor-name')?.focus();
    return () => node.close();
  }, []);
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      onClose();
    } catch (error) {
      setError(messages.taskSaveFailed + String(error instanceof Error ? error.message : error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      id="taskEditor"
      className="task-editor"
      aria-labelledby="taskEditorTitle"
      {...dismiss}
    >
      <form
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="task-editor-heading">
          <h2 id="taskEditorTitle">
            {draft.type === 'milestone'
              ? session.id
                ? messages.editMilestone
                : messages.addMilestone
              : session.id
                ? messages.editTask
                : messages.addTask}
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label={messages.close}
            disabled={saving}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <p className="task-editor-hint">{messages.taskEditHint}</p>
        <p className="task-editor-source" title={session.path}>
          {session.path.split(/[\\/]/).at(-1)}
        </p>
        <p className="task-editor-required-note">
          <span className="task-required" aria-hidden="true">
            *
          </span>{' '}
          {messages.requiredFieldsHint}
        </p>
        {draft.type === 'milestone' ? (
          <MilestoneEditorFields draft={draft} disabled={saving} onChange={setDraft} />
        ) : (
          <TaskEditorFields
            draft={draft}
            model={model}
            id={id}
            disabled={saving}
            onChange={setDraft}
          />
        )}
        {error ? (
          <p id="taskEditorError" className="task-editor-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="task-editor-actions">
          <button id="taskEditorCancel" type="button" disabled={saving} onClick={onClose}>
            {messages.cancelEdit}
          </button>
          <button id="taskEditorSave" className="task-save" type="submit" disabled={saving}>
            {saving ? messages.savingTask : messages.saveTask}
          </button>
        </div>
      </form>
    </dialog>
  );
}
