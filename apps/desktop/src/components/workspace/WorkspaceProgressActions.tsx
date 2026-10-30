import type { WorkRow } from '../../app/types';
import { CompactProgress } from './CompactProgress';
import { CreateWorkMenu } from './CreateWorkMenu';

export function WorkspaceProgressActions({
  rows,
  onAddTask,
  onAddMilestone,
  onAddEpic,
}: {
  rows: WorkRow[];
  onAddTask: () => void;
  onAddMilestone: () => void;
  onAddEpic: () => void;
}) {
  return (
    <div className="workspace-progress-actions">
      <CompactProgress rows={rows} />
      <CreateWorkMenu onAddTask={onAddTask} onAddMilestone={onAddMilestone} onAddEpic={onAddEpic} />
    </div>
  );
}
