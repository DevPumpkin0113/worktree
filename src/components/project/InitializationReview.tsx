import { PriorityList } from './PriorityList';
import { Fragment, type ReactNode } from 'react';
import { BadgeList } from '../shared/BadgeList';
import { projectRuleValues } from '../../domain/project-initialization';
import { messages } from '../../i18n/messages';
import type { ProjectInitializationDraft } from '../../domain/project-initialization';
export function InitializationReview({
  draft,
  root,
}: {
  draft: ProjectInitializationDraft;
  root: string;
}) {
  const labels = projectRuleValues(draft.labels);
  const assignees = projectRuleValues(draft.assignees);
  const rows: [string, ReactNode][][] = [
    [[messages.projectName, draft.name]],
    [[messages.projectFolder, root.replaceAll('/', '\\')]],
    [[messages.dataDirectory, draft.directory.replaceAll('/', '\\')]],
    [
      [messages.idPrefix, draft.prefix],
      [messages.idSeparator, draft.idSeparator === 'hyphen' ? messages.hyphen : messages.none],
    ],
    [
      [messages.dateFormat, draft.dateFormat],
      [messages.timeFormat, draft.timeFormat === '12h' ? messages.time12Hour : messages.time24Hour],
    ],
    [
      [
        messages.workTypes,
        <BadgeList values={projectRuleValues(draft.taskTypes)} colors={draft.taskTypeColors} />,
      ],
    ],
    [[messages.labels, labels.length ? <BadgeList values={labels} /> : messages.none]],
    [[messages.assignees, assignees.length ? <BadgeList values={assignees} /> : messages.none]],
    [[messages.priorities, <PriorityList values={draft.priorities} />]],
    [[messages.effort, draft.useEffort ? messages.enabled : messages.disabled]],
  ];
  return (
    <div className="project-management-section initialization-review">
      <dl>
        {rows.map((row) => (
          <div
            key={row[0][0]}
            className={row.length > 1 ? 'initialization-review-pair' : undefined}
          >
            {row.map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </div>
        ))}
      </dl>
    </div>
  );
}
