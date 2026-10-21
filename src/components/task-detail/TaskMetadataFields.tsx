import { priorityColor } from '../../views/priority-color';
import { priorityLabel } from './task-labels';
import { messages } from '../../i18n/messages';
import { legacyPriorities } from '../../domain/project-priorities';
import { FilterDropdown } from '../shared/FilterDropdown';
import { TaskReferenceFields } from './TaskReferenceFields';
import type { ProjectTaskDraft } from '../../domain/task-editing';
import type { WorkModel } from '../../domain/types';
export function TaskMetadataFields({
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
  const change = (key: keyof ProjectTaskDraft, value: string) =>
    onChange({ ...draft, [key]: value });
  return (
    <>
      <div className="task-editor-field">
        <span>{messages.priority}</span>
        <FilterDropdown
          id="taskEditor-priority"
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
      </div>
      <div className="task-editor-field">
        <span>{messages.taskType}</span>
        <FilterDropdown
          id="taskEditor-taskType"
          label={messages.taskType}
          value={draft.taskType}
          disabled={disabled}
          options={model.taskTypes!.map((value) => ({ value, label: value }))}
          onChange={(value) => change('taskType', value)}
        />
      </div>
      <label className="task-editor-field task-field-labels">
        <span>{messages.labels}</span>
        <input
          id="taskEditor-labels"
          placeholder={messages.labelsHint}
          value={draft.labels}
          disabled={disabled}
          onChange={(e) => change('labels', e.target.value)}
        />
      </label>
      <label className="task-editor-field task-field-description">
        <span>{messages.description}</span>
        <textarea
          id="taskEditor-description"
          rows={5}
          value={draft.description}
          disabled={disabled}
          onChange={(e) => change('description', e.target.value)}
        />
      </label>
      <label className="task-editor-field task-field-description">
        <span>{messages.blockedReason}</span>
        <textarea
          id="taskEditor-blockedReason"
          rows={2}
          value={draft.blockedReason}
          disabled={disabled}
          onChange={(e) => change('blockedReason', e.target.value)}
        />
      </label>
      <TaskReferenceFields
        value={draft.references}
        disabled={disabled}
        onChange={(references) => onChange({ ...draft, references })}
      />
    </>
  );
}
