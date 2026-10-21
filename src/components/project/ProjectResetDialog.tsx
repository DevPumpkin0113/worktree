import { useLayoutEffect, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';

export function ProjectResetDialog({
  name,
  directory,
  onReset,
  onClose,
}: {
  name: string;
  directory: string;
  onReset: (confirmation: string) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  useLayoutEffect(() => {
    const node = dialog.current!;
    const opener = document.activeElement;
    node.showModal();
    node.querySelector<HTMLButtonElement>('#projectResetCancel')?.focus();
    return () => {
      node.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  async function reset() {
    if (busy.current || confirmation !== name) return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await onReset(confirmation);
      onClose();
    } catch (error) {
      setError(
        messages.projectResetFailed + String(error instanceof Error ? error.message : error),
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      id="projectResetDialog"
      className="task-editor project-reset-dialog"
      aria-labelledby="projectResetTitle"
      aria-describedby="projectResetHint"
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy.current) onClose();
      }}
    >
      <form
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          void reset();
        }}
      >
        <div className="task-editor-heading">
          <h2 id="projectResetTitle">{messages.initializeProject}</h2>
        </div>
        <p id="projectResetHint" className="task-editor-hint">
          {messages.projectResetHint}
        </p>
        <ul className="project-reset-files">
          <li>
            <code>worktree.json</code>
          </li>
          <li>
            <code>{directory.replaceAll('/', '\\')}\</code>
          </li>
        </ul>
        <label className="task-editor-field" htmlFor="projectResetName">
          <span>{messages.projectResetNameHint}</span>
          <strong>{name}</strong>
          <input
            id="projectResetName"
            value={confirmation}
            disabled={saving}
            spellCheck={false}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {error ? (
          <p className="task-editor-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="task-editor-actions">
          <button type="button" id="projectResetCancel" disabled={saving} onClick={onClose}>
            {messages.cancelEdit}
          </button>
          <button
            id="projectResetConfirm"
            type="submit"
            className="project-reset-button"
            disabled={saving || confirmation !== name || !name}
          >
            {saving ? messages.projectResetting : messages.initializeProject}
          </button>
        </div>
      </form>
    </dialog>
  );
}
