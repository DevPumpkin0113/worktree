import { messages } from '../../i18n/messages';
export function taskTypeLabel(type: string) {
  return (
    (
      {
        feature: messages.featureType,
        bug: messages.bugType,
        improvement: messages.improvementType,
        task: messages.generalTaskType,
      } as Record<string, string>
    )[type] ?? type
  );
}
export function priorityLabel(priority: string) {
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
