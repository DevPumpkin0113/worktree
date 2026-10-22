import { useEffect, useRef } from 'react';
import { messages } from '../../i18n/messages';
import {
  validTaskPrefix,
  type ProjectInitializationDraft,
} from '@worktree/core/project-initialization';
import { IdSeparatorInput } from '../shared/IdSeparatorInput';
export function InitializationIdFields({
  draft,
  busy,
  onChange,
}: {
  draft: ProjectInitializationDraft;
  busy: boolean;
  onChange: (change: Partial<ProjectInitializationDraft>) => void;
}) {
  const prefixInput = useRef<HTMLInputElement>(null);
  const prefixError = validTaskPrefix(draft.prefix) ? '' : messages.initializationPrefixInvalid;
  useEffect(() => {
    prefixInput.current?.setCustomValidity(prefixError);
  }, [prefixError]);
  return (
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
  );
}
