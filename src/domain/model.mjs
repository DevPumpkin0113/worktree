import {findWorkTable,isTableSeparator} from './work-table.mjs';

export function parseWbs(markdown){
  const frontmatter=markdown.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]||'';
  const meta=key=>{const value=frontmatter.match(new RegExp('^'+key+':[ \\t]*(.*)$','m'))?.[1]?.trim();if(!value)return undefined;return value.replace(/^(["'])(.*)\1$/,'$2');};
  const idPrefix=meta('id_prefix')??'W';
  if(!/^[A-Z]+$/.test(idPrefix))throw Error('id_prefix는 영문 대문자로 작성하세요. 예: W, OBS');

  const {sectionFound,table}=findWorkTable(markdown);
  if(!sectionFound)throw Error('작업 목록 섹션이 없습니다.');
  const expected=['ID','상위 ID','유형','작업명','산출물 / 완료 기준','담당자','상태','시작일','종료일','예상 공수(h)','선행 작업'];
  if(JSON.stringify(table[0]?.cells)!==JSON.stringify(expected))throw Error('작업 표의 열 이름 또는 순서가 공통 규격과 다릅니다.');
  if(!isTableSeparator(table[1]?.cells,expected.length))throw Error('작업 표의 구분선이 없거나 공통 규격과 다릅니다.');
  const keys=['id','parent','type','name','criteria','owner','status','start','end','effort','deps'];
  const rows=table.slice(2).map(({cells:values})=>{
    if(values.length!==11)throw Error('작업 표의 열 개수가 다릅니다.');
    const row=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
    row.deps=row.deps==='-'?[]:row.deps.split(',').map(x=>x.trim());return row;
  });
  const errors=[],byId=new Map();
  for(const r of rows){
    const parts=r.id.match(/^([A-Z]+)-?(\d{3,})$/);
    if(!parts)errors.push(r.id+': ID 형식 오류 (예: W001, W-001, OBS001, OBS-001)');
    else if(parts[1]!==idPrefix&&parts[1]!=='W')errors.push(r.id+': 문서 접두어 '+idPrefix+'와 일치하지 않습니다. id_prefix를 확인하세요.');
    if(byId.has(r.id))errors.push(`${r.id}: 중복 ID`);byId.set(r.id,r);
    if(!['group','task','milestone'].includes(r.type))errors.push(`${r.id}: 유형 오류`);
    if(!(r.type==='group'?r.status==='auto':['todo','doing','blocked','done'].includes(r.status)))errors.push(`${r.id}: 상태 오류`);
    const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
    if((r.start==='-')!==(r.end==='-')||(r.start!=='-'&&(!validDate(r.start)||!validDate(r.end)||r.start>r.end)))errors.push(`${r.id}: 날짜 오류`);
    if(r.type==='milestone'&&(r.start!==r.end||r.effort!=='0'))errors.push(`${r.id}: 마일스톤 날짜 또는 공수 오류`);
    if(r.type==='task'&&r.effort!=='-'&&(!Number.isFinite(Number(r.effort))||Number(r.effort)<=0))errors.push(`${r.id}: 공수 오류`);
    if(r.type==='group'&&[r.start,r.end,r.effort].some(x=>x!=='-')||r.type==='group'&&r.deps.length)errors.push(`${r.id}: 그룹 집계 필드는 비워야 합니다`);
  }
  for(const r of rows){
    if(r.parent!=='-'&&byId.get(r.parent)?.type!=='group')errors.push(`${r.id}: 상위 그룹 참조 오류`);
    if(r.type==='group'&&!rows.some(x=>x.parent===r.id))errors.push(`${r.id}: 빈 그룹`);
    for(const id of r.deps){const dep=byId.get(id);if(!dep||dep.type==='group')errors.push(`${r.id}: 선행 작업 ${id} 참조 오류`);
      else if(r.start!=='-'&&dep.end!=='-'&&r.start<=dep.end)errors.push(`${r.id}: 선행 작업 ${id} 종료 이후에 시작해야 합니다`);}
  }
  function cycle(edges,label){const visited=new Set(),active=new Set();function visit(id){if(active.has(id)){errors.push(`${id}: ${label} 순환`);return;}if(visited.has(id))return;active.add(id);for(const next of edges(byId.get(id)||{}))if(byId.has(next))visit(next);active.delete(id);visited.add(id);}for(const r of rows)visit(r.id);}
  cycle(r=>r.parent&&r.parent!=='-'?[r.parent]:[],'계층');cycle(r=>r.deps||[],'선행 작업');
  if(errors.length)throw Error([...new Set(errors)].join('\n'));
  const leaves=id=>rows.filter(r=>r.parent===id).flatMap(r=>r.type==='group'?leaves(r.id):[r]);
  for(const r of rows.filter(r=>r.type==='group')){const children=leaves(r.id);r.status=children.every(x=>x.status==='done')?'done':children.some(x=>x.status==='blocked')?'blocked':children.every(x=>x.status==='todo')?'todo':'doing';}
  return {title:meta('title')||'WBS',idPrefix,rows};
}
