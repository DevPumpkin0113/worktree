import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const products = {
  app: {workspace: 'apps/desktop', crate: 'apps/desktop/src-tauri', name: 'worktree'},
  cli: {workspace: 'apps/cli', crate: 'apps/cli/native', name: 'worktree-store'},
};
export function manageVersion(directory, target, next) {
  const read = p => fs.readFileSync(path.join(directory, p), 'utf8');
  const write = (p, value) => fs.writeFileSync(path.join(directory, p), value);
  const json = p => JSON.parse(read(p));
  const lock = json('package-lock.json');
  const crateVersion = p => read(p + '/Cargo.toml').match(/\[package\][\s\S]*?^version = "([^"]+)"/m)?.[1];
  const crates = [...Object.values(products), {crate:'packages/storage', name:'worktree-storage'}];
  if (target === '--check') {
    const expected = Object.fromEntries(crates.map(p => [p.name, crateVersion(p.crate)]));
    const packages = ['', 'apps/desktop', 'apps/cli', 'packages/core'];
    for (const p of packages) {
      const version = json(p ? p + '/package.json' : 'package.json').version;
      if (!semver.test(version) || lock.packages[p]?.version !== version || (!p && lock.version !== version)) throw Error('npm version mismatch: ' + (p || 'root'));
    }
    for (const [name, product] of Object.entries(products)) {
      const version = json(product.workspace + '/package.json').version;
      if (version !== expected[product.name]) throw Error(name + ' Cargo version mismatch');
      if (name === 'app' && json(product.crate + '/tauri.conf.json').version !== version) throw Error('Tauri version mismatch');
    }
    for (const p of crates) for (const block of read(p.crate + '/Cargo.lock').split('[[package]]')) {
      const name = block.match(/^name = "([^"]+)"/m)?.[1];
      if (Object.hasOwn(expected, name) && block.match(/^version = "([^"]+)"/m)?.[1] !== expected[name]) throw Error('Cargo lock mismatch: ' + name);
    }
    return 'App and CLI versions verified independently';
  }
  if (!Object.hasOwn(products, target) || !semver.test(next || '')) throw Error('Usage: npm run version:set -- app|cli X.Y.Z');
  const product = products[target];
  const pkg = json(product.workspace + '/package.json');pkg.version = next;
  write(product.workspace + '/package.json', JSON.stringify(pkg, null, 2) + '\n');
  lock.packages[product.workspace].version = next;
  write('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
  write(product.crate + '/Cargo.toml', read(product.crate + '/Cargo.toml').replace(/(\[package\][\s\S]*?^version = ")[^"]+/m, '$1' + next));
  for (const p of crates) write(p.crate + '/Cargo.lock', read(p.crate + '/Cargo.lock').split('[[package]]').map(block => block.match(/^name = "([^"]+)"/m)?.[1] === product.name ? block.replace(/^version = "[^"]+"/m, 'version = "' + next + '"') : block).join('[[package]]'));
  if (target === 'app') {
    const configPath = product.crate + '/tauri.conf.json';const config = json(configPath);config.version = next;write(configPath, JSON.stringify(config, null, 2) + '\n');
  }
  return target + ' version updated: ' + next + '; update CHANGELOG.md';
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(manageVersion(root, process.argv[2], process.argv[3]));
