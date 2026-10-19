import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWbs} from './model.mjs';
const header='## 작업 목록\n| ID | 상위 ID | 유형 | 작업명 | 산출물 / 완료 기준 | 담당자 | 상태 | 시작일 | 종료일 | 예상 공수(h) | 선행 작업 |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const group='| W001 | - | group | 그룹 | 완료 | - | auto | - | - | - | - |\n';
const task=(id,parent,dep,status='todo')=>`| ${id} | ${parent} | task | 작업 | 완료 | - | ${status} | - | - | - | ${dep} |\n`;
test('작업 목록만 읽고 그룹 상태를 집계한다',()=>{const doc=parseWbs(header+group+task('W002','W001','-','done')+'## 기타\n| 설명 | 표 |');assert.equal(doc.rows.length,2);assert.equal(doc.rows[0].status,'done');});
test('선행 작업 순환을 거부한다',()=>assert.throws(()=>parseWbs(header+task('W001','-','W002')+task('W002','-','W001')),/순환/));
test('계층 순환과 없는 참조를 거부한다',()=>{assert.throws(()=>parseWbs(header+group.replace('| - | group','| W001 | group')),/순환/);assert.throws(()=>parseWbs(header+task('W002','W999','-')),/참조 오류/);});
