import {escapeHtml} from './html.mjs';
const effortNumber=value=>value.toLocaleString('ko-KR',{maximumSignificantDigits:15});

export function groupSchedule(summary){
 const range=summary.start?summary.start+' ~ '+summary.end:'일정 미정';
 return range+(summary.start&&summary.missingDates?' · 일정 미정 포함':'');
}
export function groupEffort(summary){
 const effort=effortNumber(summary.effort)+' h';
 return summary.missingEfforts?'입력된 공수 소계 '+effort+' + 미정 '+summary.missingEfforts+'개':effort;
}
export function groupProgress(summary){return summary.progress===null?'진척도 산정 불가':'공수 진척도 '+summary.progress+'%';}
export function renderGroupSummary(summary,useEffort=true){
 return `<span class="group-summary">${escapeHtml(groupSchedule(summary)+(useEffort?' · '+groupEffort(summary)+' · '+groupProgress(summary):''))}</span>`;
}
