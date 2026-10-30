import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { TaskCountProgress } from './TaskCountProgress';
import { messages } from '../../i18n/messages';
import type { GroupSummary } from '@worktree/core/group-summary';
import type { WorkRow } from '@worktree/core/types';
export function MilestoneSummary({ row, summary }: { row: WorkRow; summary: GroupSummary }) {
  const { date } = useProjectDates();
  return (
    <span className="milestone-summary">
      {row.start !== '-' ? (
        <span className="milestone-target">
          {messages.targetPeriod}: {date(row.start) + ' ~ ' + date(row.end)}
        </span>
      ) : null}
      <TaskCountProgress completed={summary.completedTasks} total={summary.taskCount} />
    </span>
  );
}
