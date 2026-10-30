import { useContext, useMemo } from 'react';
import type { WorkModel } from '../../app/types';
import type { ProjectTaskDraft } from '@worktree/core/task-editing';
import { createIdLabels } from '@worktree/core/id-display';
import { messages } from '../../i18n/messages';
import { FilterDropdown } from '../shared/FilterDropdown';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';

export function IssueMembershipFields({
  draft,
  model,
  disabled,
  onChange,
}: {
  draft: ProjectTaskDraft;
  model: WorkModel;
  disabled: boolean;
  onChange: (draft: ProjectTaskDraft) => void;
}) {
  const errors = useContext(TaskFieldErrorsContext);
  const labels = useMemo(() => createIdLabels(model, model.idSeparator ?? 'none'), [model]);
  const parent = model.rows.find((row) => row.id === draft.parent);
  const epicId = parent?.epic ? parent.id : parent?.milestone ? parent.parent : '-';
  const milestoneId = parent?.milestone ? parent.id : '-';
  return (
    <>
      <div className="task-editor-field">
        <span>{messages.epic}</span>
        <FilterDropdown
          id="taskEditor-epic"
          label={messages.epic}
          value={epicId}
          disabled={disabled}
          options={[
            { value: '-', label: messages.unassignedEpic },
            ...model.rows
              .filter((row) => row.epic)
              .map((row) => ({
                value: row.id,
                label: (labels.get(row.id) ?? row.id) + ' · ' + row.name,
              })),
          ]}
          onChange={(epic) => onChange({ ...draft, parent: epic })}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.parentMilestone}</span>
        <FilterDropdown
          id="taskEditor-parent"
          label={messages.parentMilestone}
          value={milestoneId}
          disabled={disabled}
          invalid={!!errors.parent}
          describedBy={errors.parent ? 'taskEditor-parent-error' : undefined}
          options={[
            { value: '-', label: messages.unassignedMilestone },
            ...model.rows
              .filter((row) => row.milestone && row.parent === epicId)
              .map((row) => ({
                value: row.id,
                label: (labels.get(row.id) ?? row.id) + ' · ' + row.name,
              })),
          ]}
          onChange={(milestone) =>
            onChange({ ...draft, parent: milestone === '-' ? epicId : milestone })
          }
        />
        <TaskFieldError field="parent" />
      </div>
    </>
  );
}
