import {escapeHtml} from './html.mjs';

export function renderMetrics(summary,useEffort=true){
 const metric=(name,value,detail='')=>`<div class="metric"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong>${detail?`<small class="metric-detail">${escapeHtml(detail)}</small>`:''}</div>`;
 const progress=summary.taskProgress===null?'작업 없음':summary.taskProgress+'%';
 return metric('작업',summary.completedTasks+' / '+summary.taskCount,'완료 / 전체')
  +metric('마일스톤',summary.completedMilestones+' / '+summary.milestoneCount,'완료 / 전체')
  +`<div class="metric metric-progress"><span>진행률</span><strong>${escapeHtml(progress)}</strong><progress max="100" value="${summary.taskProgress??0}" aria-label="작업 개수 기준 진행률" aria-valuetext="${escapeHtml(progress)}"></progress><small class="metric-detail">작업 개수 기준</small></div>`
  +(useEffort?metric('공수 기준 진척도',summary.progress===null?'산정 불가':summary.progress+'%'):'');
}

export function renderStatusNotice(summary,useEffort=true){
 return `구조 검사 통과 · ${summary.groupCount}개 그룹 · 일정 미정 ${summary.missingDates}개`+(useEffort?` · 공수 미정 ${summary.missingEfforts}개`:'');
}
