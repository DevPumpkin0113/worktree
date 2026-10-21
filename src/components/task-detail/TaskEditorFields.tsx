import { TaskMetadataFields } from './TaskMetadataFields';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type WorkModel } from '../../app/types';
import { SearchMultiSelect } from '../shared/SearchMultiSelect';
import { FilterDropdown } from '../shared/FilterDropdown';
import type { ProjectTaskDraft } from '../../domain/task-editing';
export function TaskEditorFields({
  draft,
  model,
  id,
  disabled,
  onChange,
}: {
  draft: ProjectTaskDraft;
  model: WorkModel;
  id: string;
  disabled: boolean;
  onChange: (draft: ProjectTaskDraft) => void;
}) {
  const change = (key: keyof ProjectTaskDraft, value: string) =>
    onChange({ ...draft, [key]: value });
  const text = (
    key: Exclude<keyof ProjectTaskDraft, 'references'>,
    label: string,
    type = 'text',
    locked = false,
  ) => (
    <label className={'task-editor-field task-field-' + key} key={key}>
      <span>
        {label}
        {key === 'name' ? (
          <span className="task-required" title={messages.requiredField} aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </span>
      <input
        id={'taskEditor-' + key}
        type={type}
        value={(type === 'date' || type === 'number') && draft[key] === '-' ? '' : draft[key]}
        disabled={disabled || locked}
        required={key === 'name'}
        step={type === 'number' ? 'any' : undefined}
        onChange={(event) => change(key, event.target.value)}
      />
    </label>
  );
  return (
    <div className="task-editor-fields">
      <label className="task-editor-field">
        <span>{messages.taskIdAutomatic}</span>
        <input value={id} readOnly />
      </label>
      {text('name', messages.taskName)}
      <div className="task-editor-field task-field-owner">
        <span>{messages.owner}</span>
        <FilterDropdown
          id="taskEditor-owner"
          label={messages.owner}
          value={draft.owner || '-'}
          disabled={disabled}
          options={[
            { value: '-', label: messages.unassignedAssignee },
            ...[
              ...new Set([
                ...(model.assignees ?? []),
                ...(draft.owner && draft.owner !== '-' ? [draft.owner] : []),
              ]),
            ].map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => change('owner', value)}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.status}</span>
        <FilterDropdown
          id="taskEditor-status"
          label={messages.status}
          value={draft.status}
          disabled={disabled}
          options={Object.entries(STATUS_NAMES).map(([value, label]) => ({ value, label }))}
          onChange={(value) => change('status', value)}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.parentMilestone}</span>
        <FilterDropdown
          id="taskEditor-parent"
          label={messages.parentMilestone}
          value={draft.parent}
          disabled={disabled}
          options={[
            { value: '-', label: messages.unassignedMilestone },
            ...model.rows
              .filter((row) => row.type === 'group' && row.id !== id)
              .map((row) => ({
                value: row.id,
                label: row.milestone ? row.name : row.id + ' · ' + row.name,
              })),
          ]}
          onChange={(value) => change('parent', value)}
        />
      </div>
      {model.useEffort ? text('effort', messages.effort, 'number', draft.type !== 'task') : null}
      <TaskMetadataFields draft={draft} model={model} disabled={disabled} onChange={onChange} />
      {text('start', messages.startDate, 'date')}
      {text('end', messages.endDate, 'date')}
      <div className="task-editor-field task-field-deps">
        <span>{messages.predecessors}</span>
        <SearchMultiSelect
          id="taskEditor-deps"
          label={messages.predecessors}
          placeholder={messages.searchPredecessors}
          options={model.rows
            .filter((row) => row.type !== 'group' && row.id !== id)
            .map((row) => ({
              value: row.id,
              label: row.milestone ? row.name : row.id + ' · ' + row.name,
            }))}
          value={
            draft.deps === '-'
              ? []
              : [
                  ...new Set(
                    draft.deps
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  ),
                ]
          }
          disabled={disabled}
          onChange={(values) => change('deps', values.join(', ') || '-')}
        />
      </div>
    </div>
  );
}
