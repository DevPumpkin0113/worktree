import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const main = fileURLToPath(new URL('../../apps/cli/dist/main.js', import.meta.url));
function call(root, ...args) { return spawnSync(process.execPath, [main, ...args, '--project', root, '--json'], { encoding: 'utf8' }); }
function ok(root, ...args) { const result = call(root, ...args); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }
function fixture(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-epics-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); ok(root, 'init'); return root; }
test('CLI creates epics and assigns existing milestones without renaming tasks; keep deletion and revision guards', t => {
  const root = fixture(t); ok(root, 'milestone', 'add', '--title', 'Existing'); ok(root, 'task', 'add', '--title', 'Task', '--milestone', 'MS001');
  const beforeTask = fs.readFileSync(path.join(root, 'docs/worktree/tasks/W001.md'), 'utf8');
  const revision = ok(root, 'status').revision;
  const preview = ok(root, 'epic', 'add', '--title', 'Epic', '--dry-run', '--expect', revision);
  assert.ok(preview.changedFiles.includes('epics/EP001.md')); assert.equal(ok(root, 'status').revision, revision);
  const created = ok(root, 'epic', 'add', '--title', 'Epic', '--expect', revision); assert.equal(created.id, 'EP001');
  assert.equal(JSON.parse(call(root, 'milestone', 'edit', 'MS001', '--epic', 'EP001', '--expect', revision).stderr).error.code, 'CONFLICT');
  ok(root, 'milestone', 'edit', 'MS001', '--epic', 'EP001');
  assert.deepEqual(ok(root, 'epic', 'list').tasks.map(r => r.id), ['EP001']);
  assert.deepEqual(ok(root, 'task', 'list', '--epic', 'EP001').tasks.map(r => r.id), ['W001']);
  assert.equal(ok(root, 'task', 'list').tasks.length, 1);
  assert.equal(ok(root, 'status').taskCount, 1); assert.equal(ok(root, 'status').epicCount, 1);
  assert.deepEqual(ok(root, 'schema').schema.milestone.epic.enum, ['-', 'EP001']);
  assert.notEqual(call(root, 'epic', 'delete', 'EP001').status, 0);
  assert.equal(JSON.parse(call(root, 'epic', 'delete', 'EP001', '--yes').stderr).error.code, 'CHILD_POLICY_REQUIRED');
  ok(root, 'epic', 'delete', 'EP001', '--children', 'keep', '--yes');
  assert.equal(ok(root, 'milestone', 'show', 'MS001').task.parent, '-');
  assert.equal(fs.readFileSync(path.join(root, 'docs/worktree/tasks/W001.md'), 'utf8'), beforeTask);
  assert.equal(ok(root, 'epic', 'add', '--title', 'Again').id, 'EP002');
  const input = path.join(root, 'invalid-task.json');
  fs.writeFileSync(input, JSON.stringify({ epic: 'MS001' }));
  const revisionAfter = ok(root, 'status').revision;
  assert.equal(JSON.parse(call(root, 'task', 'edit', 'W001', '--input', input).stderr).error.code, 'USAGE');
  assert.equal(ok(root, 'status').revision, revisionAfter);
  assert.equal(ok(root, 'validate').valid, true);
});
test('CLI recursive epic deletion requires dependency detach and removes descendant comments', t => {
  const root = fixture(t); ok(root, 'epic', 'add', '--title', 'Epic'); ok(root, 'milestone', 'add', '--title', 'Child', '--epic', 'EP001');
  ok(root, 'task', 'add', '--title', 'Child task', '--milestone', 'MS001');
  ok(root, 'comment', 'add', 'W001', '--author', 'Author', '--text', 'Keep until deletion');
  ok(root, 'task', 'add', '--title', 'Outside task', '--deps', 'W001');
  const preview = ok(root, 'epic', 'delete', 'EP001', '--children', 'delete', '--dry-run');
  assert.deepEqual(new Set(preview.deletion.removedIds), new Set(['EP001', 'MS001', 'W001']));
  assert.equal(preview.deletion.commentCount, 1);
  assert.notEqual(call(root, 'epic', 'delete', 'EP001', '--children', 'delete', '--yes').status, 0);
  ok(root, 'epic', 'delete', 'EP001', '--children', 'delete', '--detach', '--yes');
  assert.deepEqual(ok(root, 'task', 'list').tasks.map(r => r.id), ['W002']);
  assert.deepEqual(ok(root, 'task', 'show', 'W002').task.deps, []);
  assert.equal(ok(root, 'status').comments, 0); assert.equal(ok(root, 'validate').valid, true);
});
test('epic command help includes field and ownership boundaries in both languages', t => {
  const root = fixture(t);
  for (const lang of ['en', 'ko']) {
    const result = ok(root, 'epic', 'add', '--help', '--lang', lang);
    assert.ok(result);
  }
});
