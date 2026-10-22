import { priorityColor } from '../../views/priority-color';
import { priorityLabel } from './task-labels';
import { messages } from '../../i18n/messages';
import { legacyPriorities } from '../../domain/project-priorities';
import { FilterDropdown } from '../shared/FilterDropdown';
import { TaskReferenceFields } from './TaskReferenceFields';
import { SearchMultiSelect } from '../shared/SearchMultiSelect';
import { taskTypeColor } from '../../domain/task-type-colors';
import type { ProjectTaskDraft } from '../../domain/task-editing';
import type { WorkModel } from '../../domain/types';
import { useContext } from 'react';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';
export function TaskMetadataFields({
  draft,
  model,
  disabled,
  onChange,
  section = 'all',
}: {
  draft: ProjectTaskDraft;
  model: WorkModel;
  disabled: boolean;
  onChange: (draft: ProjectTaskDraft) => void;
  section?: 'all' | 'main' | 'side';
}) {
  const errors = useContext(TaskFieldErrorsContext);
  const labels = draft.labels
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const change = (key: keyof ProjectTaskDraft, value: string) =>
    onChange({ ...draft, [key]: value });
  return (
    <>
      {section !== 'main' ? (
        <>
          <div className="task-editor-field">
            <span>{messages.priority}</span>
            <FilterDropdown
              id="taskEditor-priority"
              invalid={!!errors.priority}
              describedBy={errors.priority ? 'taskEditor-priority-error' : undefined}
              label={messages.priority}
              value={draft.priority}
              disabled={disabled}
              options={[
                { value: '-', label: messages.unassignedPriority },
                ...(model.priorities ?? legacyPriorities()).map((p, index, priorities) => ({
                  value: p.id,
                  label: priorityLabel(p.id, model.priorities),
                  color: priorityColor(index, priorities.length),
                })),
              ]}
              onChange={(value) => change('priority', value)}
            />
            <TaskFieldError field="priority" />
          </div>
          <div className="task-editor-field">
            <span>{messages.taskType}</span>
            <FilterDropdown
              id="taskEditor-taskType"
              invalid={!!errors.taskType}
              describedBy={errors.taskType ? 'taskEditor-taskType-error' : undefined}
              label={messages.taskType}
              value={draft.taskType}
              disabled={disabled}
              options={model.taskTypes!.map((value) => ({
                value,
                label: value,
                badge: true,
                color: taskTypeColor(model.taskTypeColors, value),
              }))}
              onChange={(value) => change('taskType', value)}
            />
            <TaskFieldError field="taskType" />
          </div>
          <div className="task-editor-field task-field-labels">
            <span>{messages.labels}</span>
            <SearchMultiSelect
              id="taskEditor-labels"
              label={messages.labels}
              invalid={!!errors.labels}
              describedBy={errors.labels ? 'taskEditor-labels-error' : undefined}
              placeholder={messages.labelSearchHint}
              value={labels}
              options={[...new Set([...(model.labels ?? []), ...labels])].map((value) => ({
                value,
                label: value,
              }))}
              creatable
              disabled={disabled}
              onChange={(values) => change('labels', values.join(', '))}
            />
            <TaskFieldError field="labels" />
          </div>
        </>
      ) : null}
      {section !== 'side' ? (
        <>
          <label className="task-editor-field task-field-description">
            <span>{messages.description}</span>
            <textarea
              id="taskEditor-description"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'taskEditor-description-error' : undefined}
              rows={5}
              value={draft.description}
              disabled={disabled}
              onChange={(e) => change('description', e.target.value)}
            />
            <TaskFieldError field="description" />
          </label>
          <label className="task-editor-field task-field-description">
            <span>{messages.blockedReason}</span>
            <textarea
              id="taskEditor-blockedReason"
              aria-invalid={!!errors.blockedReason}
              aria-describedby={errors.blockedReason ? 'taskEditor-blockedReason-error' : undefined}
              rows={2}
              value={draft.blockedReason}
              disabled={disabled || draft.status !== 'blocked'}
              onChange={(e) => change('blockedReason', e.target.value)}
            />
            <TaskFieldError field="blockedReason" />
          </label>
          <TaskReferenceFields
            value={draft.references}
            disabled={disabled}
            onChange={(references) => onChange({ ...draft, references })}
          />
        </>
      ) : null}
    </>
  );
}
