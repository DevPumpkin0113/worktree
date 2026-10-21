import {setLanguage} from '../../src/i18n/messages.ts';
import {DocumentValidationError} from '../../src/domain/document-diagnostics.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseWbs} from '../../src/domain/model.ts';
import {describeDocumentErrors,formatDocumentProblem,problemLocation} from '../../src/domain/document-errors.ts';
import {tableCellPositions} from '../../src/domain/work-table.ts';
import {renderDocumentErrors} from '../helpers/render-helpers.tsx';
const fixture=fs.readFileSync(new URL('../fixtures/legacy-error.wbs',import.meta.url),'utf8');

test('참조 오류에서 작업·문제 값·수정 안내와 해당 원문만 추출한다',()=>{
 let error;try{parseWbs(fixture);}catch(e){error=e;}
 const [problem]=describeDocumentErrors(error,fixture,'Error-demo.wbs');
 assert.equal(problem.id,'W003');assert.equal(problem.name,'화면 설계');assert.equal(problem.field,'선행 작업');assert.equal(problem.value,'W999');assert.match(problem.hint,/task 또는 milestone/);assert.match(problem.raw,/W003/);assert.doesNotMatch(problem.raw,/W006/);
 assert.doesNotThrow(()=>parseWbs(fixture.replace('16 | W999 |','16 | W002 |')));
});
test('여러 오류와 중복 ID의 원문을 유지하고 문서 외 오류에 작업을 잘못 연결하지 않는다',()=>{
 const duplicate=fixture.replace(/\r?\n\r?\n## 이슈 및 결정 사항/,'\n| W003 | W001 | task | 중복 작업 | 확인 | codex | todo | - | - | 1 | - |\n\n## 이슈 및 결정 사항');
 const problems=describeDocumentErrors(new DocumentValidationError([{code:'DUPLICATE_ID',taskId:'W003'},{code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W999',target:'missing'},{code:'DUPLICATE_ID',taskId:'W003'}]),duplicate);
 assert.equal(problems.length,2);assert.equal(problems[0].raw.split('\n').length,2);
 const [read]=describeDocumentErrors('C:\\files\\missing.wbs: 파일 없음','','missing.wbs','파일 읽기 오류');assert.equal(read.id,'');assert.match(read.hint,/접근 권한/);
 const [header]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_COLUMN_COUNT'}]),fixture);assert.match(header.hint,/11개 열/);assert.equal(header.raw,'');
});
test('오류 원인·원문·경로를 HTML로 실행하지 않고 텍스트로 출력한다',()=>{
 const [problem]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W999',target:'missing'}]),fixture.replace('화면 설계','<img src=x onerror=alert(1)>'),'<script>bad()</script>');
 const html=renderDocumentErrors([problem]);assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
});

test('BOM·CRLF·빈 줄이 있어도 실제 작업 행 번호를 반환하고 다른 설명 표는 제외한다',()=>{
 const text='\uFEFF'+fixture.replace(/\r?\n/g,'\r\n').replace('## 작업 목록','\r\n\r\n## 작업 목록');
 const expected=text.split('\r\n').findIndex(line=>line.startsWith('| W003 |'))+1;
 const [problem]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W999',target:'missing'}]),text+'\r\n| W003 | 설명용 행 |');
 assert.deepEqual(problem.lineNumbers,[expected]);
 assert.match(formatDocumentProblem(problem),new RegExp('위치: '+expected+'행'));
 assert.match(formatDocumentProblem(problem),/W999/);
});
test('중복 ID의 모든 행을 표시하고 표·메타데이터 오류에도 확인 가능한 위치만 연결한다',()=>{
 const text=fixture.replace(/\r?\n\r?\n## 이슈 및 결정 사항/,'\n| W003 | W001 | task | 중복 | 확인 | codex | todo | - | - | 1 | - |\n\n## 이슈 및 결정 사항');
 const [duplicate]=describeDocumentErrors(new DocumentValidationError([{code:'DUPLICATE_ID',taskId:'W003'}]),text);
 assert.equal(duplicate.lineNumbers.length,2);assert.notEqual(...duplicate.lineNumbers);
 const header=fixture.replace('| ID | 상위 ID |','| 코드 | 상위 ID |');
 const [columns]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_COLUMN_ORDER'}]),header);
 assert.deepEqual(columns.lineNumbers,[header.split(/\r?\n/).findIndex(line=>line.startsWith('| 코드 |'))+1]);
 const short=fixture.replace('| W003 | W001 | task | 화면 설계 | 주요 화면 설계안 검토 및 승인 | codex | todo | - | - | 16 | W999 |','| W003 | W001 |');
 const [count]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_COLUMN_COUNT'}]),short);assert.match(count.raw,/W003/);assert.equal(count.lineNumbers.length,1);
 const prefix=fixture.replace('id_prefix: W','id_prefix: bad');
 const [meta]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_ID_PREFIX'}]),prefix);assert.deepEqual(meta.lineNumbers,[prefix.split(/\r?\n/).findIndex(line=>line==='id_prefix: bad')+1]);
 const [unknown]=describeDocumentErrors(new DocumentValidationError([{code:'MISSING_WORK_SECTION'}]),'문서');assert.deepEqual(unknown.lineNumbers,[]);assert.match(formatDocumentProblem(unknown),/위치 확인 불가/);
});

test('구분선 누락은 첫 작업의 실제 위치를 안내하고 설명 표의 같은 ID는 제외한다',()=>{
 const text=fixture.replace(/^\|[-: |]+\|\r?\n/m,'');
 let error;try{parseWbs(text);}catch(caught){error=caught;}
 const [problem]=describeDocumentErrors(error,text);
 assert.match(problem.hint,/구분선/);
 assert.deepEqual(problem.lineNumbers,[text.split(/\r?\n/).findIndex(line=>line.startsWith('| W001 |'))+1]);
 const [reference]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W999',target:'missing'}]),fixture+'\n### 설명\n| W003 | 설명 |');
 assert.equal(reference.lineNumbers.length,1);
});

function selectedText(problem,markdown){
 return problem.positions.map(({line,column,endColumn})=>Array.from(markdown.split(/\r?\n/)[line-1]).slice(column-1,endColumn).join(''));
}

test('한글·이모지·탭·HTML 엔티티 뒤에서도 원본 문자 기준 열을 안내한다',()=>{
 const text='\uFEFF'+fixture.replace(/\r?\n/g,'\r\n').replace('화면 설계','화면 🌲 &#124; 설계').replace('16 | W999 |','16 |\tW999\t|');
 const [problem]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W999',target:'missing'}]),text);
 assert.deepEqual(selectedText(problem,text),['W999']);
 assert.match(problemLocation(problem),/행 \d+~\d+열/);
 assert.match(formatDocumentProblem(problem),/수정 예시: -/);
 assert.match(renderDocumentErrors([problem]),/수정 예시/);
 assert.equal(tableCellPositions('  | A | B').length,2);
 assert.deepEqual(tableCellPositions('|   |'),[{column:5,endColumn:5}]);
 const emptyId=fixture.replace('| W003 |','|      |');
 let error;try{parseWbs(emptyId);}catch(caught){error=caught;}
 const empty=describeDocumentErrors(error,emptyId).find(problem=>problem.reason.includes('ID 형식 오류'));
 assert.equal(empty.field,'ID');assert.equal(empty.positions.length,1);
 assert.match(problemLocation(empty),/행 \d+열/);
});

test('중복 ID·날짜·마일스톤·그룹의 관련 셀을 모두 추적한다',()=>{
 const duplicate=fixture.replace(/\r?\n\r?\n## 이슈 및 결정 사항/,'\n| W003 | W001 | task | 중복 | 확인 | codex | todo | - | - | 1 | - |\n\n## 이슈 및 결정 사항');
 assert.deepEqual(selectedText(describeDocumentErrors(new DocumentValidationError([{code:'DUPLICATE_ID',taskId:'W003'}]),duplicate)[0],duplicate),['W003','W003']);
 const dates=fixture.replace('todo | - | - | 16','todo | 2026-10-21 | 2026-10-20 | 16');
 assert.deepEqual(selectedText(describeDocumentErrors(new DocumentValidationError([{code:'INVALID_DATE',taskId:'W003'}]),dates)[0],dates),['2026-10-21','2026-10-20']);
 assert.deepEqual(selectedText(describeDocumentErrors(new DocumentValidationError([{code:'INVALID_DEPENDENCY_DATE',taskId:'W003',dependencyId:'W002'}]),dates)[0],dates),['2026-10-21']);
 const milestone=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_MILESTONE',taskId:'W004'}]),fixture)[0];
 assert.deepEqual(selectedText(milestone,fixture),['-','-','0']);
 const group=fixture.replace('auto | - | - | - | -','auto | - | - | 8 | W002');
 assert.deepEqual(selectedText(describeDocumentErrors(new DocumentValidationError([{code:'INVALID_GROUP_FIELDS',taskId:'W001'}]),group)[0],group),['8','W002']);
});

test('헤더·구분선·메타데이터 위치와 구조 오류의 열 미확인을 구분한다',()=>{
 const header=fixture.replace('| ID | 상위 ID |','| 코드 | 상위 ID |');
 assert.deepEqual(selectedText(describeDocumentErrors(new DocumentValidationError([{code:'INVALID_COLUMN_ORDER'}]),header)[0],header),['코드']);
 const separator=fixture.replace('|---|---|','|--|---|');
 const [problem]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_SEPARATOR'}]),separator);
 assert.deepEqual(selectedText(problem,separator),['--']);
 const prefix=fixture.replace('id_prefix: W','id_prefix: bad');
 assert.deepEqual(selectedText(describeDocumentErrors(new DocumentValidationError([{code:'INVALID_ID_PREFIX'}]),prefix)[0],prefix),['bad']);
 const short=fixture.replace('| W003 | W001 | task | 화면 설계 | 주요 화면 설계안 검토 및 승인 | codex | todo | - | - | 16 | W999 |','| W003 | W001 |');
 const [count]=describeDocumentErrors(new DocumentValidationError([{code:'INVALID_COLUMN_COUNT'}]),short);
 assert.deepEqual(count.positions,[]);assert.match(problemLocation(count),/행$/);
 const [unknown]=describeDocumentErrors('알 수 없는 오류',fixture);
 assert.equal(problemLocation(unknown),'위치 확인 불가');
 const [external]=describeDocumentErrors('W003: 상태 오류',fixture,'','앱 오류');
 assert.equal(external.id,'');assert.deepEqual(external.positions,[]);
});

test('공수 사용 메타데이터 오류의 원본 행과 수정 값을 안내한다',()=>{
 const text='---\nuse_effort: yes\n---\n';let error;
 try{parseWbs(text);}catch(e){error=e;}
 const [problem]=describeDocumentErrors(error,text);
 assert.equal(problem.field,'use_effort');assert.equal(problem.value,'yes');assert.deepEqual(problem.lineNumbers,[2]);assert.equal(problem.example,'use_effort: false');
});


test('진단 코드는 문구와 독립적이며 열린 오류의 언어·복사 내용만 전환한다',()=>{
 let error;try{parseWbs(fixture);}catch(caught){error=caught;}
 assert.ok(error instanceof DocumentValidationError);
 assert.deepEqual(error.diagnostics,[{code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W999',target:'missing'}]);
 // A changed/foreign exception message cannot affect structured diagnostics.
 error.message='Unrelated exception message';
 const [problem]=describeDocumentErrors(error,fixture,'Error-demo.wbs');
 const positions=structuredClone(problem.positions), raw=problem.raw;
 try{
  setLanguage('en');
  assert.equal(problem.field,'Predecessors');
  assert.match(problem.reason,/W999/);assert.doesNotMatch(problem.reason,/[가-힣]/);
  assert.doesNotMatch(problem.hint,/[가-힣]/);
  assert.match(formatDocumentProblem(problem),/Cause:/);
  assert.match(renderDocumentErrors([problem]),/Predecessors/);
  assert.equal(problem.name,'화면 설계');assert.equal(problem.raw,raw);assert.deepEqual(problem.positions,positions);
  setLanguage('ko');
  assert.equal(problem.field,'선행 작업');assert.match(formatDocumentProblem(problem),/수정 안내/);
 }finally{setLanguage('ko');}
});

test('언어별 모든 검증 코드의 원인과 안내를 표시하고 추측한 위치를 만들지 않는다',()=>{
 const codes=['INVALID_ID','DUPLICATE_ID','INVALID_TYPE','INVALID_STATUS','INVALID_DATE','INVALID_MILESTONE','INVALID_EFFORT','INVALID_GROUP_FIELDS','INVALID_PARENT','EMPTY_GROUP'];
 const issues=codes.map(code=>({code,taskId:'W003'}));
 issues.push({code:'PREFIX_MISMATCH',taskId:'W003',prefix:'OBS'},
  {code:'INVALID_DEPENDENCY',taskId:'W003',dependencyId:'W001',target:'group'},
  {code:'INVALID_DEPENDENCY_DATE',taskId:'W003',dependencyId:'W002'},
  {code:'CYCLIC_REFERENCE',taskId:'W003',relation:'parent'},
  {code:'CYCLIC_REFERENCE',taskId:'W003',relation:'deps'},
  ...['INVALID_USE_EFFORT','INVALID_ID_PREFIX','MISSING_WORK_SECTION','INVALID_COLUMN_ORDER','INVALID_SEPARATOR','INVALID_COLUMN_COUNT'].map(code=>({code})));
 const problems=describeDocumentErrors(new DocumentValidationError(issues),fixture);
 try{
  for(const language of ['en','ko']){
   setLanguage(language);
   for(const problem of problems){
    assert.ok(problem.reason);assert.ok(problem.hint);
    if(language==='en'){assert.doesNotMatch(problem.reason,/[가-힣]/);assert.doesNotMatch(problem.field,/[가-힣]/);}
   }
  }
  const [unknown]=describeDocumentErrors(Error('W003: 상태 오류'),fixture);
  assert.equal(unknown.id,'');assert.equal(unknown.field,'');assert.deepEqual(unknown.positions,[]);
 }finally{setLanguage('ko');}
});
