import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {timelineRange,ganttGeometry,ganttTicks,ganttBar,isoWeek,initialWindowStart,dateString,DAY_MS,MAX_GANTT_SCROLL} from '../../src/views/gantt-timeline.ts';
import {GanttView} from '../../src/components/workspace/GanttView.tsx';
const task=(start='-',end='-')=>({id:'W001',name:'작업',parent:'-',type:'task',status:'todo',deps:[],start,end});
const props=(rows,unit='day',today='2026-10-21')=>({rows,rangeRows:rows,label:id=>id,selectedId:null,onSelect(){},unit,onUnit(){},onScroll(){},today});
test('일 단위는 폭과 일정 범위에 관계없이 7일이며 오늘이 가운데다',()=>{
 const today='2027-01-01',rows=[task('2026-12-31','2027-01-02')];
 const range=timelineRange(rows,'day',today);assert.equal(range.days,7);
 for(const width of [300,960,1600]){
  const geometry=ganttGeometry(range,'day',width,today);assert.equal(geometry.timelineWidth/geometry.dayWidth,7);
  const start=geometry.dateForScroll(geometry.initialScroll);
  const x=(Date.parse(today)-start)/DAY_MS*geometry.dayWidth+geometry.dayWidth/2;
  assert.ok(Math.abs(x-geometry.timelineWidth/2)<0.001);
  const bar=ganttBar(rows[0],start,geometry);assert.ok(Math.abs(bar.width-3*geometry.dayWidth)<0.001);
 }
});
test('과거·미래 일정만 있어도 오늘 중심 구간을 포함하고 나머지는 스크롤한다',()=>{
 for(const rows of [[task('2020-01-01','2020-01-03')],[task('2030-01-01','2030-01-03')]]){
  const range=timelineRange(rows,'day','2026-10-21');const g=ganttGeometry(range,'day',960,'2026-10-21');
  assert.equal(g.dateForScroll(g.initialScroll),initialWindowStart('2026-10-21','day'));
  assert.equal(g.dateForScroll(0),range.start);assert.equal(g.dateForScroll(g.maxScroll),range.end-6*DAY_MS);
 }
});
test('주 단위는 월요일 시작 5주이며 주차는 ISO 연도 경계를 따른다',()=>{
 assert.deepEqual(isoWeek(Date.parse('0001-01-01')),{year:1,week:1});assert.deepEqual(isoWeek(Date.parse('2027-01-01')),{year:2026,week:53});assert.deepEqual(isoWeek(Date.parse('2027-01-04')),{year:2027,week:1});
 const range=timelineRange([task('2026-10-20','2026-10-23')],'week','2026-10-21');const g=ganttGeometry(range,'week',960,'2026-10-21');
 const start=g.dateForScroll(g.initialScroll);assert.equal(dateString(start),'2026-10-05');assert.equal(g.windowDays,35);
 const ticks=ganttTicks(start,'week',g);assert.equal(ticks.length,5);assert.ok(ticks.every(t=>new Date(t.time).getUTCDay()===1));assert.deepEqual(ticks.map(t=>isoWeek(t.time).week),[41,42,43,44,45]);
});
test('초장기 일정은 스크롤과 그리는 눈금 수를 제한하고 날짜 배율은 유지한다',()=>{
 for(const unit of ['day','week']){
  const range=timelineRange([task('0001-01-01','9999-12-31')],unit,'2026-10-21');const g=ganttGeometry(range,unit,960,'2026-10-21');
  assert.ok(g.maxScroll<=MAX_GANTT_SCROLL);assert.ok(g.canvasWidth<=MAX_GANTT_SCROLL+960);
  for(const left of [0,g.initialScroll,g.maxScroll/2,g.maxScroll]){
   const start=g.dateForScroll(left);assert.ok(ganttTicks(start,unit,g).length<=8);
   const bar=ganttBar(task('0001-01-01','9999-12-31'),start,g);assert.ok(bar.x>=0);assert.ok(bar.width<=g.timelineWidth);
  }
 }
});
test('간트 React 출력은 5주 표기·안전한 제목·일정 미정 분리를 유지한다',()=>{
 const row={...task('2026-10-20','2026-10-23'),name:'<script>제목</script>'};
 const html=renderToStaticMarkup(createElement(GanttView,props([row],'week')));
 assert.match(html, /gantt-fixed-heading[\s\S]*<thead>[\s\S]*<\/thead>[\s\S]*class="gantt-scroll"/);
 assert.doesNotMatch(html.slice(html.indexOf('class="gantt-scroll"')), /<thead>/);
 assert.match(html,/data-visible-days="35"/);assert.match(html,/43주차/);assert.match(html,/gantt-frame/);assert.match(html,/today-line/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 const unknown=renderToStaticMarkup(createElement(GanttView,props([task()])));assert.match(unknown,/일정이 아직 입력되지/);assert.doesNotMatch(unknown,/gantt-table/);assert.equal(timelineRange([task()]),null);
});
