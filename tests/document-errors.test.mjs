import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseWbs} from '../src/domain/model.mjs';
import {describeDocumentErrors,formatDocumentProblem} from '../src/domain/document-errors.mjs';
import {renderDocumentErrors} from '../src/views/document-errors.mjs';
const fixture=fs.readFileSync(new URL('../examples/Error-demo.wbs',import.meta.url),'utf8');

test('참조 오류에서 작업·문제 값·수정 안내와 해당 원문만 추출한다',()=>{
 let error;try{parseWbs(fixture);}catch(e){error=e;}
 const [problem]=describeDocumentErrors(error,fixture,'Error-demo.wbs');
 assert.equal(problem.id,'W003');assert.equal(problem.name,'화면 설계');assert.equal(problem.field,'선행 작업');assert.equal(problem.value,'W999');assert.match(problem.hint,/task 또는 milestone/);assert.match(problem.raw,/W003/);assert.doesNotMatch(problem.raw,/W006/);
 assert.doesNotThrow(()=>parseWbs(fixture.replace('16 | W999 |','16 | W002 |')));
});
test('여러 오류와 중복 ID의 원문을 유지하고 문서 외 오류에 작업을 잘못 연결하지 않는다',()=>{
 const duplicate=fixture.replace(/\r?\n\r?\n## 이슈 및 결정 사항/,'\n| W003 | W001 | task | 중복 작업 | 확인 | codex | todo | - | - | 1 | - |\n\n## 이슈 및 결정 사항');
 const problems=describeDocumentErrors(Error('W003: 중복 ID\nW003: 선행 작업 W999 참조 오류\nW003: 중복 ID'),duplicate);
 assert.equal(problems.length,2);assert.equal(problems[0].raw.split('\n').length,2);
 const [read]=describeDocumentErrors('C:\\files\\missing.wbs: 파일 없음','','missing.wbs','파일 읽기 오류');assert.equal(read.id,'');assert.match(read.hint,/접근 권한/);
 const [header]=describeDocumentErrors('작업 표의 열 개수가 다릅니다.',fixture);assert.match(header.hint,/11개 열/);assert.equal(header.raw,'');
});
test('오류 원인·원문·경로를 HTML로 실행하지 않고 텍스트로 출력한다',()=>{
 const [problem]=describeDocumentErrors(Error('W003: 선행 작업 W999 참조 오류'),fixture.replace('화면 설계','<img src=x onerror=alert(1)>'),'<script>bad()</script>');
 const html=renderDocumentErrors([problem]);assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
});

test('BOM·CRLF·빈 줄이 있어도 실제 작업 행 번호를 반환하고 다른 설명 표는 제외한다',()=>{
 const text='\uFEFF'+fixture.replace(/\r?\n/g,'\r\n').replace('## 작업 목록','\r\n\r\n## 작업 목록');
 const expected=text.split('\r\n').findIndex(line=>line.startsWith('| W003 |'))+1;
 const [problem]=describeDocumentErrors('W003: 선행 작업 W999 참조 오류',text+'\r\n| W003 | 설명용 행 |');
 assert.deepEqual(problem.lineNumbers,[expected]);
 assert.match(formatDocumentProblem(problem),new RegExp('위치: '+expected+'행'));
 assert.match(formatDocumentProblem(problem),/W999/);
});
test('중복 ID의 모든 행을 표시하고 표·메타데이터 오류에도 확인 가능한 위치만 연결한다',()=>{
 const text=fixture.replace(/\r?\n\r?\n## 이슈 및 결정 사항/,'\n| W003 | W001 | task | 중복 | 확인 | codex | todo | - | - | 1 | - |\n\n## 이슈 및 결정 사항');
 const [duplicate]=describeDocumentErrors('W003: 중복 ID',text);
 assert.equal(duplicate.lineNumbers.length,2);assert.notEqual(...duplicate.lineNumbers);
 const header=fixture.replace('| ID | 상위 ID |','| 코드 | 상위 ID |');
 const [columns]=describeDocumentErrors('작업 표의 열 이름 또는 순서가 공통 규격과 다릅니다.',header);
 assert.deepEqual(columns.lineNumbers,[header.split(/\r?\n/).findIndex(line=>line.startsWith('| 코드 |'))+1]);
 const short=fixture.replace('| W003 | W001 | task | 화면 설계 | 주요 화면 설계안 검토 및 승인 | codex | todo | - | - | 16 | W999 |','| W003 | W001 |');
 const [count]=describeDocumentErrors('작업 표의 열 개수가 다릅니다.',short);assert.match(count.raw,/W003/);assert.equal(count.lineNumbers.length,1);
 const prefix=fixture.replace('id_prefix: W','id_prefix: bad');
 const [meta]=describeDocumentErrors('id_prefix는 영문 대문자로 작성하세요. 예: W, OBS',prefix);assert.deepEqual(meta.lineNumbers,[prefix.split(/\r?\n/).findIndex(line=>line==='id_prefix: bad')+1]);
 const [unknown]=describeDocumentErrors('작업 목록 섹션이 없습니다.','문서');assert.deepEqual(unknown.lineNumbers,[]);assert.match(formatDocumentProblem(unknown),/위치 확인 불가/);
});

test('구분선 누락은 첫 작업의 실제 위치를 안내하고 설명 표의 같은 ID는 제외한다',()=>{
 const text=fixture.replace(/^\|[-: |]+\|\r?\n/m,'');
 let error;try{parseWbs(text);}catch(caught){error=caught;}
 const [problem]=describeDocumentErrors(error,text);
 assert.match(problem.hint,/구분선/);
 assert.deepEqual(problem.lineNumbers,[text.split(/\r?\n/).findIndex(line=>line.startsWith('| W001 |'))+1]);
 const [reference]=describeDocumentErrors('W003: 선행 작업 W999 참조 오류',fixture+'\n### 설명\n| W003 | 설명 |');
 assert.equal(reference.lineNumbers.length,1);
});
