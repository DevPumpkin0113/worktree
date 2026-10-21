import { useProjectDates } from '../project/ProjectDateFormatProvider';
import { TaskCountProgress } from './TaskCountProgress';
import { messages } from '../../i18n/messages';
import type { GroupSummary } from '../../domain/group-summary';
import type { WorkRow } from '../../domain/types';
export function MilestoneSummary({ row, summary }: { row: WorkRow; summary: GroupSummary }) {
  const { date } = useProjectDates();
  return (
    <span className="milestone-summary">
      <span className="milestone-target">
        {messages.targetPeriod}:{' '}
        {row.start === '-' ? messages.unscheduled : date(row.start) + ' ~ ' + date(row.end)}
      </span>
      <TaskCountProgress completed={summary.completedTasks} total={summary.taskCount} />
    </span>
  );
}
