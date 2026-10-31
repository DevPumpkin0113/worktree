import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeInsights } from '../../apps/desktop/src/views/insights-summary.ts';
import { parseProject } from '@worktree/core/project-document';
import { projectFixture } from '../helpers/project-fixture.ts';

test('인사이트는 그룹을 제외하고 직속·미지정 이슈를 상태와 담당자에 한 번만 집계한다', () => {
  const rows = parseProject(projectFixture()).rows;
  const base = rows.find(row => row.id === 'W001');
  const result = summarizeInsights([
    ...rows,
    { ...base, id:'W003', parent:'EP001', owner:'-', status:'blocked' },
    { ...base, id:'W004', parent:'-', owner:'-', status:'todo' },
    { ...rows[0], id:'EP001', parent:'-', type:'group', milestone:false, epic:true },
    { ...rows.find(row=>row.milestone), id:'MS002', parent:'-', name:'Empty' },
  ]);
  assert.equal(result.total, 4);
  assert.deepEqual(result.statuses.map(item=>item.count), [1,1,1,1]);
  assert.deepEqual(result.owners.find(item=>item.owner==='-'), {owner:'-',total:2,completed:0,blocked:1});
  assert.equal(result.owners.reduce((sum,item)=>sum+item.total,0),4);
  assert.deepEqual(result.epics.map(item=>[item.id,item.completed,item.total]), [['EP001',0,1],['-',1,3]]);
});

test('빈 인사이트 집계는 가짜 진행률 없이 0과 빈 목록을 반환한다', () => {
  const result = summarizeInsights([]);
  assert.equal(result.total,0);
  assert.deepEqual(result.statuses.map(item=>item.count),[0,0,0,0]);
  assert.deepEqual(result.owners,[]);
  assert.deepEqual(result.epics,[]);
});

test('에픽 진행률은 마일스톤 아래 이슈와 직속 이슈를 중복 없이 합치고 빈 에픽도 유지한다',()=>{
 const rows=parseProject(projectFixture()).rows.map(row=>row.milestone?{...row,parent:'EP001'}:row);
 const base=rows.find(row=>row.id==='W001');
 const epic={...rows.find(row=>row.milestone),id:'EP001',parent:'-',milestone:false,epic:true,name:'Epic'};
 const result=summarizeInsights([...rows,epic,{...epic,id:'EP002',name:'Empty'}, {...base,id:'W003',parent:'EP001',status:'done'}]);
 assert.deepEqual(result.epics.map(item=>[item.id,item.completed,item.total]),[['EP001',2,3],['EP002',0,0]]);
 assert.equal(result.epics.reduce((sum,item)=>sum+item.total,0),result.total);
});
