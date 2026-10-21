import { messages } from '../../i18n/messages';
import type { WorkRow } from '../../app/types';
import { Icon } from '../shared/Icon';
import { CompactProgress } from './CompactProgress';

export function WorkspaceProgressActions({
  rows,
  onAddTask,
  onAddMilestone,
}: {
  rows: WorkRow[];
  onAddTask: () => void;
  onAddMilestone: () => void;
}) {
  return (
    <div className="workspace-progress-actions">
      <CompactProgress rows={rows} />
      <div className="workspace-create-actions">
        <button
          id="milestoneAddOpen"
          className="task-add-button"
          type="button"
          onClick={onAddMilestone}
        >
          <Icon name="plus" />
          <span>{messages.milestone}</span>
        </button>
        <button id="taskAddOpen" className="task-add-button" type="button" onClick={onAddTask}>
          <Icon name="plus" />
          <span>{messages.task}</span>
        </button>
      </div>
    </div>
  );
}
