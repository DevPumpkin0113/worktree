import type { summarizeWork } from '../../domain/work-summary';
export function MetricsContent({
  summary,
  useEffort,
}: {
  summary: ReturnType<typeof summarizeWork>;
  useEffort: boolean;
}) {
  const progress = summary.taskProgress === null ? '작업 없음' : summary.taskProgress + '%';
  return (
    <div id="metrics" className={'metrics' + (!useEffort ? ' without-effort' : '')}>
      <div className="metric">
        <span>작업</span>
        <strong>
          {summary.completedTasks} / {summary.taskCount}
        </strong>
        <small className="metric-detail">완료 / 전체</small>
      </div>
      <div className="metric">
        <span>마일스톤</span>
        <strong>
          {summary.completedMilestones} / {summary.milestoneCount}
        </strong>
        <small className="metric-detail">완료 / 전체</small>
      </div>
      <div className="metric metric-progress">
        <span>진행률</span>
        <strong>{progress}</strong>
        <progress
          max="100"
          value={summary.taskProgress ?? 0}
          aria-label="작업 개수 기준 진행률"
          aria-valuetext={progress}
        />
        <small className="metric-detail">작업 개수 기준</small>
      </div>
      {useEffort ? (
        <div className="metric">
          <span>공수 기준 진척도</span>
          <strong>{summary.progress === null ? '산정 불가' : summary.progress + '%'}</strong>
        </div>
      ) : null}
    </div>
  );
}
