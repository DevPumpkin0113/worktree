import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { messages } from '../../i18n/messages';
import { TaskMetadata } from './TaskMetadata';
import { TaskContentMetadata } from './TaskContentMetadata';
import { Icon } from '../shared/Icon';
import { CircleDot } from 'lucide-react';
import { summarizeGroups } from '@worktree/core/group-summary';
import { groupEffort, groupProgress, groupSchedule } from '../../views/group-summary';
import { STATUS_NAMES, type WorkModel, type WorkRow } from '../../app/types';
export function TaskInfo({
  row,
  model,
  label,
  onSelect,
  onDelete,
}: {
  row: WorkRow;
  model: WorkModel;
  label: (id: string) => string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { date } = useProjectDates();
  const byId = new Map(model.rows.map((item) => [item.id, item]));
  const parent = byId.get(row.parent);
  const milestone = parent?.milestone ? parent : undefined;
  const epic = parent?.epic ? parent : milestone ? byId.get(milestone.parent) : undefined;
  const isGroup = row.type === 'group';
  const children = model.rows.filter((item) => item.parent === row.id),
    previous = row.deps.map((id) => byId.get(id)!).filter(Boolean),
    next = model.rows.filter((item) => item.deps.includes(row.id));
  const summaries = summarizeGroups(model.rows);
  const group = row.type === 'group' ? summaries.get(row.id) : null;
  const facts = group
    ? [
        ...(row.epic || row.milestone
          ? [
              [
                messages.targetPeriod,
                row.start === '-' ? messages.unscheduled : date(row.start) + ' ~ ' + date(row.end),
              ],
              [
                messages.milestoneTaskProgress,
                (group.taskCount ? Math.round((group.completedTasks / group.taskCount) * 100) : 0) +
                  '%',
              ],
            ]
          : []),
        [messages.aggregateSchedule, groupSchedule(group, date)],
        [messages.aggregateEffort, groupEffort(group)],
        [
          messages.children,
          group.completedTasks + ' / ' + group.taskCount + messages.completedSuffix,
        ],
        [messages.progress, groupProgress(group)],
      ]
    : [
        [messages.startDate, row.start === '-' ? messages.unknown : date(row.start)],
        [messages.endDate, row.end === '-' ? messages.unknown : date(row.end)],
      ];
  const links = (items: WorkRow[], childList = false) =>
    items.length ? (
      items.map((item) => (
        <button
          className="detail-link"
          key={item.id}
          data-detail={item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.milestone ? (
            <Icon name="milestone-diamond" className="detail-link-milestone-icon" />
          ) : childList ? (
            <CircleDot className="detail-child-issue-icon" size={16} strokeWidth={1.5} />
          ) : null}
          {childList || item.type === 'task' ? (
            <span className="detail-link-id">{label(item.id)}</span>
          ) : null}
          <span className="detail-link-name" title={childList ? item.name : undefined}>
            {item.name}
          </span>
          {item.milestone ? (
            <span className="detail-link-count">
              {summaries.get(item.id)?.completedTasks ?? 0}/{summaries.get(item.id)?.taskCount ?? 0}
            </span>
          ) : childList ? (
            <span className="detail-link-count" aria-hidden="true" />
          ) : null}
          <span className={'detail-status ' + item.status}>{STATUS_NAMES[item.status]}</span>
          <span aria-hidden="true">›</span>
        </button>
      ))
    ) : (
      <p className="detail-empty">{messages.noRelatedTasks}</p>
    );
  return (
    <>
      <nav className="detail-breadcrumb" aria-label={messages.ancestors}>
        <span>{model.title}</span>
        {!row.epic ? (
          epic ? (
            <button type="button" className="detail-link" onClick={() => onSelect(epic.id)}>
              {label(epic.id) + ' · ' + epic.name}
            </button>
          ) : (
            <span>{messages.unassignedEpic}</span>
          )
        ) : null}
      </nav>
      <div className={'detail-info-layout' + (isGroup ? ' detail-info-milestone' : '')}>
        <div className="detail-main">
          <div className="detail-facts">
            {facts
              .filter(
                ([name]) =>
                  model.useEffort ||
                  ![messages.aggregateEffort, messages.effort, messages.progress].includes(name),
              )
              .map(([name, value]) => (
                <div className="detail-fact" key={name}>
                  <span>{name}</span>
                  <strong>{value}</strong>
                </div>
              ))}
          </div>
          {!isGroup ? (
            <section className="detail-section description-section">
              <div className="detail-section-heading">
                <h3>{messages.description}</h3>
                {row.status === 'done' ? (
                  <span className="detail-complete">{messages.recordedDone}</span>
                ) : null}
              </div>
              <p className="detail-description">{row.description || messages.noDescription}</p>
              {row.status === 'blocked' ? (
                <p className="detail-blocked">{messages.blockedHint}</p>
              ) : null}
            </section>
          ) : null}
          {!isGroup ? <TaskContentMetadata row={row} /> : null}
          {children.length ? (
            <section className="detail-section detail-children">
              <h3>
                {messages.children + ' '}
                <span>{children.length}</span>
              </h3>
              <div className="detail-child-list">{links(children, true)}</div>
            </section>
          ) : null}
          {!isGroup ? (
            <div className="detail-relations">
              {[
                [messages.predecessors, previous],
                [messages.successors, next],
              ].map(([name, items]) => (
                <section className="detail-section" key={name as string}>
                  <h3>
                    {name as string} <span>{(items as WorkRow[]).length}</span>
                  </h3>
                  <p className="detail-section-note">
                    {name === messages.predecessors
                      ? messages.predecessorHint
                      : messages.successorHint}
                  </p>
                  {links(items as WorkRow[])}
                </section>
              ))}
            </div>
          ) : null}
        </div>
        {!isGroup ? (
          <aside className="detail-sub">
            <TaskMetadata
              row={row}
              priorities={model.priorities}
              useEffort={model.useEffort}
              epic={
                epic ? (
                  <button
                    type="button"
                    className="detail-milestone-link"
                    data-detail={epic.id}
                    onClick={() => onSelect(epic.id)}
                  >
                    {label(epic.id) + ' · ' + epic.name}
                  </button>
                ) : (
                  messages.unassignedEpic
                )
              }
              milestone={
                milestone ? (
                  <button
                    type="button"
                    className="detail-milestone-link"
                    data-detail={milestone.id}
                    onClick={() => onSelect(milestone.id)}
                  >
                    {label(milestone.id) + ' · ' + milestone.name}
                  </button>
                ) : (
                  messages.unassignedMilestone
                )
              }
            />
          </aside>
        ) : null}
      </div>
      <div className="detail-info-actions">
        {!isGroup ? (
          <details className="detail-identifiers">
            <summary>{messages.identifiers}</summary>
            <dl>
              <dt>{messages.displayId}</dt>
              <dd>{label(row.id)}</dd>
              <dt>{messages.sourceId}</dt>
              <dd>{row.id}</dd>
              <dt>
                {parent?.epic
                  ? messages.epic
                  : parent?.milestone
                    ? messages.parentMilestone
                    : messages.parentId}
              </dt>
              <dd>{row.parent === '-' ? messages.none : parent ? parent.name : row.parent}</dd>
            </dl>
          </details>
        ) : null}
        <button
          data-variant="danger"
          data-size="compact"
          type="button"
          id="taskDeleteOpen"
          className="task-delete-open action-button"
          onClick={() => onDelete(row.id)}
        >
          {messages.delete}
        </button>
      </div>
    </>
  );
}
