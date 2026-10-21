import { useEffect, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import {
  splitInitializationDirectory,
  validInitializationDirectory,
  validTaskPrefix,
  type ProjectInitializationDraft,
} from '../../domain/project-initialization';
import { IdSeparatorInput } from '../shared/IdSeparatorInput';

export function InitializationStorageFields({
  root,
  draft,
  busy,
  onChange,
  onPickParent,
}: {
  root: string;
  draft: ProjectInitializationDraft;
  busy: boolean;
  onChange: (change: Partial<ProjectInitializationDraft>) => void;
  onPickParent: (parent: string) => Promise<string | null>;
}) {
  const { parent, name } = splitInitializationDirectory(draft.directory);
  const [picking, setPicking] = useState(false);
  const [browseError, setBrowseError] = useState('');
  const prefixInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const parentInput = useRef<HTMLInputElement>(null);
  const prefixError = validTaskPrefix(draft.prefix) ? '' : messages.initializationPrefixInvalid;
  const parentError =
    parent && !validInitializationDirectory(parent) ? messages.initializationParentInvalid : '';
  const folderError = validInitializationDirectory(name)
    ? ''
    : messages.initializationFolderNameInvalid;
  useEffect(() => {
    prefixInput.current?.setCustomValidity(prefixError);
  }, [prefixError]);
  useEffect(() => {
    folderInput.current?.setCustomValidity(folderError);
  }, [folderError]);
  useEffect(() => {
    parentInput.current?.setCustomValidity(parentError);
  }, [parentError]);
  const changeDirectory = (nextParent: string, nextName: string) =>
    onChange({ directory: nextParent ? nextParent + '/' + nextName : nextName });
  return (
    <div className="milestone-editor-fields">
      <label className="task-editor-field">
        <span>{messages.projectFolder}</span>
        <input value={root} disabled />
      </label>
      <div className="initialization-directory-row">
        <div className="task-editor-field">
          <label htmlFor="initialization-parent">{messages.initializationParent}</label>
          <div className="initialization-directory-picker">
            <input
              id="initialization-parent"
              ref={parentInput}
              aria-invalid={!!parentError}
              aria-describedby={parentError ? 'initialization-parent-error' : undefined}
              value={parent}
              placeholder={messages.projectRootLocation}
              disabled={busy || picking}
              onChange={(e) => changeDirectory(e.target.value, name)}
            />
            <button
              id="initialization-browse"
              type="button"
              disabled={busy || picking}
              onClick={async () => {
                setPicking(true);
                setBrowseError('');
                try {
                  const selected = await onPickParent(parent);
                  if (selected !== null) changeDirectory(selected, name);
                } catch (error) {
                  setBrowseError(
                    messages.initializationBrowseFailed +
                      String(error instanceof Error ? error.message : error),
                  );
                } finally {
                  setPicking(false);
                }
              }}
            >
              {messages.browseFolder}
            </button>
          </div>
          {parentError ? (
            <span id="initialization-parent-error" className="task-editor-error" role="alert">
              {parentError}
            </span>
          ) : (
            <small>{messages.initializationParentHint}</small>
          )}
          {browseError ? (
            <span className="task-editor-error" role="alert">
              {browseError}
            </span>
          ) : null}
        </div>
        <span className="initialization-directory-separator" aria-hidden="true">
          /
        </span>
        <label className="task-editor-field">
          <span>{messages.initializationFolderName} *</span>
          <input
            id="initialization-directory-name"
            ref={folderInput}
            required
            value={name}
            aria-invalid={!!folderError}
            aria-describedby={folderError ? 'initialization-directory-error' : undefined}
            onChange={(e) => {
              changeDirectory(parent, e.target.value.replace(/[\\/]/g, ''));
            }}
          />
          {folderError ? (
            <span id="initialization-directory-error" className="task-editor-error" role="alert">
              {folderError}
            </span>
          ) : (
            <small>{messages.initializationFolderNameHint}</small>
          )}
        </label>
      </div>
      <p className="initialization-path-preview">
        <span>{messages.initializationLocation}</span>
        <strong>
          {root.replaceAll('\\', '/').replace(/\/+$/, '')}/{draft.directory}
        </strong>
      </p>
      <div className="initialization-id-row">
        <label className="task-editor-field">
          <span>{messages.idPrefix} *</span>
          <input
            id="initialization-prefix"
            ref={prefixInput}
            required
            maxLength={20}
            value={draft.prefix}
            aria-invalid={!!prefixError}
            aria-describedby="initialization-prefix-hint"
            onChange={(e) =>
              onChange({ prefix: e.target.value.replace(/[a-z]/g, (value) => value.toUpperCase()) })
            }
          />
          <small
            id="initialization-prefix-hint"
            className={prefixError ? 'task-editor-error' : undefined}
          >
            {prefixError || messages.taskPrefixHint}
          </small>
        </label>
        <div className="task-editor-field">
          <span>{messages.idSeparator}</span>
          <IdSeparatorInput
            id="initialization-idSeparator"
            value={draft.idSeparator}
            prefix={draft.prefix}
            disabled={busy}
            onChange={(idSeparator) => onChange({ idSeparator })}
          />
        </div>
      </div>
    </div>
  );
}
