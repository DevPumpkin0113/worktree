import { useContext } from 'react';
import { ProjectTaskTypeContext } from '../../app/project-task-type-context';
import { taskTypeColor } from '../../domain/task-type-colors';
import { Badge } from './Badge';
export function TaskTypeBadge({ type }: { type: string }) {
  const colors = useContext(ProjectTaskTypeContext);
  return <Badge label={type} color={taskTypeColor(colors, type)} />;
}
