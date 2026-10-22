import type { ProjectPriority } from '@worktree/core/project-priorities';
import { legacyPriorities } from '@worktree/core/project-priorities';
import { priorityColor } from '../../views/priority-color';
import { Badge } from '../shared/Badge';
import { priorityLabel } from './task-labels';
export function PriorityBadge({
  value,
  priorities = legacyPriorities(),
}: {
  value: string;
  priorities?: ProjectPriority[];
}) {
  const index = priorities.findIndex((p) => p.id === value);
  const label = priorityLabel(value, priorities);
  return index < 0 ? (
    <>{label}</>
  ) : (
    <Badge label={label} color={priorityColor(index, priorities.length)} />
  );
}
