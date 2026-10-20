const fields={parent:'상위 ID',type:'유형',status:'상태',start:'시작일 / 종료일',effort:'예상 공수(h)',deps:'선행 작업',id:'ID'};

export function describeDocumentErrors(error,markdown='',source='',kind='문서 오류'){
 const sourceLines=markdown.split(/\r?\n/).map((raw,index)=>({raw,line:index+1}));
 const sectionStart=sourceLines.findIndex(item=>/^## 작업 목록\s*$/.test(item.raw));
 const nextSection=sourceLines.findIndex((item,index)=>index>sectionStart&&/^## /.test(item.raw));
 const section=sectionStart<0?[]:sourceLines.slice(sectionStart+1,nextSection<0?undefined:nextSection);
 const table=section.filter(item=>item.raw.trim().startsWith('|')).map(item=>({...item,cells:item.raw.trim().replace(/^\||\|$/g,'').split('|').map(value=>value.trim().replaceAll('&#124;','|'))}));
 const rows=table.slice(2);
 return [...new Set(String(error?.message??error).split('\n').filter(Boolean))].map(message=>{
  const match=message.match(/^([^:]+): (.+)$/);
  const matches=match?rows.filter(row=>row.cells[0]===match[1]):[];
  const row=matches[0],id=row?.cells[0]||'';
  let reason=row?match[2]:message;
  const missing=reason.match(/^선행 작업 (.+) 참조 오류$/);
  if(missing){const target=rows.find(item=>item.cells[0]===missing[1]);reason=target?'선행 작업 '+missing[1]+'은 그룹이므로 참조할 수 없습니다.':'선행 작업 '+missing[1]+'가 문서에 없습니다.';}
  let field='',value='',hint='WBS 작성 가이드와 원본 내용을 비교해 수정한 뒤 저장하고 새로고침하세요.';
  if(row){
   let key;
   if(/선행 작업/.test(reason))key='deps';
   else if(/상위|계층/.test(reason))key='parent';
   else if(/ID|접두어/.test(reason))key='id';
   else if(/상태/.test(reason))key='status';
   else if(/유형/.test(reason))key='type';
   else if(/마일스톤/.test(reason)){field='시작일 / 종료일 / 예상 공수(h)';value=[row.cells[7],row.cells[8],row.cells[9]].join(' / ');hint='마일스톤의 시작일과 종료일은 같게, 공수는 0으로 입력하세요.';}
   else if(/날짜/.test(reason))key='start';
   else if(/공수/.test(reason))key='effort';
   if(key){field=fields[key];value=key==='start'?[row.cells[7],row.cells[8]].join(' / '):row.cells[{id:0,parent:1,type:2,status:6,effort:9,deps:10}[key]]||'';}
   if(key==='deps')hint=/순환/.test(reason)?'서로를 선행 작업으로 참조하는 연결을 해제하세요.':/종료 이후/.test(reason)?'후속 작업 시작일을 선행 작업 종료일 다음 날 이후로 입력하세요.':'존재하는 task 또는 milestone의 ID를 정확히 입력하세요. 선행 작업이 없으면 -로 입력하세요.';
   if(key==='parent')hint='존재하는 group의 ID를 입력하세요. 최상위 작업은 -로 두고 순환 연결을 해제하세요.';
   if(key==='id')hint='문서 접두어와 세 자리 이상 숫자를 사용하고, ID 중복 및 상위·선행 참조를 함께 확인하세요.';
   if(key==='status')hint='group은 auto, task·milestone은 todo·doing·blocked·done 중 하나를 입력하세요.';
   if(key==='type')hint='group·task·milestone 중 하나를 입력하세요.';
   if(key==='start')hint='날짜는 YYYY-MM-DD로 입력하고 시작일이 종료일보다 늦지 않게 하세요. 미정이면 두 날짜 모두 -로 입력하세요.';
   if(key==='effort')hint='task의 공수는 0보다 큰 숫자 또는 -로 입력하세요.';
   if(/빈 그룹/.test(reason))hint='그룹 아래에 하위 작업을 추가하거나 사용하지 않는 그룹을 제거하세요.';
   if(/그룹 집계/.test(reason))hint='group의 시작일·종료일·예상 공수·선행 작업은 모두 -로 입력하세요.';
  }else if(/열 이름|열 개수/.test(reason))hint='공용 템플릿의 11개 열과 순서를 유지하세요. 셀 안의 | 문자는 &#124;로 작성하세요.';
  else if(/작업 목록 섹션/.test(reason))hint='원본에 ## 작업 목록 제목과 공용 양식의 작업 표를 추가하세요.';
  else if(/id_prefix/.test(reason))hint='문서 첫 메타데이터의 id_prefix에 W·OBS 같은 영문 대문자를 입력하세요.';
  else if(kind==='파일 읽기 오류')hint='파일의 위치·접근 권한·UTF-8 인코딩·5MB 크기 제한을 확인한 뒤 다시 열거나 새로고침하세요.';
  else if(kind!=='문서 오류')hint='작업을 다시 시도하세요. 문제가 계속되면 오류 메시지와 재현 순서를 기록해 주세요.';
  let locations=matches;
  if(kind==='문서 오류'&&!locations.length){
   if(/열 이름/.test(message)&&table[0])locations=[table[0]];
   else if(/열 개수/.test(message))locations=rows.filter(item=>item.cells.length!==11).slice(0,1);
   else if(/id_prefix/.test(message)&&/^\uFEFF?---$/.test(sourceLines[0]?.raw||'')){
    const end=sourceLines.findIndex((item,index)=>index>0&&item.raw==='---');
    const prefix=sourceLines.slice(1,end<0?1:end).find(item=>/^id_prefix:/.test(item.raw));if(prefix)locations=[prefix];
   }
  }
  const lineNumbers=locations.map(item=>item.line);
  return {kind,source,message,id,name:row?.cells[3]||'',reason,field,value,hint,lineNumbers,raw:locations.map(item=>item.raw).join('\n')};
 });
}

export function problemLocation(problem){
 return problem.lineNumbers?.length?problem.lineNumbers.map(line=>line+'행').join(', '):'위치 확인 불가';
}

export function formatDocumentProblem(problem){
 const lines=[problem.kind,problem.id?problem.id+' · '+problem.name:'',problem.source?'파일: '+problem.source:'','위치: '+problemLocation(problem),'원인: '+problem.reason,problem.field?'문제 필드: '+problem.field+' = '+problem.value:'','수정 안내: '+problem.hint];
 if(problem.raw)lines.push('관련 원문:',problem.raw);
 return lines.filter(Boolean).join('\n');
}
