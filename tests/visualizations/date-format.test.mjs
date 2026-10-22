import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatProjectDate, formatProjectTimestamp } from '../../apps/desktop/src/views/date-format.ts';
test('프로젝트 날짜는 저장된 달력 날짜를 시간대 변환 없이 표시한다', () => {
 assert.equal(formatProjectDate('2026-10-21','yyyy.MM.dd'),'2026.10.21');
 assert.equal(formatProjectDate('2026-10-21','dd/MM/yyyy'),'21/10/2026');
 assert.equal(formatProjectDate('-','MM/dd/yyyy'),'-');
});
test('프로젝트 시각은 로컬 날짜와 12·24시간제를 사용하고 잘못된 입력은 안전하게 표시한다', () => {
 const value=new Date(2026,9,21,14,30).toISOString();
 assert.equal(formatProjectTimestamp(value,'yyyy.MM.dd','24h','en'),'2026.10.21 14:30');
 assert.match(formatProjectTimestamp(value,'MM/dd/yyyy','12h','en'),/^10\/21\/2026 02:30\sPM$/);
 const midnight=new Date(2026,9,21,0,5).toISOString();assert.equal(formatProjectTimestamp(midnight,'yyyy-MM-dd','24h','en'),'2026-10-21 00:05');
 assert.equal(formatProjectTimestamp('bad'),'—');assert.equal(formatProjectTimestamp(undefined),'—');
});

import { DATE_ORDERS, DATE_SEPARATORS, DATE_FORMATS, composeDateFormat, dateFormatParts } from '@worktree/core/project-display';
test('날짜 순서와 구분기호의 9가지 조합은 분리·조합 및 날짜 표시를 보존한다', () => {
 assert.equal(new Set(DATE_FORMATS).size,9);
 for (const order of DATE_ORDERS) for (const separator of DATE_SEPARATORS) {
  const format=composeDateFormat(order,separator);
  assert.deepEqual(dateFormatParts(format),{order,separator});
  const expected={ymd:['2026','10','21'],dmy:['21','10','2026'],mdy:['10','21','2026']}[order].join(separator);
  assert.equal(formatProjectDate('2026-10-21',format),expected);
 }
});
