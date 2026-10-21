import { messages } from '../../i18n/messages';
import { useMemo } from 'react';
import { summarizeWork } from '../../domain/work-summary';
import type { WorkRow } from '../../app/types';
export function CompactProgress({ rows }: { rows: WorkRow[] }) {
  const summary = useMemo(() => summarizeWork(rows), [rows]);
  const progress = summary.taskProgress === null ? messages.noTasks : summary.taskProgress + '%';
  return (
    <div className="compact-progress" aria-label={messages.workProgress}>
      <div>
        <span>
          {messages.completionRate + ' '}
          <strong>{progress}</strong>
        </span>
        <span className="compact-progress-count">
          {summary.completedTasks}/{summary.taskCount}
          {messages.completedSuffix}
        </span>
      </div>
      <progress
        max={100}
        value={summary.taskProgress ?? 0}
        aria-label={messages.taskCompletionRate}
        aria-valuetext={progress}
      />
    </div>
  );
}
