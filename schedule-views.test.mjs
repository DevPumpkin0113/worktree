import {test} from 'node:test';
import assert from 'node:assert/strict';
import {graphLayout,relatedIds,timelineRange,renderGantt,renderDependencies} from './schedule-views.mjs';
const task=(id,deps=[],start='-',end='-')=>({id,name:id,parent:'-',type:'task',status:'todo',deps,start,end});
test('분기와 병합을 선행 단계 순서로 배치한다',()=>{const rows=[task('W001'),task('W002',['W001']),task('W003',['W001']),task('W004',['W002','W003']),task('W005')];const l=graphLayout(rows);assert.equal(l.layers.length,3);assert.equal(l.positions.get('W002').x,l.positions.get('W003').x);assert.ok(l.positions.get('W004').x>l.positions.get('W003').x);assert.deepEqual([...relatedIds(rows,'W002')].sort(),['W001','W002','W004']);});
test('필터된 노드의 선행 연결을 보존하고 관계없는 노드는 흐리게 처리한다',()=>{const rows=[task('W001'),task('W002',['W001']),task('W003')];const html=renderDependencies(rows,rows,'W002',id=>id);assert.match(html,/graph-node dim/);assert.match(html,/marker-end/);const filtered=renderDependencies(rows,[rows[1]],null,id=>id);assert.match(filtered,/data-select="W001"/);assert.doesNotMatch(filtered,/data-select="W003"/);});
test('간트 기간은 종료일을 포함하고 연도 경계를 처리한다',()=>{const rows=[task('W001',[],'2026-12-31','2027-01-02')];const range=timelineRange(rows);assert.equal(range.days,3);const html=renderGantt(rows,id=>id,'day','2027-01-01');assert.match(html,/today-line/);assert.match(html,/2026-12-31/);assert.match(html,/gantt-table/);assert.equal(timelineRange([task('W001')]),null);});
test('일정 미정 항목과 초장기 범위를 안전하게 표현한다',()=>{assert.match(renderGantt([task('W001')],id=>id),/일정이 아직 입력되지/);assert.doesNotMatch(renderGantt([task('W001')],id=>id),/gantt-table/);const range=timelineRange([task('W001',[],'1900-01-01','2200-01-01')]);assert.ok(range.width<=18001);});

import {bindChartPan} from './chart-pan.mjs';
test('빈 공간 드래그는 스크롤만 이동하고 이후 클릭을 억제한다',()=>{
 const root={},scroller={scrollLeft:100,scrollTop:80,classList:{toggle(){}}};
 const target={closest:selector=>selector==='.gantt-scroll,.diagram-scroll'?scroller:null};
 const pan=bindChartPan(root);
 root.onpointerdown({button:0,pointerType:'mouse',pointerId:1,clientX:50,clientY:50,target});
 root.onpointermove({pointerId:1,clientX:30,clientY:40,preventDefault(){}});root.onpointerup();
 assert.equal(scroller.scrollLeft,120);assert.equal(scroller.scrollTop,90);assert.equal(pan.consumeClick(),true);assert.equal(pan.consumeClick(),false);
 root.onpointerdown({button:0,pointerType:'mouse',pointerId:2,clientX:50,clientY:50,target});root.onpointerup();assert.equal(pan.consumeClick(),false);
});