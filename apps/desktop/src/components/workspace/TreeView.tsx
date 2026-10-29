import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { UnassignedTasks } from './UnassignedTasks';
import { MilestoneSummary } from './MilestoneSummary';
import { messages } from '../../i18n/messages';
import { useMemo } from 'react';
import { summarizeGroups } from '@worktree/core/group-summary';
import { groupSchedule, groupEffort, groupProgress } from '../../views/group-summary';
import { STATUS_NAMES, type WorkRow } from '../../app/types';
import type { ListProps } from './types';
import { TaskCard } from './TaskCard';
export function TreeView({
  rows,
  visibleIds,
  useEffort,
  onToggle,
  showEmptyMilestones = true,
  ...props
}: ListProps & {
  visibleIds: Set<string>;
  useEffort: boolean;
  onToggle: () => void;
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
          <details className="group" key={row.id} open onToggle={onToggle}>
            <summary
              data-work-id={row.id}
              className={props.selectedId === row.id ? 'detail-selected' : undefined}
              aria-current={props.selectedId === row.id ? 'true' : undefined}
            >
              {row.epic || row.milestone ? (
                <span className="milestone-label">
                  {row.epic ? messages.epic : messages.milestone}
                </span>
              ) : null}
              {row.epic || row.milestone ? row.name : props.label(row.id) + ' · ' + row.name}{' '}
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
  return (
    <>
      {branch('-', 'epic')}
      {unassignedMilestones.length ? (
        <details className="group unassigned-epics" open onToggle={onToggle}>
          <summary data-view-group="unassigned-epics">{messages.unassignedEpic}</summary>
          <div className="children">{unassignedMilestones}</div>
        </details>
      ) : null}
      <UnassignedTasks
        rows={(children.get('-') ?? []).filter((row) => row.type === 'task')}
        visibleIds={visibleIds}
        onToggle={onToggle}
        {...props}
      />
    </>
  );
}
