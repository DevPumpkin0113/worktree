import {summarizeGroups} from '../domain/group-summary.mjs';
import {renderGroupSummary} from './group-summary.mjs';
import {escapeHtml as escape} from './html.mjs';

const states={todo:'시작 전',doing:'진행 중',blocked:'막힘',done:'완료'};
const types={task:'작업',milestone:'마일스톤',group:'그룹'};

function renderCard(row,label){
 const badge=`<span class="tag ${row.status}">${states[row.status]}</span>`;
 return `<div class="task" tabindex="0" role="button" data-id="${escape(row.id)}"><span class="id">${escape(label(row.id))}</span><div>${row.type==='milestone'?'<span aria-hidden="true">◇</span> ':''}${escape(row.name)}<div class="sub"><span class="work-type-badge work-type-${row.type}">${types[row.type]}</span> · ${row.owner==='-'?'담당 미정':escape(row.owner)}</div></div>${badge}</div>`;
}

export function renderTree(rows,matches,label,useEffort=true){
 const groups=summarizeGroups(rows);
 const branch=parent=>rows.filter(row=>row.parent===parent).map(row=>{
  if(row.type!=='group')return matches(row)?renderCard(row,label):'';
  const children=branch(row.id);
  return children?`<details class="group" open><summary data-work-id="${escape(row.id)}">${escape(label(row.id))} · ${escape(row.name)} <span class="tag ${row.status}">${states[row.status]}</span><button type="button" class="group-detail" data-id="${escape(row.id)}" aria-label="${escape(row.name)} 그룹 상세">상세</button>${renderGroupSummary(groups.get(row.id),useEffort)}</summary><div class="children">${children}</div></details>`:'';
 }).join('');
 return branch('-');
}

export function renderBoard(rows,label){
 return '<div class="lanes">'+Object.entries(states).map(([status,name])=>{
  const items=rows.filter(row=>row.status===status);
  return `<section class="lane"><h3>${name} · ${items.length}</h3>${items.map(row=>renderCard(row,label)).join('')}</section>`;
 }).join('')+'</div>';
}
