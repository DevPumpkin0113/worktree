import { messages } from '../../i18n/messages';
import type { TaskDraft } from '../../domain/task-editing';
export function MilestoneEditorFields({
  draft,
  disabled,
  onChange,
}: {
  draft: TaskDraft;
  disabled: boolean;
  onChange: (draft: TaskDraft) => void;
}) {
  const scheduled = [draft.start, draft.end].some((value) => value !== '' && value !== '-');
  return (
    <div className="milestone-editor-fields">
      <label className="task-editor-field">
        <span>
          {messages.milestoneTitle}
          <span className="task-required" aria-hidden="true">
            {' '}
            *
          </span>
        </span>
        <input
          id="taskEditor-name"
          value={draft.name}
          required
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
      </label>
      <fieldset className="milestone-period" disabled={disabled}>
        <legend>{messages.optionalTargetPeriod}</legend>
        {(['start', 'end'] as const).map((key) => (
          <label className="task-editor-field" key={key}>
            <span>{key === 'start' ? messages.startDate : messages.endDate}</span>
            <input
              id={'taskEditor-' + key}
              type="date"
              value={draft[key] === '-' ? '' : draft[key]}
              required={scheduled}
              onChange={(event) => onChange({ ...draft, [key]: event.target.value })}
            />
          </label>
        ))}
      </fieldset>
    </div>
  );
}
