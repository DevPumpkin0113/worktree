import { useMemo } from 'react';
import { summarizeWork } from '../../domain/work-summary';
import type { WorkRow } from '../../app/types';
export function CompactProgress({ rows }: { rows: WorkRow[] }) {
  const summary = useMemo(() => summarizeWork(rows), [rows]);
  const progress = summary.taskProgress === null ? '작업 없음' : summary.taskProgress + '%';
  return (
    <div className="compact-progress" aria-label="작업 진행 현황">
      <div>
        <span>
          진행률 <strong>{progress}</strong>
        </span>
        <span className="compact-progress-count">
          {summary.completedTasks}/{summary.taskCount} 완료
        </span>
      </div>
      <progress
        max={100}
        value={summary.taskProgress ?? 0}
        aria-label="작업 개수 기준 진행률"
        aria-valuetext={progress}
      />
    </div>
  );
}
