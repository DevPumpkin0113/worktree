import { messages } from '../../i18n/messages';
import type { summarizeWork } from '@worktree/core/work-summary';
export function MetricsContent({
  summary,
  useEffort,
}: {
  summary: ReturnType<typeof summarizeWork>;
  useEffort: boolean;
}) {
  const progress = summary.taskProgress === null ? messages.noTasks : summary.taskProgress + '%';
  return (
    <div id="metrics" className={'metrics' + (!useEffort ? ' without-effort' : '')}>
      <div className="metric">
        <span>{messages.task}</span>
        <strong>
          {summary.completedTasks} / {summary.taskCount}
        </strong>
        <small className="metric-detail">{messages.completedTotal}</small>
      </div>
      <div className="metric">
        <span>{messages.milestone}</span>
        <strong>
          {summary.completedMilestones} / {summary.milestoneCount}
        </strong>
        <small className="metric-detail">{messages.completedTotal}</small>
      </div>
      <div className="metric metric-progress">
        <span>{messages.completionRate}</span>
        <strong>{progress}</strong>
        <progress
          max="100"
          value={summary.taskProgress ?? 0}
          aria-label={messages.taskCompletionRate}
          aria-valuetext={progress}
        />
        <small className="metric-detail">{messages.taskCountBasis}</small>
      </div>
      {useEffort ? (
        <div className="metric">
          <span>{messages.effortProgress}</span>
          <strong>
            {summary.progress === null ? messages.notCalculable : summary.progress + '%'}
          </strong>
        </div>
      ) : null}
    </div>
  );
}
