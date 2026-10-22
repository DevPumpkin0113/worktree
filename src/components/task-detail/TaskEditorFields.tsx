import { TaskMetadataFields } from './TaskMetadataFields';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type WorkModel } from '../../app/types';
import { SearchMultiSelect } from '../shared/SearchMultiSelect';
import { FilterDropdown } from '../shared/FilterDropdown';
import type { ProjectTaskDraft } from '../../domain/task-editing';
import { useContext, useMemo } from 'react';
import { TaskFieldError, TaskFieldErrorsContext } from './TaskFieldError';
import { createIdLabels } from '../../domain/id-display';
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
  const errors = useContext(TaskFieldErrorsContext);
  const labels = useMemo(() => createIdLabels(model, model.idSeparator ?? 'none'), [model]);
  const successors = model.rows.filter((row) => row.deps.includes(id));
  const change = (key: keyof ProjectTaskDraft, value: string) =>
    onChange({ ...draft, [key]: value });
  const text = (key: 'start' | 'end' | 'effort', label: string, type = 'text', locked = false) => (
    <label className={'task-editor-field task-field-' + key} key={key}>
      <span>{label}</span>
      <input
        id={'taskEditor-' + key}
        data-editor-field={key}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? 'taskEditor-' + key + '-error' : undefined}
        type={type}
        value={(type === 'date' || type === 'number') && draft[key] === '-' ? '' : draft[key]}
        disabled={disabled || locked}
        step={type === 'number' ? 'any' : undefined}
        onChange={(event) => change(key, event.target.value)}
      />
      <TaskFieldError field={key} />
    </label>
  );
  return (
    <div className="task-editor-fields">
      <div className="task-editor-main">
        {text('start', messages.startDate, 'date')}
        {text('end', messages.endDate, 'date')}
        <TaskMetadataFields
          draft={draft}
          model={model}
          disabled={disabled}
          onChange={onChange}
          section="main"
        />
        <div className="task-editor-field task-field-predecessors">
          <span>{messages.predecessors}</span>
          <SearchMultiSelect
            id="taskEditor-deps"
            invalid={!!errors.deps}
            describedBy={errors.deps ? 'taskEditor-deps-error' : undefined}
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
          <TaskFieldError field="deps" />
        </div>
        <div className="task-editor-field task-field-successors">
          <span>{messages.successors}</span>
          {successors.length ? (
            <ul className="task-successor-summary">
              {successors.map((row) => (
                <li key={row.id}>{(labels.get(row.id) ?? row.id) + ' · ' + row.name}</li>
              ))}
            </ul>
          ) : (
            <p className="task-successor-empty">{messages.noRelatedTasks}</p>
          )}
        </div>
      </div>
      <div className="task-editor-sub">
        <div className="task-editor-field">
          <span>{messages.parentMilestone}</span>
          <FilterDropdown
            id="taskEditor-parent"
            invalid={!!errors.parent}
            describedBy={errors.parent ? 'taskEditor-parent-error' : undefined}
            label={messages.parentMilestone}
            value={draft.parent}
            disabled={disabled}
            options={[
              { value: '-', label: messages.unassignedMilestone },
              ...model.rows
                .filter((row) => row.type === 'group' && row.id !== id)
                .map((row) => ({
                  value: row.id,
                  label: (labels.get(row.id) ?? row.id) + ' · ' + row.name,
                })),
            ]}
            onChange={(value) => change('parent', value)}
          />
          <TaskFieldError field="parent" />
        </div>
        <div className="task-editor-field task-field-owner">
          <span>{messages.owner}</span>
          <FilterDropdown
            id="taskEditor-owner"
            invalid={!!errors.owner}
            describedBy={errors.owner ? 'taskEditor-owner-error' : undefined}
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
          <TaskFieldError field="owner" />
        </div>
        <div className="task-editor-field">
          <span>{messages.status}</span>
          <FilterDropdown
            id="taskEditor-status"
            invalid={!!errors.status}
            describedBy={errors.status ? 'taskEditor-status-error' : undefined}
            label={messages.status}
            value={draft.status}
            disabled={disabled}
            options={Object.entries(STATUS_NAMES).map(([value, label]) => ({ value, label }))}
            onChange={(value) => change('status', value)}
          />
          <TaskFieldError field="status" />
        </div>
        <TaskMetadataFields
          draft={draft}
          model={model}
          disabled={disabled}
          onChange={onChange}
          section="side"
        />
        {model.useEffort ? text('effort', messages.effort, 'number', draft.type !== 'task') : null}
      </div>
    </div>
  );
}
