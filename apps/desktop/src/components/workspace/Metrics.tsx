import { useMemo } from 'react';
import { summarizeWork } from '@worktree/core/work-summary';
import type { WorkRow } from '../../app/types';
import { MetricsContent } from './MetricsContent';
export function Metrics({ rows, useEffort }: { rows: WorkRow[]; useEffort: boolean }) {
  const summary = useMemo(() => summarizeWork(rows), [rows]);
  return <MetricsContent summary={summary} useEffort={useEffort} />;
}
