import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWbs} from '../../src/domain/model.ts';
const header='## 작업 목록\n| ID | 상위 ID | 유형 | 작업명 | 산출물 / 완료 기준 | 담당자 | 상태 | 시작일 | 종료일 | 예상 공수(h) | 선행 작업 |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const group='| W001 | - | group | 그룹 | 완료 | - | auto | - | - | - | - |\n';
const task=(id,parent,dep,status='todo')=>`| ${id} | ${parent} | task | 작업 | 완료 | - | ${status} | - | - | - | ${dep} |\n`;
test('작업 목록만 읽고 그룹 상태를 집계한다',()=>{const doc=parseWbs(header+group+task('W002','W001','-','done')+'## 기타\n| 설명 | 표 |');assert.equal(doc.rows.length,2);assert.equal(doc.rows[0].status,'done');});
test('선행 작업 순환을 거부한다',()=>assert.throws(()=>parseWbs(header+task('W001','-','W002')+task('W002','-','W001')),/순환/));
test('계층 순환과 없는 참조를 거부한다',()=>{assert.throws(()=>parseWbs(header+group.replace('| - | group','| W001 | group')),/순환/);assert.throws(()=>parseWbs(header+task('W002','W999','-')),/참조 오류/);});


test('구분선 누락·열 수 오류·짧은 구분선을 거부해 첫 작업 유실을 막는다',()=>{
 const row=task('W001','-','-');
 for(const separator of ['', '|---|---|\n', '|--|---|---|---|---|---|---|---|---|---|---|\n']){
  const text=header.replace(/\|---.*\n/,separator)+row;
  assert.throws(()=>parseWbs(text),/구분선/);
 }
 assert.equal(parseWbs(header+row).rows[0].id,'W001');
});

test('작업 표 뒤 같은 섹션의 설명 표는 작업에 포함하지 않는다',()=>{
 const row=task('W001','-','-');
 const text=header+row+'\n### 설명\n| W001 | 설명용 |\n|---|---|\n';
 assert.equal(parseWbs(text).rows.length,1);
 const aligned=header.replaceAll('---',':---:');
 assert.equal(parseWbs(aligned+row).rows.length,1);
});

test('문서별 공수 사용은 생략 시 true이며 true·false만 허용한다',()=>{
 const body=header+task('W001','-','-');
 assert.equal(parseWbs(body).useEffort,true);
 for(const value of ['true','false'])assert.equal(parseWbs('---\nuse_effort: '+value+'\n---\n'+body).useEffort,value==='true');
 for(const value of ['', 'yes','0','"false"'])assert.throws(()=>parseWbs('---\nuse_effort: '+value+'\n---\n'+body),/use_effort/);
 assert.equal(parseWbs(body+'\nuse_effort: false').useEffort,true);
 assert.throws(()=>parseWbs('---\nuse_effort: false\n---\n'+body.replace('| - | - | - | - |\n','| - | - | 0 | - |\n')),/공수/);
});
