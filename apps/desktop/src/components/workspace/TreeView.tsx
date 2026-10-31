import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { MilestoneSummary } from './MilestoneSummary';
import { messages } from '../../i18n/messages';
import { useMemo } from 'react';
import { summarizeGroups } from '@worktree/core/group-summary';
import { groupSchedule, groupEffort, groupProgress } from '../../views/group-summary';
import { STATUS_NAMES, type WorkRow } from '../../app/types';
import type { ListProps } from './types';
import { TaskCard } from './TaskCard';
import { Icon } from '../shared/Icon';
import { WorkGroupIcon } from '../shared/WorkGroupIcon';
import { UNASSIGNED_EPIC_GROUP } from '../../interactions/tree-group-state';
export function TreeView({
  rows,
  visibleIds,
  useEffort,
  collapsedGroups,
  onGroupToggle,
  showEmptyMilestones = true,
  ...props
}: ListProps & {
  visibleIds: Set<string>;
  useEffort: boolean;
  collapsedGroups: string[];
  onGroupToggle: (id: string, open: boolean) => void;
  showEmptyMilestones?: boolean;
}) {
  const { date } = useProjectDates();
  const summaries = useMemo(() => summarizeGroups(rows), [rows]);
  const children = useMemo(() => {
    const map = new Map<string, WorkRow[]>();
    for (const row of rows) map.set(row.parent, [...(map.get(row.parent) ?? []), row]);
    return map;
  }, [rows]);
  function branch(parent: string, kind?: 'epic' | 'milestone'): React.ReactNode[] {
    return (children.get(parent) ?? [])
      .filter((row) => parent !== '-' || row.type === 'group')
      .filter((row) => !kind || (kind === 'epic' ? row.epic : !row.epic))
      .flatMap((row) => {
        if (row.type !== 'group')
          return visibleIds.has(row.id)
            ? [
                <TaskCard
                  key={row.id}
                  row={row}
                  {...props}
                  selected={props.selectedId === row.id}
                />,
              ]
            : [];
        const content = branch(row.id);
        if (!content.length && !((row.milestone || row.epic) && showEmptyMilestones)) return [];
        const summary = summaries.get(row.id)!;
        return [
          <details
            className="group"
            key={row.id}
            open={!collapsedGroups.includes(row.id)}
            onToggle={(event) => {
              if (event.currentTarget.isConnected) onGroupToggle(row.id, event.currentTarget.open);
            }}
          >
            <summary
              data-work-id={row.id}
              className={props.selectedId === row.id ? 'detail-selected' : undefined}
              aria-current={props.selectedId === row.id ? 'true' : undefined}
            >
              <Icon name="chevron-right" className="tree-toggle" />
              {row.epic || row.milestone ? (
                <WorkGroupIcon epic={row.epic} icon={row.icon} iconColor={row.iconColor} />
              ) : null}
              <span className="tree-group-name" title={row.name}>
                {row.epic || row.milestone ? row.name : props.label(row.id) + ' · ' + row.name}
              </span>
              <span className={'tag ' + row.status}>{STATUS_NAMES[row.status]}</span>
              <button
                type="button"
                className="group-detail"
                data-id={row.id}
                aria-label={
                  row.name + (row.epic ? messages.epicDetailSuffix : messages.milestoneDetailSuffix)
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  props.onSelect(row.id);
                }}
              >
                {messages.details}
              </button>
              {row.milestone || row.epic ? (
                <MilestoneSummary row={row} summary={summary} />
              ) : (
                <span className="group-summary">
                  {groupSchedule(summary, date)}
                  {useEffort ? ' · ' + groupEffort(summary) + ' · ' + groupProgress(summary) : ''}
                </span>
              )}
            </summary>
            <div className="children">
              {content.length ? (
                content
              ) : (
                <p className="milestone-empty">
                  {row.epic ? messages.noEpicMilestones : messages.noMilestoneTasks}
                </p>
              )}
            </div>
          </details>,
        ];
      });
  }
  const unassignedMilestones = branch('-', 'milestone');
  const unassignedTasks = (children.get('-') ?? []).filter(
    (row) => row.type === 'task' && visibleIds.has(row.id),
  );
  return (
    <div className="tree-view">
      {branch('-', 'epic')}
      {unassignedMilestones.length || unassignedTasks.length ? (
        <details
          className="group unassigned-epics"
          open={!collapsedGroups.includes(UNASSIGNED_EPIC_GROUP)}
          onToggle={(event) => {
            if (event.currentTarget.isConnected)
              onGroupToggle(UNASSIGNED_EPIC_GROUP, event.currentTarget.open);
          }}
        >
          <summary data-view-group="unassigned-epics">
            <Icon name="chevron-right" className="tree-toggle" />
            {messages.unassignedEpic}
          </summary>
          <div className="children">
            {unassignedMilestones}
            {unassignedTasks.map((row) => (
              <TaskCard key={row.id} row={row} {...props} selected={props.selectedId === row.id} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
