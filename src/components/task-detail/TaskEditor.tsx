import { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TaskEditorTitleContext } from './task-editor-title-context';
import { messages } from '../../i18n/messages';
import { parseProject } from '../../domain/project-document';
import { MilestoneEditorFields } from './MilestoneEditorFields';
import { nextProjectId, projectTaskDraft, type ProjectTaskDraft } from '../../domain/task-editing';
import { TaskEditorFields } from './TaskEditorFields';
import { validateTaskDraft, type TaskDraftErrors } from '../../domain/task-draft-validation';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';
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
  onBusyChange,
  active = true,
}: {
  session: TaskEditorSession;
  onSave: (draft: ProjectTaskDraft) => Promise<void>;
  onClose: () => void;
  onBusyChange?: (saving: boolean) => void;
  active?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const titleTarget = useContext(TaskEditorTitleContext);
  const [draft, setDraft] = useState(() => {
    const draft = projectTaskDraft(session.text, session.id);
    return !session.id && session.kind === 'milestone'
      ? { ...draft, type: 'milestone' as const, description: '', status: 'auto', effort: '-' }
      : draft;
  });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<TaskDraftErrors>({});
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
    if (active) titleTarget?.querySelector<HTMLInputElement>('#taskEditor-name')?.focus();
  }, [active, titleTarget]);
  useLayoutEffect(() => {
    if (!active) return;
    const field = Object.keys(fieldErrors)[0];
    const target = field
      ? document.getElementById('taskEditor-' + field)
      : error
        ? document.getElementById('taskEditorError')
        : null;
    const control = target?.matches('input, textarea, button')
      ? target
      : target?.querySelector<HTMLElement>('input, textarea, button');
    target?.scrollIntoView?.({ block: 'center' });
    (control ?? target)?.focus({ preventScroll: true });
  }, [fieldErrors, error, active]);
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    onBusyChange?.(true);
    setError('');
    setFieldErrors({});
    try {
      const issues = validateTaskDraft(session.text, draft, session.id);
      const form = root.current?.querySelector<HTMLFormElement>('form');
      for (const element of Array.from(form?.elements ?? [])) {
        if (
          !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) ||
          element.disabled ||
          element.validity.valid
        )
          continue;
        const field =
          element.dataset.editorField ??
          (element.id.startsWith('taskEditor-')
            ? element.id.slice('taskEditor-'.length)
            : undefined);
        if (field && !issues[field])
          issues[field] = element.validationMessage || messages.taskFieldInvalid;
      }
      if (Object.keys(issues).length) {
        setFieldErrors(issues);
        return;
      }
      await onSave(draft);
      onClose();
    } catch (error) {
      setError(messages.taskSaveFailed + String(error instanceof Error ? error.message : error));
    } finally {
      savingRef.current = false;
      setSaving(false);
      onBusyChange?.(false);
    }
  }
  if (!active) return null;
  return (
    <TaskFieldErrorsContext.Provider value={fieldErrors}>
      <section
        ref={root}
        id="taskEditor"
        className="task-editor task-editor-inline"
        aria-label={
          draft.type === 'milestone'
            ? session.id
              ? messages.editMilestone
              : messages.newMilestone
            : session.id
              ? messages.editTask
              : messages.newTask
        }
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          event.stopPropagation();
          if (!savingRef.current) onClose();
        }}
      >
        {titleTarget
          ? createPortal(
              <>
                <input
                  id="taskEditor-name"
                  className="detail-title-input"
                  form="taskEditorForm"
                  aria-label={
                    draft.type === 'milestone' ? messages.milestoneTitle : messages.taskName
                  }
                  value={draft.name}
                  placeholder={
                    session.id
                      ? undefined
                      : draft.type === 'milestone'
                        ? messages.milestoneTitle
                        : messages.taskName
                  }
                  data-editor-field="name"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'taskEditor-name-error' : undefined}
                  required
                  disabled={saving}
                  autoComplete="off"
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
                <TaskFieldError field="name" />
              </>,
              titleTarget,
            )
          : null}
        <form
          id="taskEditorForm"
          noValidate
          onInvalid={(event) => event.preventDefault()}
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="task-editor-body">
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
          </div>
          <div className="task-editor-footer">
            {error ? (
              <p id="taskEditorError" className="task-editor-error" role="alert" tabIndex={-1}>
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
          </div>
        </form>
      </section>
    </TaskFieldErrorsContext.Provider>
  );
}
