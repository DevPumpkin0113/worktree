import { ProjectDateTimeFormat } from './ProjectDateTimeFormat';
import { ProjectEffortSetting } from './ProjectEffortSetting';
import { PriorityList } from './PriorityList';
import { PriorityListEditor } from './PriorityListEditor';
import { BadgeInput } from '../shared/BadgeInput';
import { BadgeList } from '../shared/BadgeList';
import { projectRuleValues } from '@worktree/core/project-initialization';
import { DateTimeFormatInput } from '../shared/DateTimeFormatInput';
import { ProjectIdFormat } from './ProjectIdFormat';
import type { ReactNode } from 'react';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type OpenProject, type WorkModel } from '../../app/types';
import { folderName } from '@worktree/core/project-paths';
import type { ProjectSettingsDraft } from '@worktree/core/project-settings';
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
  const fixed = (index: number, value: string) =>
    editing ? <input id={'projectFixed-' + index} value={value} disabled title={value} /> : value;
  const row = (label: ReactNode, value: ReactNode, id?: string) => (
    <div key={id ?? (typeof label === 'string' ? label : 'labels')}>
      <dt>{id && editing ? <label htmlFor={id}>{label}</label> : label}</dt>
      <dd>{value}</dd>
    </div>
  );
  return (
    <div className="project-overview project-overview-review">
      <section className="project-management-section">
        <h3>{messages.basicInfo}</h3>
        <dl>
          {row(
            messages.projectName,
            editing ? (
              <input
                id="projectSettings-name"
                required
                maxLength={200}
                value={draft!.name}
                onChange={(event) => onChange!({ name: event.target.value })}
              />
            ) : (
              (model?.title ?? folderName(project.path))
            ),
            'projectSettings-name',
          )}
          {row(
            messages.projectFolder,
            fixed(0, project.path.replaceAll('/', '\\')),
            'projectFixed-0',
          )}
          {row(
            messages.dataDirectory,
            fixed(1, model?.dataDirectory?.replaceAll('/', '\\') ?? '—'),
            'projectFixed-1',
          )}
          {row(
            messages.idFormat,
            <ProjectIdFormat
              prefix={model?.idPrefix ?? '—'}
              separator={draft?.idSeparator ?? model?.idSeparator ?? 'none'}
              onChange={editing ? (idSeparator) => onChange!({ idSeparator }) : undefined}
            />,
          )}
          {row(
            messages.dateTimeDisplay,
            editing ? (
              <DateTimeFormatInput
                id="projectSettings-format"
                dateFormat={draft!.dateFormat}
                timeFormat={draft!.timeFormat}
                onChange={onChange!}
              />
            ) : model ? (
              <ProjectDateTimeFormat dateFormat={model.dateFormat} timeFormat={model.timeFormat} />
            ) : (
              '—'
            ),
          )}
        </dl>
      </section>
      <section className="project-management-section">
        <h3>{messages.workRules}</h3>
        <dl>
          {row(
            messages.workTypes,
            editing ? (
              <BadgeInput
                id="projectSettings-taskTypes"
                label={messages.workTypes}
                required
                values={projectRuleValues(draft!.taskTypes)}
                colors={draft!.taskTypeColors}
                locked={
                  model?.rows.filter((row) => !row.milestone).map((row) => row.taskType!) ?? []
                }
                onChange={(values) =>
                  onChange!({
                    taskTypes: values.join(', '),
                    taskTypeColors: Object.fromEntries(
                      Object.entries(draft!.taskTypeColors).filter(([type]) =>
                        values.includes(type),
                      ),
                    ),
                  })
                }
                onColorChange={(type, color) =>
                  onChange!({ taskTypeColors: { ...draft!.taskTypeColors, [type]: color } })
                }
              />
            ) : (
              <BadgeList values={model?.taskTypes ?? []} colors={model?.taskTypeColors} />
            ),
            'projectSettings-taskTypes',
          )}
          {row(
            messages.labels,
            editing ? (
              <BadgeInput
                id="projectSettings-labels"
                label={messages.labels}
                values={projectRuleValues(draft!.labels)}
                onChange={(values) => onChange!({ labels: values.join(', ') })}
              />
            ) : model?.commonLabels?.length ? (
              <BadgeList values={model.commonLabels} />
            ) : (
              messages.none
            ),
            'projectSettings-labels',
          )}
          {row(
            messages.assignees,
            editing ? (
              <BadgeInput
                id="projectSettings-assignees"
                label={messages.assignees}
                values={projectRuleValues(draft!.assignees)}
                onChange={(values) => onChange!({ assignees: values.join(', ') })}
              />
            ) : model?.assignees?.length ? (
              <BadgeList values={model.assignees} />
            ) : (
              messages.none
            ),
            'projectSettings-assignees',
          )}
          {row(
            messages.priorities,
            editing ? (
              <PriorityListEditor
                id="projectSettings-priorities"
                value={draft!.priorities}
                locked={model?.rows.filter((r) => !r.milestone).map((r) => r.priority ?? '-') ?? []}
                onChange={(priorities) => onChange!({ priorities })}
              />
            ) : (
              <PriorityList values={model?.priorities ?? []} />
            ),
            'projectSettings-priorities',
          )}
          {row(
            messages.effort,
            editing || model ? (
              <ProjectEffortSetting
                value={draft?.useEffort ?? model?.useEffort ?? false}
                onChange={editing ? (useEffort) => onChange!({ useEffort }) : undefined}
              />
            ) : (
              '—'
            ),
            'projectSettings-useEffort',
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
