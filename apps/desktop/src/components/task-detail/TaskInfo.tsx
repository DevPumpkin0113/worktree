import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { messages } from '../../i18n/messages';
import { TaskMetadata } from './TaskMetadata';
import { TaskContentMetadata } from './TaskContentMetadata';
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
  const milestone = byId.get(row.parent);
  const children = model.rows.filter((item) => item.parent === row.id),
    previous = row.deps.map((id) => byId.get(id)!).filter(Boolean),
    next = model.rows.filter((item) => item.deps.includes(row.id));
  const group = row.type === 'group' ? summarizeGroups(model.rows).get(row.id) : null;
  const facts = group
    ? [
        ...(row.milestone
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
  const links = (items: WorkRow[]) =>
    items.length ? (
      items.map((item) => (
        <button
          className="detail-link"
          key={item.id}
          data-detail={item.id}
          onClick={() => onSelect(item.id)}
        >
          {!item.milestone ? <span className="detail-link-id">{label(item.id)}</span> : null}
          <span className="detail-link-name">{item.name}</span>
          <span className={'detail-status ' + item.status}>{STATUS_NAMES[item.status]}</span>
          <span aria-hidden="true">›</span>
        </button>
      ))
    ) : (
      <p className="detail-empty">{messages.noRelatedTasks}</p>
    );
  return (
    <>
      {row.milestone ? (
        <nav className="detail-breadcrumb" aria-label={messages.ancestors}>
          <span>{model.title}</span>
        </nav>
      ) : null}
      <div className={'detail-info-layout' + (row.milestone ? ' detail-info-milestone' : '')}>
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
          {!row.milestone ? (
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
          {!row.milestone ? <TaskContentMetadata row={row} /> : null}
          {children.length ? (
            <section className="detail-section">
              <h3>
                {messages.children + ' '}
                <span>{children.length}</span>
              </h3>
              {links(children)}
            </section>
          ) : null}
          {!row.milestone ? (
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
        {!row.milestone ? (
          <aside className="detail-sub">
            <TaskMetadata
              row={row}
              priorities={model.priorities}
              useEffort={model.useEffort}
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
        {!row.milestone ? (
          <details className="detail-identifiers">
            <summary>{messages.identifiers}</summary>
            <dl>
              <dt>{messages.displayId}</dt>
              <dd>{label(row.id)}</dd>
              <dt>{messages.sourceId}</dt>
              <dd>{row.id}</dd>
              <dt>
                {byId.get(row.parent)?.milestone ? messages.parentMilestone : messages.parentId}
              </dt>
              <dd>
                {row.parent === '-'
                  ? messages.none
                  : byId.get(row.parent)?.milestone
                    ? byId.get(row.parent)!.name
                    : row.parent}
              </dd>
            </dl>
          </details>
        ) : null}
        <button
          type="button"
          id="taskDeleteOpen"
          className="task-delete-open"
          onClick={() => onDelete(row.id)}
        >
          {messages.delete}
        </button>
      </div>
    </>
  );
}
