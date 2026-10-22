import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
const result = spawnSync('cargo', ['build', '--manifest-path', 'native/Cargo.toml', '--release'], {
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: 'dist/main.js',
});
mkdirSync('dist', { recursive: true });
const name = 'worktree-store' + (process.platform === 'win32' ? '.exe' : '');
copyFileSync('native/target/release/' + name, 'dist/' + name);
