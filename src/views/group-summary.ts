import { messages } from '../i18n/messages';
import type { GroupSummary } from '../domain/group-summary';
const effortNumber = (value: number) =>
  value.toLocaleString('ko-KR', { maximumSignificantDigits: 15 });

export function groupSchedule(summary: GroupSummary) {
  const range = summary.start ? summary.start + ' ~ ' + summary.end : messages.unscheduled;
  return range + (summary.start && summary.missingDates ? messages.includesUnscheduled : '');
}
export function groupEffort(summary: GroupSummary) {
  const effort = effortNumber(summary.effort) + ' h';
  return summary.missingEfforts
    ? messages.effortSubtotalPrefix +
        effort +
        messages.missingEffortPrefix +
        summary.missingEfforts +
        messages.countSuffix
    : effort;
}
export function groupProgress(summary: GroupSummary) {
  return summary.progress === null
    ? messages.progressUnavailable
    : messages.weightedProgressPrefix + summary.progress + '%';
}
