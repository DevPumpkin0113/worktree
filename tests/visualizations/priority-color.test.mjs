import {test} from 'node:test';
import assert from 'node:assert/strict';
import {priorityColor} from '../../src/views/priority-color.ts';
test('우선순위 5단계는 빨강·주황·노랑·연두·초록 순서로 색상을 나눈다',()=>{
 assert.equal(priorityColor(0,5),'var(--color-priority-high)');
 assert.equal(priorityColor(1,5),'color-mix(in srgb, var(--color-priority-high) 50%, var(--color-priority-middle))');
 assert.equal(priorityColor(2,5),'var(--color-priority-middle)');
 assert.equal(priorityColor(3,5),'color-mix(in srgb, var(--color-priority-middle) 50%, var(--color-priority-low))');
 assert.equal(priorityColor(4,5),'var(--color-priority-low)');
});
test('우선순위 개수와 경계를 반영하고 미지정에는 색상을 반환하지 않는다',()=>{
 assert.equal(priorityColor(0,3),'var(--color-priority-high)');assert.equal(priorityColor(1,3),'var(--color-priority-middle)');assert.equal(priorityColor(2,3),'var(--color-priority-low)');
 assert.equal(priorityColor(0,1),'var(--color-priority-high)');assert.equal(priorityColor(1,2),'var(--color-priority-low)');
 assert.match(priorityColor(1,4),/high.*33.333%.*middle/);assert.match(priorityColor(2,4),/middle.*66.667%.*low/);
 for(const [index,count] of [[-1,3],[0,0],[3,3],[0.5,3],[0,1.5]])assert.equal(priorityColor(index,count),undefined);
});
