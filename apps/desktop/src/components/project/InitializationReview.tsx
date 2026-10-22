import { ProjectIdFormat } from './ProjectIdFormat';
import { ProjectDateTimeFormat } from './ProjectDateTimeFormat';
import { ProjectEffortSetting } from './ProjectEffortSetting';
import { PriorityList } from './PriorityList';
import type { ReactNode } from 'react';
import { BadgeList } from '../shared/BadgeList';
import { projectRuleValues } from '@worktree/core/project-initialization';
import { messages } from '../../i18n/messages';
import type { ProjectInitializationDraft } from '@worktree/core/project-initialization';
export function InitializationReview({
  draft,
  root,
}: {
  draft: ProjectInitializationDraft;
  root: string;
}) {
  const labels = projectRuleValues(draft.labels);
  const assignees = projectRuleValues(draft.assignees);
  const rows: [string, ReactNode][] = [
    [messages.projectName, draft.name],
    [messages.projectFolder, root.replaceAll('/', '\\')],
    [messages.dataDirectory, draft.directory.replaceAll('/', '\\')],
    [messages.idFormat, <ProjectIdFormat prefix={draft.prefix} separator={draft.idSeparator} />],
    [
      messages.dateTimeDisplay,
      <ProjectDateTimeFormat dateFormat={draft.dateFormat} timeFormat={draft.timeFormat} />,
    ],
    [
      messages.workTypes,
      <BadgeList values={projectRuleValues(draft.taskTypes)} colors={draft.taskTypeColors} />,
    ],
    [messages.labels, labels.length ? <BadgeList values={labels} /> : messages.none],
    [messages.assignees, assignees.length ? <BadgeList values={assignees} /> : messages.none],
    [messages.priorities, <PriorityList values={draft.priorities} />],
    [messages.effort, <ProjectEffortSetting id="initializationReview" value={draft.useEffort} />],
  ];
  return (
    <div className="project-management-section initialization-review">
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
