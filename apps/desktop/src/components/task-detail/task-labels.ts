import { messages } from '../../i18n/messages';
export function priorityLabel(
  priority: string,
  priorities?: import('@worktree/core/project-priorities').ProjectPriority[],
) {
  if (priority === '-') return messages.unassignedPriority;
  const option = priorities?.find((p) => p.id === priority);
  if (option) return option.name;
  return (
    (
      {
        urgent: messages.urgentPriority,
        high: messages.highPriority,
        normal: messages.normalPriority,
        low: messages.lowPriority,
      } as Record<string, string>
    )[priority] ?? priority
  );
}
