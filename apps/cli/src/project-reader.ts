import { systemError } from './i18n/error-context';
import { errorMessage } from './i18n/error-messages';
import { projectFolder, hasProjectMarker } from './project-location';
import {
  MAX_PROJECT_FILES as MAX_FILES,
  MAX_PROJECT_BYTES as MAX_BYTES,
} from '@worktree/core/project-limits';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseProject } from '@worktree/core/project-document';
import { isRelativePath, serializeSource, type ProjectSource } from '@worktree/core/project-source';
import { CliError } from './errors';
function fail(code: string, file: string): never {
  throw new CliError(
    code,
    code === 'RECOVERY_REQUIRED'
      ? systemError(code) + ': ' + file
      : errorMessage('projectInspection', [code, file]),
    file,
  );
}
function safeJoin(root: string, relative: string) {
  if (
    !isRelativePath(relative) ||
    relative.includes('\\') ||
    relative.split('/').some((p) => /[. ]$/.test(p))
  )
    fail('UNSAFE_PATH', relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const meta = fs.lstatSync(current, { throwIfNoEntry: false });
    if (meta?.isSymbolicLink()) fail('UNSAFE_PATH', current);
  }
  return current;
}
function text(file: string) {
  const meta = fs.lstatSync(file);
  if (meta.isSymbolicLink() || !meta.isFile()) fail('UNSAFE_PATH', file);
  if (meta.size > MAX_BYTES) fail('LIMIT', file);
  // Cap the read itself as well as metadata, so a growing file cannot bypass the limit.
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    if (!fs.fstatSync(fd).isFile()) fail('UNSAFE_PATH', file);
    const buffer = Buffer.alloc(64 * 1024);
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const read = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!read) break;
      size += read;
      if (size > MAX_BYTES) fail('LIMIT', file);
      chunks.push(Buffer.from(buffer.subarray(0, read)));
    }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
  } finally {
    fs.closeSync(fd);
  }
}
function journal(root: string, name: string) {
  const file = safeJoin(root, name);
  if (fs.existsSync(file)) fail('RECOVERY_REQUIRED', file);
}
export function readProject(input: string) {
  const root = projectFolder(input);
  if (!hasProjectMarker(root))
    throw new CliError(
      'NOT_INITIALIZED',
      errorMessage('projectIsNotInitializedRunWorktreeInitProject', [root]),
      path.join(root, 'worktree.json'),
    );
  journal(root, '.worktree-reset.json');
  const markerPath = safeJoin(root, 'worktree.json');
  const markerText = text(markerPath);
  let marker: { dataDirectory?: unknown };
  try {
    marker = JSON.parse(markerText);
  } catch {
    fail('INVALID_PROJECT', markerPath);
  }
  if (!marker || typeof marker.dataDirectory !== 'string') fail('INVALID_PROJECT', markerPath);
  const data = safeJoin(root, marker.dataDirectory);
  journal(data, '.worktree-transaction.json');
  const source: ProjectSource = { dataDirectory: marker.dataDirectory, files: {} };
  let size = 0;
  function add(key: string) {
    const file = safeJoin(data, key);
    const content = text(file);
    size += Buffer.byteLength(content);
    if (Object.keys(source.files).length >= MAX_FILES || size > MAX_BYTES) fail('LIMIT', file);
    source.files[key] = content;
  }
  add('project.json');
  for (const folder of ['tasks', 'milestones']) {
    const directory = safeJoin(data, folder);
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory).sort())
      if (file.endsWith('.md')) add(`${folder}/${file}`);
  }
  const comments = safeJoin(data, 'comments');
  if (fs.existsSync(comments))
    for (const task of fs.readdirSync(comments).sort()) {
      if (!/^[A-Z]{1,20}\d{3,}$/.test(task)) fail('INVALID_PROJECT', path.join(comments, task));
      const folder = safeJoin(data, `comments/${task}`);
      if (!fs.statSync(folder).isDirectory()) fail('INVALID_PROJECT', folder);
      for (const file of fs.readdirSync(folder).sort())
        if (file.endsWith('.md')) add(`comments/${task}/${file}`);
    }
  const snapshot = serializeSource(source);
  return {
    root,
    source,
    snapshot,
    revision: createHash('sha256').update(snapshot).digest('hex'),
    model: parseProject(snapshot),
  };
}
