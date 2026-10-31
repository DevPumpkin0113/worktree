import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionTrend } from '../../apps/desktop/src/views/completion-trend.ts';

test('완료 그래프는 한국 날짜 경계·양끝 포함·미상·재오픈·그룹 제외를 적용한다',()=>{
 const task={type:'task',status:'done'};
 const rows=[{...task,completedAt:'2026-10-30T15:00:00.000Z'},{...task,completedAt:'2026-10-30T14:59:59.999Z'},task,{...task,status:'doing',completedAt:'2026-10-30T15:00:00.000Z'},{...task,type:'group',completedAt:'2026-10-30T15:00:00.000Z'}];
 const data=completionTrend(rows,'2026-10-31','2026-10-31');assert.equal(data.total,1);assert.equal(data.unknown,1);assert.equal(data.days.length,1);
 assert.equal(completionTrend(rows,'2026-10-30','2026-10-31').total,2);
});
test('날짜 오류·역순·366일 초과는 거부하고 빈 기간은 0으로 채운다',()=>{
 for(const [from,to] of [['',''],['2026-02-30','2026-03-01'],['2026-11-01','2026-10-31'],['2025-01-01','2026-12-31']]) assert.equal(completionTrend([],from,to),null);
 assert.deepEqual(completionTrend([],'2026-10-31','2026-10-31').days,[{date:'2026-10-31',count:0}]);
});
