import { TaskCountProgress } from './TaskCountProgress';
import { messages } from '../../i18n/messages';
import type { GroupSummary } from '../../domain/group-summary';
import type { WorkRow } from '../../domain/types';
export function MilestoneSummary({ row, summary }: { row: WorkRow; summary: GroupSummary }) {
  return (
    <span className="milestone-summary">
      <span className="milestone-target">
        {messages.targetPeriod}:{' '}
        {row.start === '-' ? messages.unscheduled : row.start + ' ~ ' + row.end}
      </span>
      <TaskCountProgress completed={summary.completedTasks} total={summary.taskCount} />
    </span>
  );
}
