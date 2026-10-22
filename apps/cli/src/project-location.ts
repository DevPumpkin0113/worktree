import { errorMessage } from './i18n/error-messages';
import fs from 'node:fs';
import path from 'node:path';
import { CliError } from './errors';
export function projectFolder(input: string) {
  const selected = path.resolve(input);
  const folder = path.basename(selected) === 'worktree.json' ? path.dirname(selected) : selected;
  if (!fs.existsSync(folder)) return folder;
  if (!fs.statSync(folder).isDirectory())
    throw new CliError('UNSAFE_PATH', errorMessage('notAProjectDirectory', [folder]));
  return fs.realpathSync(folder);
}
export function hasProjectMarker(root: string) {
  return !!fs.lstatSync(path.join(root, 'worktree.json'), { throwIfNoEntry: false });
}
