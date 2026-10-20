import type { GroupSummary } from '../domain/group-summary';
const effortNumber = (value: number) =>
  value.toLocaleString('ko-KR', { maximumSignificantDigits: 15 });

export function groupSchedule(summary: GroupSummary) {
  const range = summary.start ? summary.start + ' ~ ' + summary.end : '일정 미정';
  return range + (summary.start && summary.missingDates ? ' · 일정 미정 포함' : '');
}
export function groupEffort(summary: GroupSummary) {
  const effort = effortNumber(summary.effort) + ' h';
  return summary.missingEfforts
    ? '입력된 공수 소계 ' + effort + ' + 미정 ' + summary.missingEfforts + '개'
    : effort;
}
export function groupProgress(summary: GroupSummary) {
  return summary.progress === null ? '진척도 산정 불가' : '공수 진척도 ' + summary.progress + '%';
}
