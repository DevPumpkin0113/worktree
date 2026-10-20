import {summarizeGroups} from '../domain/group-summary.mjs';
import {groupSchedule,groupEffort,groupProgress} from './group-summary.mjs';
import {escapeHtml as esc} from './html.mjs';
const states={todo:'시작 전',doing:'진행 중',blocked:'진행 막힘',done:'완료'};
const types={group:'작업 그룹',task:'작업',milestone:'마일스톤'};
export function renderTaskDetail(model,id,label){
 const row=model.rows.find(r=>r.id===id);if(!row)return null;
 const byId=new Map(model.rows.map(r=>[r.id,r]));
 const ancestors=[];let parent=byId.get(row.parent);while(parent){ancestors.unshift(parent);parent=byId.get(parent.parent);}
 const links=items=>items.length?items.map(r=>`<button class="detail-link" data-detail="${r.id}"><span class="detail-link-id">${esc(label(r.id))}</span><span class="detail-link-name">${esc(r.name)}</span><span class="detail-status ${r.status}">${states[r.status]}</span><span aria-hidden="true">›</span></button>`).join(''):'<p class="detail-empty">연결된 작업이 없습니다.</p>';
 const predecessors=row.deps.map(id=>byId.get(id)).filter(Boolean),successors=model.rows.filter(r=>r.deps.includes(id));
 const children=model.rows.filter(r=>r.parent===id);
 const crumbs=ancestors.map(r=>`<button data-detail="${r.id}">${esc(r.name)}</button>`).join('<span aria-hidden="true">/</span>');
 const group=row.type==='group'?summarizeGroups(model.rows).get(id):null;
 const facts=group?[['집계 일정',groupSchedule(group)],['집계 공수',groupEffort(group)],['하위 작업',group.completedTasks+' / '+group.taskCount+' 완료'],['마일스톤',group.completedMilestones+' / '+group.milestoneCount+' 완료'],['진척도',groupProgress(group)]]:[['담당자',row.owner==='-'?'미정':row.owner],['예상 공수',row.effort==='-'?'미정':row.effort+' h'],['시작일',row.start==='-'?'미정':row.start],['종료일',row.end==='-'?'미정':row.end]];
 const summary=facts.filter(([name])=>model.useEffort!==false||!['집계 공수','예상 공수','진척도'].includes(name)).map(([name,value])=>`<div class="detail-fact"><span>${name}</span><strong>${esc(value)}</strong></div>`).join('');
 return {title:label(id)+' · '+row.name,meta:`<span class="detail-type">${types[row.type]}</span><span class="detail-status ${row.status}">${states[row.status]}</span>`,body:`<nav class="detail-breadcrumb" aria-label="상위 작업">${crumbs||'<span>최상위 작업</span>'}</nav><div class="detail-facts">${summary}</div><section class="detail-section criteria-section"><div class="detail-section-heading"><h3>산출물 / 완료 기준</h3>${row.status==='done'?'<span class="detail-complete">✓ 완료로 기록됨</span>':''}</div><p class="detail-criteria">${esc(row.criteria||'완료 기준이 없습니다.')}</p>${row.status==='blocked'?'<p class="detail-blocked">진행이 막힌 작업입니다. 원본 문서의 이슈 및 결정 사항에서 원인과 해소 조건을 확인하세요.</p>':''}</section>${children.length?`<section class="detail-section"><h3>하위 작업 <span>${children.length}</span></h3>${links(children)}</section>`:''}<div class="detail-relations"><section class="detail-section"><h3>선행 작업 <span>${predecessors.length}</span></h3><p class="detail-section-note">이 작업보다 먼저 끝나야 하는 작업</p>${links(predecessors)}</section><section class="detail-section"><h3>후속 작업 <span>${successors.length}</span></h3><p class="detail-section-note">이 작업이 끝난 뒤 이어지는 작업</p>${links(successors)}</section></div><details class="detail-identifiers"><summary>식별 정보</summary><dl><dt>표시 ID</dt><dd>${esc(label(id))}</dd><dt>원본 ID</dt><dd>${esc(id)}</dd><dt>상위 ID</dt><dd>${esc(row.parent==='-'?'없음':row.parent)}</dd></dl></details>`};
}
