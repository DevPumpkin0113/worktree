import { messages } from '../../i18n/messages';
import { summarizeGroups } from '../../domain/group-summary';
import { groupEffort, groupProgress, groupSchedule } from '../../views/group-summary';
import { STATUS_NAMES, type WorkModel, type WorkRow } from '../../app/types';
export function TaskInfo({
  row,
  model,
  label,
  onSelect,
}: {
  row: WorkRow;
  model: WorkModel;
  label: (id: string) => string;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(model.rows.map((item) => [item.id, item]));
  const ancestors: WorkRow[] = [];
  let parent = byId.get(row.parent);
  while (parent) {
    ancestors.unshift(parent);
    parent = byId.get(parent.parent);
  }
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
                row.start === '-' ? messages.unscheduled : row.start + ' ~ ' + row.end,
              ],
              [
                messages.milestoneTaskProgress,
                (group.taskCount ? Math.round((group.completedTasks / group.taskCount) * 100) : 0) +
                  '%',
              ],
            ]
          : []),
        [messages.aggregateSchedule, groupSchedule(group)],
        [messages.aggregateEffort, groupEffort(group)],
        [
          messages.children,
          group.completedTasks + ' / ' + group.taskCount + messages.completedSuffix,
        ],
        ...(!row.milestone
          ? [
              [
                messages.milestone,
                group.completedMilestones + ' / ' + group.milestoneCount + messages.completedSuffix,
              ],
            ]
          : []),
        [messages.progress, groupProgress(group)],
      ]
    : [
        [messages.owner, row.owner === '-' ? messages.unknown : row.owner],
        [messages.effort, row.effort === '-' ? messages.unknown : row.effort + ' h'],
        [messages.startDate, row.start === '-' ? messages.unknown : row.start],
        [messages.endDate, row.end === '-' ? messages.unknown : row.end],
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
      <nav className="detail-breadcrumb" aria-label={messages.ancestors}>
        {ancestors.length ? (
          ancestors.map((item) => (
            <button key={item.id} data-detail={item.id} onClick={() => onSelect(item.id)}>
              {item.name}
            </button>
          ))
        ) : (
          <span>{messages.rootTask}</span>
        )}
      </nav>
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
      <section className="detail-section criteria-section">
        <div className="detail-section-heading">
          <h3>{messages.criteria}</h3>
          {row.status === 'done' ? (
            <span className="detail-complete">{messages.recordedDone}</span>
          ) : null}
        </div>
        <p className="detail-criteria">{row.criteria || messages.noCriteria}</p>
        {row.status === 'blocked' ? <p className="detail-blocked">{messages.blockedHint}</p> : null}
      </section>
      {children.length ? (
        <section className="detail-section">
          <h3>
            {messages.children + ' '}
            <span>{children.length}</span>
          </h3>
          {links(children)}
        </section>
      ) : null}
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
              {name === messages.predecessors ? messages.predecessorHint : messages.successorHint}
            </p>
            {links(items as WorkRow[])}
          </section>
        ))}
      </div>
      {!row.milestone ? (
        <details className="detail-identifiers">
          <summary>{messages.identifiers}</summary>
          <dl>
            <dt>{messages.displayId}</dt>
            <dd>{label(row.id)}</dd>
            <dt>{messages.sourceId}</dt>
            <dd>{row.id}</dd>
            <dt>{messages.parentId}</dt>
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
    </>
  );
}
