import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWork} from '../src/domain/work-summary.mjs';
import {renderMetrics} from '../src/views/work-summary.mjs';

test('공수 가중 진척도는 그룹·마일스톤과 중복 합산하지 않는다',()=>{
 const rows=[{type:'group'}, {type:'task',effort:'2',status:'done',start:'-'}, {type:'task',effort:'6',status:'doing',start:'2026-10-20'}, {type:'milestone',effort:'0',status:'done',start:'-'}];
 assert.deepEqual(summarizeWork(rows),{taskCount:2,milestoneCount:1,completedTasks:1,completedMilestones:1,groupCount:1,missingDates:2,missingEfforts:0,taskProgress:50,progress:25});
 assert.equal(summarizeWork([...rows,{type:'task',effort:'-',status:'todo',start:'-'}]).progress,null);
 assert.equal(summarizeWork([]).progress,null);
});

test('작업 개수 진행률은 공수 미정과 무관하며 작업 없음·0%·100%를 구분한다',()=>{
 const tasks=[{type:'task',effort:'-',status:'done',start:'-'},{type:'task',effort:'-',status:'doing',start:'-'}];
 const summary=summarizeWork([...tasks,{type:'group'},{type:'milestone',effort:'0',status:'done',start:'-'}]);
 assert.equal(summary.taskProgress,50);assert.equal(summary.progress,null);
 const html=renderMetrics(summary);
 assert.match(html,/<span>작업<\/span><strong>1 \/ 2<\/strong>/);assert.doesNotMatch(html,/<span>완료 작업<\/span>/);
 assert.match(html,/<progress max="100" value="50"/);assert.match(html,/작업 개수 기준/);
 assert.equal(summarizeWork([{...tasks[0],status:'todo'}]).taskProgress,0);
 assert.equal(summarizeWork([tasks[0]]).taskProgress,100);
 assert.equal(summarizeWork([]).taskProgress,null);
 assert.match(renderMetrics(summarizeWork([])),/작업 없음/);
});
