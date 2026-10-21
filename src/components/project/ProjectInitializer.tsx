import { useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import { folderName } from '../../domain/project-paths';
import type { WorkspaceStore } from '../../app/workspace-store';
export function ProjectInitializer({ store }: { store: WorkspaceStore }) {
  const [name, setName] = useState(() => folderName(store.activeProject!.path));
  const [directory, setDirectory] = useState('docs/worktree');
  const [prefix, setPrefix] = useState('W');
  const [effort, setEffort] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const saving = useRef(false);
  return (
    <section className="project-initializer project-overview">
      <h3>{messages.initializeProject}</h3>
      <p>{messages.initializeProjectHint}</p>
      <form
        className="milestone-editor-fields"
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving.current) return;
          saving.current = true;
          setBusy(true);
          setError('');
          try {
            await store.initializeProject(name, directory, prefix, effort);
          } catch (error) {
            setError(
              messages.initializeFailed + String(error instanceof Error ? error.message : error),
            );
          } finally {
            saving.current = false;
            setBusy(false);
          }
        }}
      >
        <label className="task-editor-field">
          <span>{messages.projectName} *</span>
          <input
            id="projectInit-name"
            required
            maxLength={200}
            disabled={busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="task-editor-field">
          <span>{messages.dataDirectory} *</span>
          <input
            id="projectInit-directory"
            required
            disabled={busy}
            value={directory}
            onChange={(e) => setDirectory(e.target.value)}
          />
        </label>
        <label className="task-editor-field">
          <span>{messages.idPrefix} *</span>
          <input
            id="projectInit-prefix"
            required
            pattern="[A-Z]{1,20}"
            maxLength={20}
            disabled={busy}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          />
          <small>{messages.taskPrefixHint}</small>
        </label>
        <label>
          <input
            type="checkbox"
            disabled={busy}
            checked={effort}
            onChange={(e) => setEffort(e.target.checked)}
          />{' '}
          {messages.useEffort}
        </label>
        {error ? (
          <p role="alert" className="task-editor-error">
            {error}
          </p>
        ) : null}
        <div>
          <button id="projectInit-submit" className="task-save" type="submit" disabled={busy}>
            {busy ? messages.initializingProject : messages.initializeProject}
          </button>
        </div>
      </form>
    </section>
  );
}
