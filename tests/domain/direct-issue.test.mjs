import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture, timestamp } from '../helpers/project-fixture.ts';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource } from '@worktree/core/project-source';
import { projectTaskDraft, updateProjectTask } from '@worktree/core/task-editing';
import { deleteProjectTask } from '@worktree/core/task-deletion';
import { summarizeGroups } from '@worktree/core/group-summary';
import { summarizeWork } from '@worktree/core/work-summary';
import { saveProjectComment } from '@worktree/core/comment-editing';
import { readTaskFile, writeTaskFile } from '@worktree/core/task-file';

function withEpic() {
  const before = projectFixture();
  return updateProjectTask(before, { ...projectTaskDraft(before), type: 'epic', name: 'Epic' }, undefined, timestamp).text;
}
function move(text, id, parent) { return updateProjectTask(text, { ...projectTaskDraft(text, id), parent }, id, timestamp).text; }
test('direct epic issues and milestone issues share aggregation without double counting', () => {
  let text = move(withEpic(), 'MS001', 'EP001');
  text = move(text, 'W001', 'EP001');
  const model = parseProject(text), issue = model.rows.find(r => r.id === 'W001');
  assert.equal(issue.parent, 'EP001'); assert.equal(issue.epic, false); assert.equal(issue.type, 'task');
  const metadata = readTaskFile('tasks/W001.md', readSource(text).files['tasks/W001.md']).metadata;
  assert.equal(metadata.milestone, '-'); assert.equal(metadata.epic, 'EP001');
  assert.equal(summarizeGroups(model.rows).get('EP001').taskCount, 2);
  assert.equal(summarizeGroups(model.rows).get('MS001').taskCount, 1);
  assert.equal(summarizeWork(model.rows).taskCount, 2);
  assert.equal(model.rows.find(r => r.epic).status, 'doing');
});
test('moving direct issues preserves ID, dependencies and comment files and clears competing membership', () => {
  let text = saveProjectComment(withEpic(), 'W001', 'Author', 'Stable comment', undefined, timestamp);
  const before = readSource(text), commentPath = Object.keys(before.files).find(p => p.startsWith('comments/'));
  text = move(text, 'W001', 'EP001'); text = move(text, 'W001', 'MS001');
  const after = readSource(text), metadata = readTaskFile('tasks/W001.md', after.files['tasks/W001.md']).metadata;
  assert.equal(metadata.id, 'W001'); assert.equal(metadata.milestone, 'MS001'); assert.equal(metadata.epic, '-');
  assert.equal(after.files[commentPath], before.files[commentPath]);
  assert.deepEqual(parseProject(text).rows.find(r => r.id === 'W002').deps, ['W001']);
  text = move(text, 'W001', '-'); assert.equal(parseProject(text).rows.find(r => r.id === 'W001').parent, '-');
});
test('dual membership and epic metadata pointing at a milestone are rejected', () => {
  const text = withEpic(), source = readSource(text), file = 'tasks/W001.md';
  const { metadata, description } = readTaskFile(file, source.files[file]);
  metadata.epic = 'EP001'; source.files[file] = writeTaskFile(metadata, description);
  assert.throws(() => parseProject(serializeSource(source)), error => error.field === 'epic');
  metadata.milestone = '-'; metadata.epic = 'MS001'; source.files[file] = writeTaskFile(metadata, description);
  assert.throws(() => parseProject(serializeSource(source)), error => error.field === 'epic');
});
test('milestone keep deletion retains issues directly in the epic; epic keep deletion unassigns direct issues', () => {
  let text = move(withEpic(), 'MS001', 'EP001');
  text = deleteProjectTask(text, 'MS001', { children: 'keep', detachPredecessors: false }, timestamp);
  assert.ok(parseProject(text).rows.filter(r => r.type === 'task').every(r => r.parent === 'EP001'));
  text = deleteProjectTask(text, 'EP001', { children: 'keep', detachPredecessors: false }, timestamp);
  assert.ok(parseProject(text).rows.every(r => r.parent === '-'));
  assert.equal(parseProject(text).rows.length, 2);
});
test('recursive epic deletion removes direct and milestone issues plus their comment files', () => {
  let text = move(withEpic(), 'MS001', 'EP001');
  text = move(text, 'W001', 'EP001');
  text = saveProjectComment(text, 'W001', 'Author', 'Direct', undefined, timestamp);
  text = saveProjectComment(text, 'W002', 'Author', 'Nested', undefined, timestamp);
  const deleted = deleteProjectTask(text, 'EP001', { children: 'delete', detachPredecessors: false }, timestamp);
  assert.equal(parseProject(deleted).rows.length, 0);
  assert.equal(parseProject(deleted).comments.length, 0);
  assert.deepEqual(Object.keys(readSource(deleted).files), ['project.json']);
});
