import { messages } from '../../i18n/messages';
import { TaskScheduleFields, type TaskScheduleProps } from './TaskScheduleFields';
import type { WorkModel } from '../../app/types';
import { FilterDropdown } from '../shared/FilterDropdown';
import { createIdLabels } from '@worktree/core/id-display';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';
import { useContext } from 'react';
import { MarkdownDescriptionEditor } from './MarkdownDescriptionEditor';
export function MilestoneEditorFields(props: TaskScheduleProps & { model: WorkModel }) {
  const errors = useContext(TaskFieldErrorsContext);
  const labels = createIdLabels(props.model, props.model.idSeparator ?? 'none');
  return (
    <div className="milestone-editor-fields">
      {props.draft.type === 'epic' ? (
        <MarkdownDescriptionEditor
          label={messages.epicGoal}
          value={props.draft.description}
          disabled={props.disabled}
          invalid={!!errors.description}
          onChange={(description) => props.onChange({ ...props.draft, description })}
        />
      ) : null}
      {props.draft.type === 'milestone' ? (
        <div className="task-editor-field">
          <span>{messages.epic}</span>
          <FilterDropdown
            id="taskEditor-parent"
            label={messages.epic}
            value={props.draft.parent}
            invalid={!!errors.parent}
            describedBy={errors.parent ? 'taskEditor-parent-error' : undefined}
            options={[
              { value: '-', label: messages.unassignedEpic },
              ...props.model.rows
                .filter((row) => row.epic)
                .map((row) => ({
                  value: row.id,
                  label: (labels.get(row.id) ?? row.id) + ' · ' + row.name,
                })),
            ]}
            disabled={props.disabled}
            onChange={(parent) => props.onChange({ ...props.draft, parent })}
          />
          <TaskFieldError field="parent" />
        </div>
      ) : null}
      <fieldset className="milestone-period" disabled={props.disabled}>
        <legend>{messages.optionalTargetPeriod}</legend>
        <TaskScheduleFields {...props} />
      </fieldset>
    </div>
  );
}
