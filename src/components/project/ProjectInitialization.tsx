import { useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import type { OpenProject, WorkModel } from '../../app/types';
import { folderName } from '../../domain/project-paths';
import { initializationTitles } from './InitializationSteps';

export function ProjectInitialization({
  step,
  onStep,
  onCancel,
  project,
  model,
  onInitialize,
  busy = false,
  error,
}: {
  step: number;
  onStep: (step: number) => void;
  onCancel?: () => void;
  onInitialize?: (
    name: string,
    directory: string,
    prefix: string,
    effort: boolean,
  ) => Promise<void>;
  busy?: boolean;
  error?: string;
  project: OpenProject;
  model: WorkModel | null;
}) {
  const [name, setName] = useState(model?.title ?? folderName(project.path));
  const [directory, setDirectory] = useState(model?.dataDirectory ?? 'docs/worktree');
  const [prefix, setPrefix] = useState(model?.idPrefix ?? 'W');
  const [effort, setEffort] = useState(model?.useEffort ?? false);
  const form = useRef<HTMLFormElement>(null);
  const validStep = () => {
    if (!name.trim()) return 0;
    if (!directory.trim() || !/^[A-Z]{1,20}$/.test(prefix)) return 1;
    return 2;
  };
  return (
    <form
      ref={form}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !onInitialize) return;
        const target = validStep();
        if (target !== 2) {
          onStep(target);
          return;
        }
        await onInitialize(name, directory, prefix, effort);
      }}
      className="initialization-preview project-initializer"
      aria-labelledby="initializationStepTitle"
    >
      <fieldset disabled={busy} className="initialization-step-body">
        <p className="initialization-step-count">{step + 1} / 3</p>
        <h3 id="initializationStepTitle">{initializationTitles()[step]}</h3>
        <p className="initialization-preview-note">
          {onInitialize ? messages.initializeProjectHint : messages.initializationPreviewHint}
        </p>
        {step === 0 ? (
          <div className="milestone-editor-fields">
            <label className="task-editor-field">
              <span>{messages.projectName} *</span>
              <input
                id="initialization-name"
                required
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={effort}
                onChange={(e) => setEffort(e.target.checked)}
              />{' '}
              {messages.useEffort}
            </label>
          </div>
        ) : step === 1 ? (
          <div className="milestone-editor-fields">
            <label className="task-editor-field">
              <span>{messages.projectFolder}</span>
              <input value={project.path} disabled />
            </label>
            <label className="task-editor-field">
              <span>{messages.dataDirectory} *</span>
              <input
                id="initialization-directory"
                required
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
              />
            </label>
            <label className="task-editor-field">
              <span>{messages.idPrefix} *</span>
              <input
                id="initialization-prefix"
                required
                pattern="[A-Z]{1,20}"
                value={prefix}
                maxLength={20}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              />
              <small>{messages.taskPrefixHint}</small>
            </label>
          </div>
        ) : (
          <div className="project-management-section">
            <dl>
              {[
                [messages.projectName, name],
                [messages.projectFolder, project.path],
                [messages.dataDirectory, directory],
                [messages.idPrefix, prefix],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div>
                <dt>{messages.useEffort}</dt>
                <dd>
                  <input
                    type="checkbox"
                    checked={effort}
                    disabled
                    aria-label={messages.useEffort}
                  />
                </dd>
              </div>
            </dl>
          </div>
        )}
      </fieldset>
      {error ? (
        <p role="alert" className="task-editor-error">
          {error}
        </p>
      ) : null}
      <div className="initialization-actions">
        {onCancel ? (
          <button id="initializationCancel" disabled={busy} type="button" onClick={onCancel}>
            {messages.initializationCancel}
          </button>
        ) : (
          <span />
        )}
        <div>
          {step > 0 ? (
            <button type="button" disabled={busy} onClick={() => onStep(step - 1)}>
              {messages.initializationBack}
            </button>
          ) : null}
          {step < 2 ? (
            <button
              id="initializationNext"
              type="button"
              onClick={() => {
                if (form.current?.reportValidity()) onStep(step + 1);
              }}
            >
              {messages.initializationNext}
            </button>
          ) : (
            <button id="initializationSubmit" type="submit" disabled={busy || !onInitialize}>
              {busy ? messages.initializingProject : messages.initializeProject}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
