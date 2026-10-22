import { useContext } from 'react';
import { messages } from '../../i18n/messages';
import type { ProjectTaskDraft } from '@worktree/core/task-editing';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';
export interface TaskScheduleProps {
  draft: ProjectTaskDraft;
  disabled: boolean;
  sameDay: boolean;
  onSameDayChange: (checked: boolean) => void;
  onChange: (draft: ProjectTaskDraft) => void;
}
export function TaskScheduleFields({
  draft,
  disabled,
  sameDay,
  onSameDayChange,
  onChange,
}: TaskScheduleProps) {
  const errors = useContext(TaskFieldErrorsContext);
  const scheduled = [draft.start, draft.end].some((value) => value !== '' && value !== '-');
  return (
    <div className="task-schedule-fields">
      {(['start', 'end'] as const).map((key) => (
        <label className="task-editor-field" key={key}>
          <span>{key === 'start' ? messages.startDate : messages.endDate}</span>
          <input
            id={'taskEditor-' + key}
            data-editor-field={key}
            type="date"
            value={draft[key] === '-' ? '' : draft[key]}
            disabled={disabled || (key === 'end' && sameDay)}
            required={draft.type === 'milestone' && scheduled}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? 'taskEditor-' + key + '-error' : undefined}
            onChange={(event) =>
              onChange({
                ...draft,
                [key]: event.target.value,
                ...(sameDay && key === 'start' ? { end: event.target.value } : {}),
              })
            }
          />
          <TaskFieldError field={key} />
        </label>
      ))}
      <label className="task-same-day">
        <input
          id="taskEditor-sameDay"
          type="checkbox"
          checked={sameDay}
          disabled={disabled}
          onChange={(event) => onSameDayChange(event.target.checked)}
        />
        <span>{messages.sameDaySchedule}</span>
      </label>
    </div>
  );
}
