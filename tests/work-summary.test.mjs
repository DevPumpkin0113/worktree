import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWork} from '../src/domain/work-summary.mjs';

test('공수 가중 진척도는 그룹·마일스톤과 중복 합산하지 않는다',()=>{
 const rows=[{type:'group'}, {type:'task',effort:'2',status:'done',start:'-'}, {type:'task',effort:'6',status:'doing',start:'2026-10-20'}, {type:'milestone',effort:'0',status:'done',start:'-'}];
 assert.deepEqual(summarizeWork(rows),{taskCount:2,milestoneCount:1,completedTasks:1,completedMilestones:1,groupCount:1,missingDates:2,missingEfforts:0,progress:25});
 assert.equal(summarizeWork([...rows,{type:'task',effort:'-',status:'todo',start:'-'}]).progress,null);
 assert.equal(summarizeWork([]).progress,null);
});
