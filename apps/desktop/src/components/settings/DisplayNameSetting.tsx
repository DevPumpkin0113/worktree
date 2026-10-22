import { useState } from 'react';
import { MAX_DISPLAY_NAME_LENGTH, validDisplayName } from '@worktree/core/display-name';
import { messages } from '../../i18n/messages';

export function DisplayNameSetting({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean | undefined>;
}) {
  const [draft, setDraft] = useState(value);
  const normalized = draft.trim();
  return (
    <form
      className="settings-card"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && validDisplayName(normalized, true) && normalized !== value)
          void onSave(normalized).then((saved) => {
            if (saved) setDraft(normalized);
          });
      }}
    >
      <div className="setting-row">
        <div>
          <label htmlFor="displayName">{messages.displayName}</label>
          <p className="setting-description">{messages.displayNameHint}</p>
        </div>
        <div className="display-name-controls">
          <input
            id="displayName"
            value={draft}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            disabled={disabled || normalized === value || !validDisplayName(normalized, true)}
          >
            {messages.saveTask}
          </button>
        </div>
      </div>
    </form>
  );
}
