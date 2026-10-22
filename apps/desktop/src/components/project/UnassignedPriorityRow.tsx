import { messages } from '../../i18n/messages';
export function UnassignedPriorityRow() {
  return (
    <div className="priority-unassigned">
      <input
        value={messages.unassignedPriority}
        disabled
        aria-label={messages.unassignedPriority}
      />
    </div>
  );
}
