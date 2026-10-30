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
function fixture(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-epic-icons-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); ok(root, 'init'); return root; }

test('CLI epic icon flags and JSON edit round trip while unrelated partial edits preserve the choice', t => {
  const root = fixture(t); ok(root, 'epic', 'add', '--title', 'Epic', '--icon', 'terminal');
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.icon, 'terminal');
  assert.equal(ok(root, 'epic', 'list').tasks[0].icon, 'terminal');
  ok(root, 'epic', 'edit', 'EP001', '--title', 'Renamed');
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.icon, 'terminal');
  const input = path.join(root, 'icon-input.json'); fs.writeFileSync(input, JSON.stringify({ icon: '👩🏽‍💻' }));
  const revision = ok(root, 'status').revision;
  ok(root, 'epic', 'edit', 'EP001', '--input', input, '--dry-run', '--expect', revision);
  assert.equal(ok(root, 'status').revision, revision);
  ok(root, 'epic', 'edit', 'EP001', '--input', input, '--expect', revision);
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.icon, '👩🏽‍💻');
  ok(root, 'epic', 'edit', 'EP001', '--title', 'Emoji partial edit');
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.icon, '👩🏽‍💻');
  ok(root, 'epic', 'edit', 'EP001', '--icon', '-');
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'docs/worktree/epics/EP001.md'), 'utf8'), /^icon:/m);
  assert.equal(ok(root, 'epic', 'list').tasks[0].icon, 'lucide:layers');
  assert.equal(ok(root, 'validate').valid, true);
});
test('legacy read does not write defaults; schema/help expose choices and invalid or non-epic icons fail unchanged', t => {
  const root = fixture(t); ok(root, 'epic', 'add', '--title', 'Legacy');
  const file = path.join(root, 'docs/worktree/epics/EP001.md'), before = fs.readFileSync(file, 'utf8');
  const schema = ok(root, 'schema').schema.epic.icon;
  assert.equal(schema.enum, undefined);
  assert.equal(schema.type, 'string');
  assert.match(schema.description, /One complete Unicode emoji/);
  assert.deepEqual(schema.legacyValues, ['layers', 'folder', 'desktop', 'terminal', 'tools', 'rocket']);
  assert.ok(schema.supportedLucideValues.includes('lucide:folder'));
  assert.ok(schema.supportedLucideValues.includes('lucide:panels-top-left'));
  assert.equal(schema.supportedLucideValues.includes('lucide:bogus'), false);
  assert.equal(schema.default, 'lucide:layers'); assert.equal(schema.unset, '-');
  const help = ok(root, 'epic', 'edit', '--help').help;
  assert.match(help, /--icon/); assert.ok(help.includes('🚀')); for (const icon of schema.legacyValues) assert.ok(help.includes(icon));
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.icon, 'lucide:layers'); ok(root, 'epic', 'list');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  const revision = ok(root, 'status').revision;
  const input = path.join(root, 'icon-input.json');
  for (const value of ['unknown', null, 3, [], '🚀🚀', 'text🚀', '🚀\n', '👩‍', 'lucide:bogus', 'lucide:', 'lucide:Folder', 'lucide:folder ', '<svg/>', 'https://example.com/icon.svg']) {
    fs.writeFileSync(input, JSON.stringify({ icon: value }));
    assert.equal(JSON.parse(call(root, 'epic', 'edit', 'EP001', '--input', input).stderr).error.code, 'USAGE');
    assert.equal(ok(root, 'status').revision, revision);
  }
  for (const kind of ['task', 'milestone']) {
    fs.writeFileSync(input, JSON.stringify({ title: 'Invalid', icon: 'folder' }));
    assert.equal(JSON.parse(call(root, kind, 'add', '--input', input).stderr).error.code, 'USAGE');
    assert.equal(JSON.parse(call(root, kind, 'add', '--title', 'Invalid', '--icon', 'folder').stderr).error.code, 'USAGE');
  }
  assert.equal(ok(root, 'status').revision, revision);
});

test('CLI emoji arguments preserve whole family, flag, skin-tone and keycap sequences', t => {
  const root = fixture(t);
  for (const icon of ['👨‍👩‍👧‍👦', '🇰🇷', '👩🏽‍💻', '1️⃣']) {
    const created = ok(root, 'epic', 'add', '--title', 'Emoji', '--icon', icon);
    assert.equal(ok(root, 'epic', 'show', created.id).task.icon, icon);
    ok(root, 'epic', 'edit', created.id, '--title', 'Preserved');
    assert.equal(ok(root, 'epic', 'show', created.id).task.icon, icon);
  }
});

test('CLI Lucide icons round trip through flags and JSON and remain stable on partial edits', t => {
  const root = fixture(t);
  const created = ok(root, 'epic', 'add', '--title', 'Lucide', '--icon', 'lucide:layers');
  assert.equal(ok(root, 'epic', 'show', created.id).task.icon, 'lucide:layers');
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'docs/worktree/epics', created.id + '.md'), 'utf8'), /^icon:/m);
  const input = path.join(root, 'lucide-input.json'); fs.writeFileSync(input, JSON.stringify({ icon: 'lucide:folder-open' }));
  ok(root, 'epic', 'edit', created.id, '--input', input);
  ok(root, 'epic', 'edit', created.id, '--title', 'Preserved Lucide');
  assert.equal(ok(root, 'epic', 'show', created.id).task.icon, 'lucide:folder-open');
  assert.equal(ok(root, 'epic', 'list').tasks[0].icon, 'lucide:folder-open');
  for (const kind of ['task', 'milestone']) {
    fs.writeFileSync(input, JSON.stringify({ title: 'Invalid Lucide', icon: 'lucide:folder' }));
    assert.equal(JSON.parse(call(root, kind, 'add', '--input', input).stderr).error.code, 'USAGE');
  }
  ok(root, 'epic', 'edit', created.id, '--icon', '🚀');
  assert.equal(ok(root, 'epic', 'show', created.id).task.icon, '🚀');
  ok(root, 'epic', 'edit', created.id, '--icon', '-');
  assert.equal(ok(root, 'epic', 'show', created.id).task.icon, 'lucide:layers');
  assert.equal(ok(root, 'validate').valid, true);
});

test('CLI epic color supports flags, JSON, partial preservation and reset', t => {
  const root = fixture(t); ok(root, 'epic', 'add', '--title', 'Color', '--icon', 'lucide:folder', '--icon-color', '#EF4444');
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.iconColor, '#ef4444');
  assert.equal(ok(root, 'epic', 'list').tasks[0].iconColor, '#ef4444');
  ok(root, 'epic', 'edit', 'EP001', '--title', 'Preserved');
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.iconColor, '#ef4444');
  const input = path.join(root, 'color.json'); fs.writeFileSync(input, JSON.stringify({ iconColor: '#123456' }));
  ok(root, 'epic', 'edit', 'EP001', '--input', input);
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.iconColor, '#123456');
  const revision = ok(root, 'status').revision;
  for (const value of ['red', '#abc', '#1234567', '#123456\n']) assert.equal(call(root, 'epic', 'edit', 'EP001', '--icon-color', value).status, 2);
  for (const kind of ['task', 'milestone']) assert.equal(call(root, kind, 'add', '--title', 'Invalid', '--icon-color', '#123456').status, 2);
  assert.equal(ok(root, 'status').revision, revision);
  ok(root, 'epic', 'edit', 'EP001', '--icon-color', '-');
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.iconColor, undefined);
  assert.equal(ok(root, 'epic', 'show', 'EP001').task.icon, 'lucide:folder');
});
