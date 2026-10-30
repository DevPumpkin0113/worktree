import {test} from 'node:test';
import assert from 'node:assert/strict';
import {graphLayout,relatedIds,renderDependencies} from '../../apps/desktop/src/views/schedule-views.ts';
const task=(id,deps=[],start='-',end='-')=>({id,name:id,parent:'-',type:'task',status:'todo',deps,start,end});
test('분기와 병합을 선행 단계 순서로 배치한다',()=>{const rows=[task('W001'),task('W002',['W001']),task('W003',['W001']),task('W004',['W002','W003']),task('W005')];const l=graphLayout(rows);assert.equal(l.layers.length,3);assert.equal(l.positions.get('W002').x,l.positions.get('W003').x);assert.ok(l.positions.get('W004').x>l.positions.get('W003').x);assert.deepEqual([...relatedIds(rows,'W002')].sort(),['W001','W002','W004']);});
test('필터된 노드의 선행 연결을 보존하고 관계없는 노드는 흐리게 처리한다',()=>{const rows=[task('W001'),task('W002',['W001']),task('W003')];const html=renderDependencies(rows,rows,'W002',id=>id);assert.match(html,/graph-node dim/);assert.match(html,/marker-end/);const filtered=renderDependencies(rows,[rows[1]],null,id=>id);assert.match(filtered,/data-select="W001"/);assert.doesNotMatch(filtered,/data-select="W003"/);});
import {bindChartPan} from '../../apps/desktop/src/interactions/chart-pan.ts';
test('빈 공간 드래그는 스크롤만 이동하고 이후 클릭을 억제한다',()=>{
 const root={},scroller={scrollLeft:100,scrollTop:80,classList:{toggle(){}}};
 const target={closest:selector=>selector==='.gantt-scroll,.diagram-scroll'?scroller:null};
 const pan=bindChartPan(root);
 root.onpointerdown({button:0,pointerType:'mouse',pointerId:1,clientX:50,clientY:50,target});
 root.onpointermove({pointerId:1,clientX:30,clientY:40,preventDefault(){}});root.onpointerup();
 assert.equal(scroller.scrollLeft,120);assert.equal(scroller.scrollTop,90);assert.equal(pan.consumeClick(),true);assert.equal(pan.consumeClick(),false);
 root.onpointerdown({button:0,pointerType:'mouse',pointerId:2,clientX:50,clientY:50,target});root.onpointerup();assert.equal(pan.consumeClick(),false);
});
test('네트워크 노드는 캔버스 안에 배치하고 긴 제목을 폭 기준 말줄임용 HTML로 안전하게 보존한다',()=>{
 const rows=[task('A'),task('B',['A']),task('C',['A']),task('D',['B','C'])];
 const layout=graphLayout(rows);
 for(const point of layout.positions.values()) {
  assert.ok(point.x>=0 && point.x+220<=layout.width);
  assert.ok(point.y>=36 && point.y+64<=layout.height);
 }
 rows[0].name='Long title <script>alert(1)</script> preserved for width-based ellipsis';
 const html=renderDependencies(rows,rows,null,id=>id);
 assert.match(html,/<div[^>]*class="graph-name">Long title &lt;script&gt;alert\(1\)&lt;\/script&gt; preserved for width-based ellipsis<\/div>/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/graph-priority-strip/);
 assert.doesNotMatch(html,/<p class="sub">/);
});
