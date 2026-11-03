import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from '../package.json';
import type { Options } from './arguments';
import { CliError } from './errors';

const PACKAGE = '@devpumpkin0113/worktree-cli';
const DAY = 24 * 60 * 60 * 1000;
export const cachePath = join(process.env.LOCALAPPDATA || homedir(), 'Worktree', 'cli-update.json');
export function isNewer(latest: string, current: string) {
  if (!/^\d+\.\d+\.\d+$/.test(latest) || !/^\d+\.\d+\.\d+$/.test(current)) return false;
  const a = latest.split('.').map(Number),
    b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export async function latestVersion(fetcher: typeof fetch = fetch) {
  const response = await fetcher(
    'https://registry.npmjs.org/@devpumpkin0113%2fworktree-cli/latest',
    {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    },
  );
  if (!response.ok) throw new Error(`npm registry: HTTP ${response.status}`);
  const body = (await response.json()) as { version?: unknown };
  if (typeof body.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(body.version))
    throw new Error('Invalid npm version response');
  return body.version;
}
export function saveCache(latest: string, path = cachePath) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ checkedAt: Date.now(), latest }));
}
export function readCache(path = cachePath): { checkedAt: number; latest: string } | undefined {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (
      Number.isFinite(value.checkedAt) &&
      typeof value.latest === 'string' &&
      /^\d+\.\d+\.\d+$/.test(value.latest)
    )
      return value;
  } catch {
    /* An absent or damaged cache never blocks project commands. */
  }
  return undefined;
}
export function automaticUpdateNotice(language: 'ko' | 'en') {
  try {
    const cached = readCache();
    if (cached && isNewer(cached.latest, version))
      console.error(
        language === 'ko'
          ? `Worktree CLI ${version} → ${cached.latest}. 업데이트: worktree update`
          : `Worktree CLI ${version} → ${cached.latest}. Update: worktree update`,
      );
    if (cached && Date.now() >= cached.checkedAt && Date.now() - cached.checkedAt < DAY) return;
    const worker = join(dirname(fileURLToPath(import.meta.url)), 'update-check.js');
    if (!existsSync(worker)) return;
    // Reserve the check interval before detaching, including on network failure.
    saveCache(cached?.latest ?? version);
    const child = spawn(process.execPath, [worker], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* Update notices must never change the outcome of a command. */
  }
}
export async function runUpdate(
  options: Options,
  cacheFile = cachePath,
  fetcher: typeof fetch = fetch,
) {
  const ko = options.language === 'ko';
  let latest: string;
  try {
    latest = await latestVersion(fetcher);
  } catch {
    throw new CliError(
      'UPDATE_CHECK_FAILED',
      ko
        ? '업데이트 확인에 실패했습니다. 네트워크를 확인하고 다시 시도하세요.'
        : 'Update check failed. Check your network and retry.',
    );
  }
  try {
    saveCache(latest, cacheFile);
  } catch {
    /* Cache writes are optional. */
  }
  const available = isNewer(latest, version);
  let updated = false;
  if (available && !options.values.check) {
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    if (!root.replaceAll('\\', '/').endsWith('/node_modules/@devpumpkin0113/worktree-cli'))
      throw new CliError(
        'UPDATE_UNSUPPORTED',
        ko
          ? 'npm 전역 설치본에서 실행하세요: npm install -g @devpumpkin0113/worktree-cli@latest'
          : 'Run from the npm global installation: npm install -g @devpumpkin0113/worktree-cli@latest',
      );
    const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (!existsSync(npmCli))
      throw new CliError(
        'UPDATE_UNSUPPORTED',
        'npm install -g @devpumpkin0113/worktree-cli@latest',
      );
    const npmOptions = { windowsHide: true, encoding: 'utf8' as const };
    const globalRoot = spawnSync(process.execPath, [npmCli, 'root', '--global'], npmOptions);
    if (
      globalRoot.error ||
      globalRoot.status !== 0 ||
      resolve(root).toLowerCase() !== resolve(globalRoot.stdout.trim(), PACKAGE).toLowerCase()
    )
      throw new CliError(
        'UPDATE_UNSUPPORTED',
        ko
          ? 'npm 전역 설치본에서 업데이트를 실행하세요.'
          : 'Run update from the npm global installation.',
      );
    const result = spawnSync(
      process.execPath,
      [npmCli, 'install', '--global', `${PACKAGE}@${latest}`],
      npmOptions,
    );
    if (result.error || result.status !== 0)
      throw new CliError(
        'UPDATE_FAILED',
        ko
          ? '업데이트에 실패했습니다. npm 설치 경로와 권한을 확인하세요.'
          : 'Update failed. Check the npm installation and permissions.',
      );
    updated = true;
  }
  const result = { current: version, latest, updateAvailable: available, updated };
  if (options.json) return JSON.stringify(result);
  return updated
    ? ko
      ? `${latest} 업데이트 완료. 다음 실행부터 적용됩니다.`
      : `Updated to ${latest}. Applies on the next run.`
    : available
      ? `${version} → ${latest}. ${ko ? '업데이트' : 'Update'}: worktree update`
      : ko
        ? `최신 버전입니다 (${version}).`
        : `Already up to date (${version}).`;
}
