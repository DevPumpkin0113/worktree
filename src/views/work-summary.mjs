import {escapeHtml} from './html.mjs';

export function renderMetrics(summary){
 const metrics=[
  ['작업',summary.taskCount+'개'],
  ['마일스톤',summary.completedMilestones+' / '+summary.milestoneCount],
  ['완료 작업',summary.completedTasks+' / '+summary.taskCount],
  ['공수 기준 진척도',summary.progress===null?'산정 불가':summary.progress+'%'],
 ];
 return metrics.map(([name,value])=>`<div class="metric"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

export function renderStatusNotice(summary){
 return `구조 검사 통과 · ${summary.groupCount}개 그룹 · 일정 미정 ${summary.missingDates}개 · 공수 미정 ${summary.missingEfforts}개`;
}
