import type { ReactNode } from 'react';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type OpenProject, type WorkModel } from '../../app/types';
import { folderName } from '../../domain/project-paths';
import type { ProjectSettingsDraft } from '../../domain/project-settings';
export function ProjectOverview({
  model,
  project,
  draft,
  onChange,
}: {
  model: WorkModel | null;
  project: OpenProject;
  draft?: ProjectSettingsDraft;
  onChange?: (change: Partial<ProjectSettingsDraft>) => void;
}) {
  const editing = !!draft && !!onChange;
  const text = (key: 'name' | 'taskTypes' | 'labels', value: string, hint?: string) =>
    editing ? (
      <>
        <input
          id={'projectSettings-' + key}
          value={draft![key]}
          required={key !== 'labels'}
          maxLength={key === 'name' ? 200 : undefined}
          onChange={(event) => onChange!({ [key]: event.target.value })}
        />
        {hint ? <small>{hint}</small> : null}
      </>
    ) : (
      value
    );
  const fixed = (index: number, value: string) =>
    editing ? <input id={'projectFixed-' + index} value={value} disabled title={value} /> : value;
  const row = (label: string, value: ReactNode, id?: string) => (
    <div key={label}>
      <dt>{id && editing ? <label htmlFor={id}>{label}</label> : label}</dt>
      <dd>{value}</dd>
    </div>
  );
  return (
    <div className="project-overview">
      <section className="project-management-section">
        <h3>{messages.basicInfo}</h3>
        <dl>
          {row(
            messages.projectName,
            text('name', model?.title ?? folderName(project.path)),
            'projectSettings-name',
          )}
          {row(messages.projectFolder, fixed(0, project.path), 'projectFixed-0')}
          {row(messages.dataDirectory, fixed(1, model?.dataDirectory ?? '—'), 'projectFixed-1')}
          {row(messages.idPrefix, fixed(2, model?.idPrefix ?? '—'), 'projectFixed-2')}
          {row(
            messages.useEffort,
            editing ? (
              <input
                id="projectSettings-useEffort"
                type="checkbox"
                checked={draft!.useEffort}
                onChange={(event) => onChange!({ useEffort: event.target.checked })}
              />
            ) : model ? (
              model.useEffort ? (
                messages.enabled
              ) : (
                messages.disabled
              )
            ) : (
              '—'
            ),
            'projectSettings-useEffort',
          )}
        </dl>
      </section>
      <section className="project-management-section">
        <h3>{messages.workRules}</h3>
        <dl>
          {row(
            messages.workTypes,
            text('taskTypes', model?.taskTypes?.join(' · ') ?? '—', messages.projectTypesHint),
            'projectSettings-taskTypes',
          )}
          {row(
            messages.labels,
            text('labels', model?.labels?.join(' · ') || '—', messages.projectLabelsHint),
            'projectSettings-labels',
          )}
          {row(
            messages.workStatuses,
            fixed(3, Object.values(STATUS_NAMES).join(' · ')),
            'projectFixed-3',
          )}
        </dl>
        <p className="project-rule-note">{messages.commonRulesHint}</p>
      </section>
    </div>
  );
}
