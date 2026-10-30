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
function fixture(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-direct-issues-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); ok(root, 'init'); ok(root, 'epic', 'add', '--title', 'Epic'); return root; }
test('task commands support direct epic issues and include milestone descendants in epic filters', t => {
  const root = fixture(t); ok(root, 'task', 'add', '--title', 'Direct', '--epic', 'EP001');
  ok(root, 'milestone', 'add', '--title', 'Milestone', '--epic', 'EP001');
  ok(root, 'task', 'add', '--title', 'Nested', '--milestone', 'MS001');
  assert.deepEqual(ok(root, 'task', 'list', '--epic', 'EP001').tasks.map(r => r.id), ['W001', 'W002']);
  assert.deepEqual(ok(root, 'task', 'list', '--milestone', '-').tasks.map(r => r.id), ['W001']);
  const listed = ok(root, 'task', 'list').tasks[0]; assert.equal(listed.epic, 'EP001'); assert.equal(listed.milestone, '-');
  assert.deepEqual(ok(root, 'schema').schema.task.epic.enum, ['-', 'EP001']);
  ok(root, 'milestone', 'delete', 'MS001', '--children', 'keep', '--yes');
  assert.equal(ok(root, 'task', 'show', 'W002').task.parent, 'EP001');
  ok(root, 'epic', 'delete', 'EP001', '--children', 'keep', '--yes');
  assert.ok(ok(root, 'task', 'list').tasks.every(r => r.epic === '-' && r.milestone === '-'));
  assert.equal(ok(root, 'validate').valid, true);
});
test('parent input conflicts fail without changes and direct issues keep IDs and comments when moved', t => {
  const root = fixture(t); ok(root, 'milestone', 'add', '--title', 'Milestone', '--epic', 'EP001');
  ok(root, 'task', 'add', '--title', 'Direct', '--epic', 'EP001', '--milestone', '-');
  ok(root, 'comment', 'add', 'W001', '--author', 'Author', '--text', 'Retained');
  const before = ok(root, 'status').revision;
  for (const args of [ ['--epic', 'EP001', '--milestone', 'MS001'], ['--epic', 'MS001'], ['--milestone', 'EP001'] ]) {
    assert.equal(JSON.parse(call(root, 'task', 'edit', 'W001', ...args).stderr).error.code, 'USAGE');
    assert.equal(ok(root, 'status').revision, before);
  }
  ok(root, 'task', 'edit', 'W001', '--epic', '-', '--milestone', 'MS001');
  const moved = ok(root, 'task', 'show', 'W001'); assert.equal(moved.task.parent, 'MS001'); assert.equal(moved.comments[0].text, 'Retained');
  ok(root, 'task', 'edit', 'W001', '--milestone', '-');
  assert.equal(ok(root, 'task', 'show', 'W001').task.parent, 'EP001');
  ok(root, 'task', 'edit', 'W001', '--milestone', '-');
  assert.equal(ok(root, 'task', 'show', 'W001').task.parent, 'EP001');
  ok(root, 'task', 'edit', 'W001', '--epic', '-');
  assert.equal(ok(root, 'task', 'show', 'W001').task.parent, '-');
  ok(root, 'task', 'edit', 'W001', '--epic', 'EP001');
  ok(root, 'task', 'edit', 'W001', '--epic', '-', '--milestone', '-');
  assert.equal(ok(root, 'task', 'show', 'W001').task.parent, '-');
  const plain = spawnSync(process.execPath, [main, 'status', '--project', root, '--lang', 'en'], { encoding: 'utf8' });
  assert.match(plain.stdout, /Issues: 0\/1/); assert.doesNotMatch(plain.stdout, /Tasks:/);
});
