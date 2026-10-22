import { messages } from '../../i18n/messages';
import type { ProjectTaskDraft } from '../../domain/task-editing';
import { useContext } from 'react';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';
export function MilestoneEditorFields({
  draft,
  disabled,
  onChange,
}: {
  draft: ProjectTaskDraft;
  disabled: boolean;
  onChange: (draft: ProjectTaskDraft) => void;
}) {
  const errors = useContext(TaskFieldErrorsContext);
  const scheduled = [draft.start, draft.end].some((value) => value !== '' && value !== '-');
  return (
    <div className="milestone-editor-fields">
      <fieldset className="milestone-period" disabled={disabled}>
        <legend>{messages.optionalTargetPeriod}</legend>
        {(['start', 'end'] as const).map((key) => (
          <label className="task-editor-field" key={key}>
            <span>{key === 'start' ? messages.startDate : messages.endDate}</span>
            <input
              id={'taskEditor-' + key}
              data-editor-field={key}
              aria-invalid={!!errors[key]}
              aria-describedby={errors[key] ? 'taskEditor-' + key + '-error' : undefined}
              type="date"
              value={draft[key] === '-' ? '' : draft[key]}
              required={scheduled}
              onChange={(event) => onChange({ ...draft, [key]: event.target.value })}
            />
            <TaskFieldError field={key} />
          </label>
        ))}
      </fieldset>
    </div>
  );
}
