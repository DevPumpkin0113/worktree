import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture, timestamp } from '../helpers/project-fixture.ts';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource } from '@worktree/core/project-source';
import { projectTaskDraft, updateProjectTask, nextProjectId } from '@worktree/core/task-editing';
import { deleteProjectTask, projectDeletionImpact } from '@worktree/core/task-deletion';
import { summarizeGroups } from '@worktree/core/group-summary';
import { summarizeWork } from '@worktree/core/work-summary';
import { createIdLabels } from '@worktree/core/id-display';
import { saveProjectComment } from '@worktree/core/comment-editing';
import { readTaskFile, writeTaskFile } from '@worktree/core/task-file';
import { validateTaskDraft } from '@worktree/core/task-draft-validation';

function createEpic(text, name = 'Epic') {
  return updateProjectTask(text, { ...projectTaskDraft(text), type: 'epic', name }, undefined, timestamp);
}
function assign(text, milestone, epic) {
  return updateProjectTask(text, { ...projectTaskDraft(text, milestone), parent: epic }, milestone, timestamp).text;
}
test('legacy documents read unchanged; assigning and moving milestones preserves task IDs and files', () => {
  const original = projectFixture();
  assert.equal(parseProject(original).rows.find(r => r.id === 'MS001').parent, '-');
  const created = createEpic(original);
  assert.equal(created.id, 'EP001');
  assert.equal(createIdLabels(parseProject(created.text), 'hyphen').get(created.id), 'EP-001');
  const first = assign(created.text, 'MS001', created.id);
  const second = createEpic(first, 'Second');
  const moved = assign(second.text, 'MS001', second.id);
  for (const id of ['W001', 'W002']) assert.equal(readSource(moved).files[`tasks/${id}.md`], readSource(original).files[`tasks/${id}.md`]);
  assert.equal(parseProject(moved).rows.find(r => r.id === 'MS001').parent, 'EP002');
  assert.equal(summarizeGroups(parseProject(moved).rows).get('EP002').taskCount, 2);
  const summary = summarizeWork(parseProject(moved).rows);
  assert.equal(summary.taskCount, 2); assert.equal(summary.milestoneCount, 1); assert.equal(summary.epicCount, 2);
});
test('epic aggregates task status and deleting with keep detaches only milestones', () => {
  const original = projectFixture();
  const created = createEpic(original);
  const text = assign(created.text, 'MS001', created.id);
  assert.equal(parseProject(text).rows.find(r => r.epic).status, 'doing');
  const kept = deleteProjectTask(text, 'EP001', { children: 'keep', detachPredecessors: false }, timestamp);
  assert.equal(parseProject(kept).rows.find(r => r.id === 'MS001').parent, '-');
  for (const id of ['W001', 'W002']) assert.equal(readSource(kept).files[`tasks/${id}.md`], readSource(original).files[`tasks/${id}.md`]);
  assert.equal(nextProjectId(kept, 'epic'), 'EP002');
});
test('epic recursive deletion removes descendants and comments while guarding external dependencies', () => {
  let text = assign(createEpic(projectFixture()).text, 'MS001', 'EP001');
  text = saveProjectComment(text, 'W001', 'Author', 'Comment', undefined, timestamp);
  text = updateProjectTask(text, { ...projectTaskDraft(text), name: 'Outside', deps: 'W001' }, undefined, timestamp).text;
  assert.equal(projectDeletionImpact(text, 'EP001', 'delete').removed.size, 4);
  assert.throws(() => deleteProjectTask(text, 'EP001', { children: 'delete', detachPredecessors: false }));
  const removed = deleteProjectTask(text, 'EP001', { children: 'delete', detachPredecessors: true });
  assert.deepEqual(parseProject(removed).rows.map(r => r.id), ['W003']);
  assert.deepEqual(parseProject(removed).rows[0].deps, []);
  assert.equal(parseProject(removed).comments.length, 0);
  assert.equal(nextProjectId(removed), 'W004');
});
test('legacy EP task prefixes share a collision-free ID space with new epics', () => {
  const original = projectFixture('Legacy EP', 'EP');
  const created = createEpic(original);
  assert.equal(created.id, 'EP003');
  const task = updateProjectTask(created.text, { ...projectTaskDraft(created.text), name: 'Task' }, undefined, timestamp);
  assert.equal(task.id, 'EP004');
  assert.equal(nextProjectId(task.text, 'epic'), 'EP005');
  const deleted = deleteProjectTask(task.text, 'EP004', { children: 'keep', detachPredecessors: false });
  assert.equal(nextProjectId(deleted, 'epic'), 'EP005');
  const legacyDeleted = deleteProjectTask(original, 'EP002', { children: 'keep', detachPredecessors: false });
  assert.equal(nextProjectId(legacyDeleted, 'epic'), 'EP003');
  const data = readSource(original);
  data.files['epics/EP001.md'] = data.files['milestones/MS001.md'].replaceAll('MS001', 'EP001');
  assert.throws(() => parseProject(serializeSource(data)));
});
test('epic membership validates exact container kind and numeric sequences', () => {
  const created = createEpic(projectFixture());
  const badMilestone = { ...projectTaskDraft(created.text, 'MS001'), parent: 'W001' };
  assert.match(validateTaskDraft(created.text, badMilestone, 'MS001').parent, /에픽|epic/);
  assert.throws(() => assign(created.text, 'MS001', 'EP999'));
  const direct = updateProjectTask(created.text, { ...projectTaskDraft(created.text, 'W001'), parent: 'EP001' }, 'W001', timestamp);
  assert.equal(parseProject(direct.text).rows.find(r => r.id === 'W001').parent, 'EP001');
  const data = readSource(created.text);
  const config = JSON.parse(data.files['project.json']); config.nextEpicNumber = 0;
  data.files['project.json'] = JSON.stringify(config);
  assert.throws(() => parseProject(serializeSource(data)));
  const invalid = readSource(created.text), file = 'epics/EP001.md';
  const decoded = readTaskFile(file, invalid.files[file]); decoded.metadata.id = 'EP000';
  invalid.files[file] = writeTaskFile(decoded.metadata);
  assert.throws(() => parseProject(serializeSource(invalid)));
});
