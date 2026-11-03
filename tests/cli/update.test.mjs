import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isNewer, latestVersion, readCache, saveCache, runUpdate } from '../../apps/cli/src/update.ts';
import { parseArguments } from '../../apps/cli/src/arguments.ts';
import { runCommand } from '../../apps/cli/src/run-command.ts';

test('stable version comparison handles numeric ordering and rejects unsafe registry values', () => {
  for (const [latest, current, expected] of [
    ['0.10.0', '0.9.9', true], ['1.0.0', '0.99.0', true],
    ['0.7.0', '0.7.0', false], ['0.6.9', '0.7.0', false],
    ['0.8.0-beta.1', '0.7.0', false], ['1.0.0 && echo bad', '0.7.0', false],
  ]) assert.equal(isNewer(latest, current), expected);
});
test('registry check validates responses and uses a bounded request', async () => {
  assert.equal(await latestVersion(async (url, options) => {
    assert.equal(url, 'https://registry.npmjs.org/@devpumpkin0113%2fworktree-cli/latest');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify({ version: '0.8.0' }));
  }), '0.8.0');
  await assert.rejects(latestVersion(async () => new Response('', { status: 503 })));
  await assert.rejects(latestVersion(async () => new Response('{"version":"latest"}')));
  await assert.rejects(latestVersion(async () => { throw Error('offline'); }));
});
test('missing, malformed and invalid caches are ignored', () => {
  const dir = mkdtempSync(join(tmpdir(), 'worktree-update-'));
  try {
    const path = join(dir, 'cache.json');
    assert.equal(readCache(path), undefined);
    saveCache('0.8.0', path);
    assert.equal(readCache(path).latest, '0.8.0');
    assert.ok(readCache(path).checkedAt <= Date.now());
    for (const data of ['{', 'null', '{"checkedAt":"bad","latest":"0.8.0"}']) {
      writeFileSync(path, data);
      assert.equal(readCache(path), undefined);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('update requires no project and check is limited to update', () => {
  const options = parseArguments(['update', '--check', '--json'], 'missing-project');
  assert.equal(options.command, 'update');
  assert.equal(options.values.check, 'true');
  assert.throws(() => parseArguments(['status', '--check'], '.'));
  assert.match(runCommand(['update', '--help'], '.').output, /--check/);
  assert.throws(() => runCommand(['update'], '.', true), /outside the shell/);
});
test('explicit check returns JSON, caches result and never installs; network and source install fail clearly', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'worktree-update-command-'));
  try {
    const cache = join(dir, 'cache.json');
    const options = parseArguments(['update', '--check', '--json'], dir);
    const fetcher = async () => new Response('{"version":"99.0.0"}');
    const result = JSON.parse(await runUpdate(options, cache, fetcher));
    assert.equal(result.latest, '99.0.0');
    assert.equal(result.updateAvailable, true);
    assert.equal(result.updated, false);
    assert.equal(readCache(cache).latest, '99.0.0');
    await assert.rejects(runUpdate(options, cache, async () => { throw Error('offline'); }), { code: 'UPDATE_CHECK_FAILED' });
    await assert.rejects(runUpdate(parseArguments(['update'], dir), cache, fetcher), { code: 'UPDATE_UNSUPPORTED' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('cached update notice uses stderr in a terminal and never pollutes JSON output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'worktree-update-notice-'));
  try {
    saveCache('99.0.0', join(dir, 'Worktree', 'cli-update.json'));
    const run = (json) => spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
      `Object.defineProperty(process.stderr, 'isTTY', {value:true}); Object.defineProperty(process.stdout, 'isTTY', {value:true}); process.argv=['node','cli','version'${json ? ", '--json'" : ''}]; await import('./apps/cli/src/main.ts');`],
      { env: { ...process.env, LOCALAPPDATA: dir }, encoding: 'utf8' });
    const terminal = run(false);
    assert.equal(terminal.status, 0, terminal.stderr);
    assert.match(terminal.stderr, /99.0.0.*worktree update/);
    assert.doesNotMatch(terminal.stdout, /99.0.0/);
    const json = run(true);
    assert.equal(json.status, 0, json.stderr);
    assert.equal(json.stderr, '');
    assert.ok(JSON.parse(json.stdout).version);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
