import { PriorityList } from './PriorityList';
import { PriorityListEditor } from './PriorityListEditor';
import { BadgeInput } from '../shared/BadgeInput';
import { BadgeList } from '../shared/BadgeList';
import { projectRuleValues } from '../../domain/project-initialization';
import { DateTimeFormatInput } from '../shared/DateTimeFormatInput';
import { IdSeparatorInput } from '../shared/IdSeparatorInput';
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
  const fixed = (index: number, value: string) =>
    editing ? <input id={'projectFixed-' + index} value={value} disabled title={value} /> : value;
  const row = (label: ReactNode, value: ReactNode, id?: string) => (
    <div key={id ?? (typeof label === 'string' ? label : 'labels')}>
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
          {row(messages.projectFolder, fixed(0, project.path), 'projectFixed-0')}
          {row(messages.dataDirectory, fixed(1, model?.dataDirectory ?? '—'), 'projectFixed-1')}
          {row(messages.idPrefix, fixed(2, model?.idPrefix ?? '—'), 'projectFixed-2')}
          {row(
            messages.idSeparator,
            editing ? (
              <IdSeparatorInput
                id="projectSettings-idSeparator"
                prefix={model?.idPrefix ?? 'W'}
                value={draft!.idSeparator}
                onChange={(idSeparator) => onChange!({ idSeparator })}
              />
            ) : model ? (
              model.idSeparator === 'hyphen' ? (
                messages.hyphen
              ) : (
                messages.none
              )
            ) : (
              '—'
            ),
            'projectSettings-idSeparator',
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
              `${model.dateFormat ?? 'yyyy-MM-dd'} · ${model.timeFormat === '12h' ? messages.time12Hour : messages.time24Hour}`
            ) : (
              '—'
            ),
          )}
          {row(
            <span>
              {messages.useEffort}
              <small className="project-label-examples" id="projectSettings-effort-hint">
                {messages.effortHint}
              </small>
            </span>,
            editing ? (
              <input
                id="projectSettings-useEffort"
                aria-describedby="projectSettings-effort-hint"
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
            messages.assignees,
            editing ? (
              <BadgeInput
                id="projectSettings-assignees"
                label={messages.assignees}
                values={projectRuleValues(draft!.assignees)}
                onChange={(values) => onChange!({ assignees: values.join(', ') })}
              />
            ) : (
              <BadgeList values={model?.assignees ?? []} />
            ),
            'projectSettings-assignees',
          )}

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
            <span>
              {messages.labels}
              <small className="project-label-examples">{messages.commonLabelExamples}</small>
            </span>,
            editing ? (
              <BadgeInput
                id="projectSettings-labels"
                label={messages.labels}
                values={projectRuleValues(draft!.labels)}
                onChange={(values) => onChange!({ labels: values.join(', ') })}
              />
            ) : (
              <BadgeList values={model?.commonLabels ?? model?.labels ?? []} />
            ),
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
