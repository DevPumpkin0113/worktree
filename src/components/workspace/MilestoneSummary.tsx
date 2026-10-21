import { messages } from '../../i18n/messages';
import type { GroupSummary } from '../../domain/group-summary';
import type { WorkRow } from '../../domain/types';
export function MilestoneSummary({ row, summary }: { row: WorkRow; summary: GroupSummary }) {
  const percent = summary.taskCount
    ? Math.round((summary.completedTasks / summary.taskCount) * 100)
    : 0;
  return (
    <span className="milestone-summary">
      <span className="milestone-target">
        {messages.targetPeriod}:{' '}
        {row.start === '-' ? messages.unscheduled : row.start + ' ~ ' + row.end}
      </span>
      <span>
        {summary.completedTasks}/{summary.taskCount} · {percent}%
      </span>
      <progress max={100} value={percent} aria-label={messages.milestoneTaskProgress} />
    </span>
  );
}
