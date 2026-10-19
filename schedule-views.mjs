const DAY=86400000;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stateName={todo:'시작 전',doing:'진행 중',blocked:'막힘',done:'완료'};
const dateString=time=>new Date(time).toISOString().slice(0,10);

export function graphLayout(rows){
 const byId=new Map(rows.map(r=>[r.id,r])),depth=new Map(),children=new Map(rows.map(r=>[r.id,[]]));
 for(const r of rows)for(const id of r.deps)if(children.has(id))children.get(id).push(r.id);
 function level(id){if(depth.has(id))return depth.get(id);const deps=byId.get(id).deps.filter(d=>byId.has(d));const value=deps.length?1+Math.max(...deps.map(level)):0;depth.set(id,value);return value;}
 const layers=[];for(const r of rows){const d=level(r.id);(layers[d]??=[]).push(r);}
 const positions=new Map();layers.forEach((layer,x)=>layer.forEach((r,y)=>positions.set(r.id,{x:24+x*280,y:52+y*112})));
 return {positions,children,width:Math.max(560,layers.length*280+16),height:Math.max(210,Math.max(0,...layers.map(x=>x.length))*112+76),layers};
}

export function relatedIds(rows,id){
 const byId=new Map(rows.map(r=>[r.id,r])),children=new Map(rows.map(r=>[r.id,[]]));
 for(const r of rows)for(const dep of r.deps)children.get(dep)?.push(r.id);
 const result=new Set([id]);
 for(const next of [key=>byId.get(key)?.deps||[],key=>children.get(key)||[]]){const visited=new Set();const walk=key=>{if(visited.has(key))return;visited.add(key);result.add(key);next(key).forEach(walk);};walk(id);}
 return result;
}

export function renderDependencies(rows,matched,selected,label){
 if(!matched.length)return '<div class="empty">조건에 맞는 작업이 없습니다.</div>';
 const visible=new Set();for(const r of matched)for(const id of relatedIds(rows,r.id))visible.add(id);
 const nodes=rows.filter(r=>visible.has(r.id));const layout=graphLayout(nodes),byId=new Map(rows.map(r=>[r.id,r]));
 const focus=selected&&visible.has(selected)?selected:null,related=focus?relatedIds(rows,focus):null;
 const matchedIds=new Set(matched.map(r=>r.id));
 const titles=layout.layers.map((layer,i)=>`<text x="${24+i*280}" y="26" class="stage-label">${i===0?'선행 작업 없음':`선행 단계 ${i}`}</text>`).join('');
 const edges=nodes.flatMap(r=>r.deps.filter(id=>visible.has(id)).map(id=>{const a=layout.positions.get(id),b=layout.positions.get(r.id);const highlighted=related?.has(id)&&related.has(r.id);return `<path class="graph-edge ${related?(highlighted?'related':'dim'):''}" marker-end="url(#dependency-arrow)" d="M${a.x+220} ${a.y+38} C${a.x+250} ${a.y+38},${b.x-30} ${b.y+38},${b.x} ${b.y+38}"/>`;})).join('');
 const cards=nodes.map(r=>{const p=layout.positions.get(r.id),dim=related?!related.has(r.id):!matchedIds.has(r.id);const name=r.name.length>19?r.name.slice(0,18)+'…':r.name;return `<g class="graph-node ${dim?'dim':''} ${focus===r.id?'selected':''}" data-select="${r.id}" tabindex="0" role="button" aria-label="${escape(label(r.id)+' '+r.name)}"><title>${escape(label(r.id)+' · '+r.name+' · '+stateName[r.status])}</title><rect x="${p.x}" y="${p.y}" width="220" height="78" rx="10"/><circle cx="${p.x+16}" cy="${p.y+19}" r="4" class="dot-${r.status}"/><text x="${p.x+28}" y="${p.y+23}" class="graph-id">${escape(label(r.id))}</text><text x="${p.x+14}" y="${p.y+47}" class="graph-name">${escape((r.type==='milestone'?'◇ ':'')+name)}</text><text x="${p.x+14}" y="${p.y+65}" class="graph-status">${stateName[r.status]}</text></g>`;}).join('');
 const current=byId.get(focus);const preceding=current?.deps.map(id=>label(id)).join(', ')||'없음';const following=current?layout.children.get(current.id).map(id=>label(id)).join(', ')||'없음':'';
 const info=current?`<div class="dependency-focus"><div><strong>${escape(label(current.id)+' · '+current.name)}</strong><div class="sub">직접 선행: ${escape(preceding)} / 직접 후속: ${escape(following)}</div></div><button data-id="${current.id}">작업 상세</button><button data-clear-focus>강조 해제</button></div>`:'<div class="notice">작업 간 선행·후속 관계를 표시합니다. 왼쪽에서 오른쪽으로 진행합니다. 작업을 선택하면 선행·후속 경로가 강조됩니다. 단계는 일정이나 작업 가능 상태를 뜻하지 않습니다.</div>';
 return info+`<div class="diagram-scroll" tabindex="0" aria-label="작업 네트워크"><svg class="dependency-canvas" width="${layout.width}" height="${layout.height}" role="group" aria-label="작업 의존 관계"><defs><marker id="dependency-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#81999e"/></marker></defs>${titles}${edges}${cards}</svg></div><p class="sub">필터와 일치하는 작업 외에도 연결 확인에 필요한 선행·후속 작업을 함께 표시합니다. 빈 공간을 드래그하면 화면이 이동합니다. 노드를 두 번 클릭하면 상세를 엽니다.</p>`;
}

export function timelineRange(rows,unit='day',minimumWidth=720){
 const scheduled=rows.filter(r=>r.start!=='-');if(!scheduled.length)return null;
 const start=Math.min(...scheduled.map(r=>Date.parse(r.start))),end=Math.max(...scheduled.map(r=>Date.parse(r.end)));
 const days=Math.round((end-start)/DAY)+1,width=Math.min(18000,Math.max(minimumWidth,days*(unit==='week'?7:32))),dayWidth=width/days,step=Math.max(unit==='week'?7:1,Math.ceil(44/dayWidth));
 return {start,end,days,dayWidth,width,step};
}

export function renderGantt(rows,label,unit='day',today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),availableWidth=960){
 if(!rows.length)return '<div class="empty">조건에 맞는 작업이 없습니다.</div>';
 const known=rows.filter(r=>r.start!=='-'),unknown=rows.filter(r=>r.start==='-'),range=timelineRange(rows,unit,Math.max(240,availableWidth-242));
 let result=`<div class="schedule-toolbar"><div><strong>간트 차트</strong><span class="sub"> · 일정 입력 ${known.length} / 미정 ${unknown.length}</span></div><label>날짜 축 <select id="ganttUnit" aria-label="간트 날짜 축"><option value="day" ${unit==='day'?'selected':''}>일 단위</option><option value="week" ${unit==='week'?'selected':''}>주 단위</option></select></label></div>`;
 if(range){
  const {start,days,dayWidth,width,step}=range;let grid='',ticks='';
  for(let i=0;i<days;i+=step){const x=i*dayWidth,day=dateString(start+i*DAY);grid+=`<path d="M${x} 0v48" class="date-grid"/>`;ticks+=`<text x="${x+4}" y="23" class="date-label">${day.slice(5).replace('-','/')}</text>`;}
  const todayOffset=(Date.parse(today)-start)/DAY;const todayLine=todayOffset>=0&&todayOffset<days?`<path d="M${todayOffset*dayWidth+dayWidth/2} 0v48" class="today-line"><title>오늘 ${today}</title></path>`:'';
  result+=`<p class="sub">${dateString(start)} ~ ${dateString(range.end)} · 표시된 날짜는 시작일과 종료일을 모두 포함합니다. 붉은 선은 오늘입니다. 빈 공간 드래그로 이동할 수 있습니다.</p><div class="gantt-scroll" tabindex="0" aria-label="작업 일정 가로 스크롤"><table class="gantt-table"><thead><tr><th scope="col">작업 목록</th><th scope="col"><svg width="${width}" height="38" aria-label="날짜 축">${ticks}</svg></th></tr></thead><tbody>`;
  result+=known.map(r=>{const x=(Date.parse(r.start)-start)/DAY*dayWidth,duration=((Date.parse(r.end)-Date.parse(r.start))/DAY+1)*dayWidth;const mark=r.type==='milestone'?`<path d="M${x+dayWidth/2} 14l10 10-10 10-10-10z" class="schedule-bar state-${r.status}"/>`:`<rect x="${x+1}" y="14" width="${Math.max(2,duration-2)}" height="20" rx="4" class="schedule-bar state-${r.status}"/>`;return `<tr><th scope="row"><button class="gantt-label" data-id="${r.id}" title="${escape(r.name)}"><span class="id">${escape(label(r.id))}</span><span>${escape(r.name)}</span></button></th><td><svg width="${width}" height="48" data-id="${r.id}" class="timeline-row" role="button" tabindex="0" aria-label="${escape(r.name+' '+r.start+' ~ '+r.end)}"><title>${escape(r.name+' · '+r.start+' ~ '+r.end+' · '+stateName[r.status])}</title>${grid}${mark}${todayLine}</svg></td></tr>`;}).join('');
  result+='</tbody></table></div>';
 }else result+='<div class="empty">일정이 아직 입력되지 않았습니다. 시작일·종료일을 작성하면 이곳에 간트 차트가 표시됩니다.</div>';
 if(unknown.length)result+=`<details class="unscheduled" open><summary>일정 미정 · ${unknown.length}개</summary><div class="unscheduled-list">`+unknown.map(r=>`<button data-id="${r.id}"><span class="id">${escape(label(r.id))}</span> ${escape(r.name)}</button>`).join('')+'</div></details>';
 return result;
}
