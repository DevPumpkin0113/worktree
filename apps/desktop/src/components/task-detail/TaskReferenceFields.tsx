import { useContext, useEffect, useRef, useState } from 'react';
import { File, FileText, Folder, Globe, Pencil, Trash2 } from 'lucide-react';
import {
  referenceDisplayName,
  referenceWebUrl,
  validTaskReference,
} from '@worktree/core/task-references';
import { isRelativePath, type TaskReference } from '@worktree/core/project-source';
import { messages } from '../../i18n/messages';
import { FilterDropdown } from '../shared/FilterDropdown';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';

export function TaskReferenceFields({
  value,
  disabled,
  onChange,
}: {
  value: TaskReference[];
  disabled: boolean;
  onChange: (value: TaskReference[]) => void;
}) {
  const errors = useContext(TaskFieldErrorsContext);
  const [editor, setEditor] = useState<{ index: number | null; draft: TaskReference } | null>(null);
  const [error, setError] = useState('');
  const root = useRef<HTMLFieldSetElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const editing = !!editor;
  const wasEditing = useRef(false);
  const index = editor?.index ?? value.length;
  useEffect(() => {
    if (editing) input.current?.focus();
    else if (wasEditing.current) addButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const form = root.current?.closest('form');
    function pending(event: Event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setError(messages.referencePending);
      input.current?.focus();
    }
    form?.addEventListener('submit', pending, true);
    return () => form?.removeEventListener('submit', pending, true);
  }, [editing]);
  function close() {
    setEditor(null);
    setError('');
  }
  function commit() {
    if (!editor) return;
    const draft = editor.draft;
    const { value: target, type } = draft;
    if (!validTaskReference(draft)) {
      setError(
        !target.trim()
          ? messages.referenceValueRequired
          : ['file', 'folder'].includes(type) && !isRelativePath(target)
            ? messages.referencePathInvalid
            : messages.referenceInvalid,
      );
      input.current?.focus();
      return;
    }
    onChange(
      editor.index === null
        ? [...value, draft]
        : value.map((item, i) => (i === editor.index ? draft : item)),
    );
    close();
  }
  function change(draft: TaskReference) {
    if (editor) setEditor({ ...editor, draft });
    setError('');
  }
  return (
    <fieldset ref={root} className="task-field-references" disabled={disabled}>
      <legend>{messages.references}</legend>
      <ul className="reference-edit-list">
        {value.map((reference, i) => {
          const Icon =
            referenceWebUrl(reference.value) && ['text', 'web'].includes(reference.type)
              ? Globe
              : reference.type === 'file'
                ? File
                : reference.type === 'folder'
                  ? Folder
                  : FileText;
          return (
            <li key={i} className="reference-edit-item">
              <button
                type="button"
                className="reference-edit-summary"
                disabled={disabled || editing}
                aria-label={messages.referenceEdit + ': ' + referenceDisplayName(reference)}
                onClick={() => {
                  setError('');
                  setEditor({ index: i, draft: { ...reference } });
                }}
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="detail-reference-text">
                  <span className="detail-reference-name">{referenceDisplayName(reference)}</span>
                  <span className="detail-reference-path" title={reference.value}>
                    {reference.value}
                  </span>
                </span>
                <Pencil size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="reference-remove action-button"
                data-variant="secondary"
                aria-label={messages.removeReference + ' ' + (i + 1)}
                title={messages.removeReference}
                disabled={disabled || editing}
                onClick={() => onChange(value.filter((_, n) => n !== i))}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
              {errors['reference-' + i] ? <TaskFieldError field={'reference-' + i} /> : null}
            </li>
          );
        })}
      </ul>
      {editor ? (
        <div className="reference-composer">
          <strong>{editor.index === null ? messages.addReference : messages.referenceEdit}</strong>
          <FilterDropdown
            id={'taskReference-type-' + index}
            label={messages.type}
            disabled={disabled}
            value={editor.draft.type}
            options={[
              { value: 'web', label: messages.referenceWeb },
              { value: 'file', label: messages.referenceFile },
              { value: 'folder', label: messages.referenceFolder },
              { value: 'text', label: messages.referenceText },
            ]}
            onChange={(type) => change({ ...editor.draft, type: type as TaskReference['type'] })}
          />
          <div className="task-reference-value-field">
            <label htmlFor={'taskEditor-reference-' + index}>{messages.referenceTarget}</label>
            <input
              ref={input}
              id={'taskEditor-reference-' + index}
              aria-invalid={!!error}
              aria-describedby={error ? 'taskEditor-reference-' + index + '-error' : undefined}
              aria-label={messages.referenceTarget}
              value={editor.draft.value}
              disabled={disabled}
              onChange={(event) => change({ ...editor.draft, value: event.target.value })}
            />
            {error ? (
              <p
                id={'taskEditor-reference-' + index + '-error'}
                className="task-field-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
          <label>
            {messages.referenceName}
            <input
              aria-label={messages.referenceName + ' ' + (index + 1)}
              placeholder={messages.referenceNameHint}
              value={editor.draft.name ?? ''}
              disabled={disabled}
              onChange={(event) => {
                const { name: _name, ...rest } = editor.draft;
                change(event.target.value ? { ...rest, name: event.target.value } : rest);
              }}
            />
          </label>
          <p className="task-editor-hint">{messages.referenceHint}</p>
          <div className="reference-composer-actions">
            <button
              type="button"
              className="action-button"
              data-variant="secondary"
              onClick={close}
              disabled={disabled}
            >
              {messages.referenceCancel}
            </button>
            <button
              type="button"
              id="taskReference-confirm"
              className="action-button"
              data-variant="primary"
              onClick={commit}
              disabled={disabled}
            >
              {editor.index === null ? messages.referenceAdd : messages.referenceApply}
            </button>
          </div>
        </div>
      ) : null}
      <TaskFieldError field="references" />
      <button
        ref={addButton}
        type="button"
        className="action-button"
        data-variant="secondary"
        id="taskReference-add"
        hidden={editing}
        disabled={disabled}
        onClick={() => {
          setError('');
          setEditor({ index: null, draft: { type: 'web', value: '' } });
        }}
      >
        {messages.addReference}
      </button>
    </fieldset>
  );
}
