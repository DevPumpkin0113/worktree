import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workOwners,matchesWork} from '@worktree/core/work-filter';
import {renderTree} from '../helpers/render-helpers.tsx';

test('담당자·상태·검색을 함께 적용하고 미정과 all이라는 담당자를 구분한다',()=>{
 const rows=[{id:'W001',parent:'-',type:'group',name:'그룹',owner:'그룹 담당',status:'doing'},
  {id:'W002',parent:'W001',type:'task',name:'실행',owner:'codex',status:'doing'},
  {id:'W003',parent:'W001',type:'task',name:'인수',owner:'박대호',status:'todo'},
  {id:'W004',parent:'W001',type:'milestone',name:'미정',owner:'-',status:'todo'},
  {id:'W005',parent:'W001',type:'task',name:'all 담당자',owner:'all',status:'done'}];
 assert.deepEqual(new Set(workOwners(rows)),new Set(['codex','박대호','-','all']));assert.equal(workOwners(rows)[0],'-');
 const matches=row=>matchesWork(row,{query:'obs-002',status:'doing',owner:'owner:codex'},id=>id.replace('W','OBS-'));
 assert.deepEqual(rows.filter(matches).map(row=>row.id),['W002']);
 const html=renderTree(rows,matches,id=>id);assert.match(html,/그룹/);assert.doesNotMatch(html,/인수/);
 assert.equal(matchesWork(rows[3],{owner:'owner:-'}),true);
 assert.equal(matchesWork(rows[4],{owner:'owner:all'}),true);assert.equal(matchesWork(rows[1],{owner:'owner:all'}),false);
});

test('작업분류는 담당자·상태·검색과 함께 적용하고 all이라는 분류도 구분한다',()=>{
 const row={id:'W001',name:'오류 수정',type:'task',taskType:'bug',owner:'codex',status:'doing'};
 assert.equal(matchesWork(row,{taskType:'type:bug',owner:'owner:codex',status:'doing',query:'오류'}),true);
 assert.equal(matchesWork(row,{taskType:'type:feature'}),false);
 assert.equal(matchesWork(row,{taskType:'type:bug',status:'done'}),false);
 assert.equal(matchesWork({...row,taskType:'all'},{taskType:'type:all'}),true);
 assert.equal(matchesWork({...row,taskType:undefined},{taskType:'type:task'}),true);
});

test('우선순위 필터는 원본 ID·미지정과 나머지 조건을 함께 적용한다',()=>{
 const row={id:'W001',name:'수정',owner:'codex',status:'doing',taskType:'bug',priority:'high'};
 assert.equal(matchesWork(row,{priority:'priority:high',taskType:'type:bug',status:'doing'}),true);
 assert.equal(matchesWork(row,{priority:'priority:normal'}),false);
 assert.equal(matchesWork({...row,priority:'-'},{priority:'priority:-'}),true);
 assert.equal(matchesWork({...row,priority:'all'},{priority:'priority:all'}),true);
});
