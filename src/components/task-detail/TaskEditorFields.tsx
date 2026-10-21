import { messages } from '../../i18n/messages';
import { STATUS_NAMES, TYPE_NAMES, type WorkModel } from '../../app/types';
import { SearchMultiSelect } from '../shared/SearchMultiSelect';
import { FilterDropdown } from '../shared/FilterDropdown';
import type { TaskDraft } from '../../domain/task-editing';
export function TaskEditorFields({
  draft,
  model,
  id,
  creating,
  disabled,
  onChange,
}: {
  draft: TaskDraft;
  model: WorkModel;
  id: string;
  creating: boolean;
  disabled: boolean;
  onChange: (draft: TaskDraft) => void;
}) {
  const change = (key: keyof TaskDraft, value: string) => onChange({ ...draft, [key]: value });
  const text = (key: keyof TaskDraft, label: string, type = 'text', locked = false) => (
    <label className={'task-editor-field task-field-' + key} key={key}>
      <span>
        {label}
        {key === 'name' || key === 'criteria' ? (
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
        required={key === 'name' || key === 'criteria'}
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
      <div className="task-editor-field">
        <span>{messages.type}</span>
        <FilterDropdown
          id="taskEditor-type"
          label={messages.type}
          value={draft.type}
          disabled={disabled || !creating}
          options={Object.entries(TYPE_NAMES)
            .filter(([type]) => (creating ? type !== 'group' : type === draft.type))
            .map(([value, label]) => ({ value, label }))}
          onChange={(value) =>
            onChange({
              ...draft,
              type: value as TaskDraft['type'],
              effort: value === 'milestone' ? '0' : '-',
            })
          }
        />
      </div>
      {text('name', messages.taskName)}
      {text('criteria', messages.criteria)}
      {text('owner', messages.owner, 'text', draft.type === 'group')}
      <div className="task-editor-field">
        <span>{messages.status}</span>
        <FilterDropdown
          id="taskEditor-status"
          label={messages.status}
          value={draft.status}
          disabled={disabled || draft.type === 'group'}
          options={
            draft.type === 'group'
              ? [{ value: 'auto', label: messages.automatic }]
              : Object.entries(STATUS_NAMES).map(([value, label]) => ({ value, label }))
          }
          onChange={(value) => change('status', value)}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.parentId}</span>
        <FilterDropdown
          id="taskEditor-parent"
          label={messages.parentId}
          value={draft.parent}
          disabled={disabled}
          options={[
            { value: '-', label: messages.rootTask },
            ...model.rows
              .filter((row) => row.type === 'group' && row.id !== id)
              .map((row) => ({ value: row.id, label: row.id + ' · ' + row.name })),
          ]}
          onChange={(value) => change('parent', value)}
        />
      </div>
      {model.useEffort ? text('effort', messages.effort, 'number', draft.type !== 'task') : null}
      {text('start', messages.startDate, 'date', draft.type === 'group')}
      {text('end', messages.endDate, 'date', draft.type === 'group')}
      <div className="task-editor-field task-field-deps">
        <span>{messages.predecessors}</span>
        <SearchMultiSelect
          id="taskEditor-deps"
          label={messages.predecessors}
          placeholder={messages.searchPredecessors}
          options={model.rows
            .filter((row) => row.type !== 'group' && row.id !== id)
            .map((row) => ({ value: row.id, label: row.id + ' · ' + row.name }))}
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
          disabled={disabled || draft.type === 'group'}
          onChange={(values) => change('deps', values.join(', ') || '-')}
        />
      </div>
    </div>
  );
}
