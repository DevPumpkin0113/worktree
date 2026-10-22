import { errorMessage } from './i18n/error-messages';
import { planProjectSettings } from './project-settings-write';
import { MAX_PROJECT_FILES, MAX_PROJECT_BYTES } from '@worktree/core/project-limits';
import { createHash } from 'node:crypto';
import { readSource } from '@worktree/core/project-source';
import { planTask, type DeletionPreview } from './task-write';
import { planComment } from './comment-write';
import type { Options } from './arguments';
import type { readProject } from './project-reader';
import { saveProject } from './native-store';
import { CliError } from './errors';
export interface WriteResult {
  operation: string;
  id: string;
  dryRun: boolean;
  changedFiles: string[];
  previousRevision: string;
  revision: string;
  deletion?: DeletionPreview;
  results?: { index: number; operation: string; id: string; deletion?: DeletionPreview }[];
}
export function executeWrite(
  options: Options,
  project: ReturnType<typeof readProject>,
): WriteResult {
  const { snapshot, source, root, revision } = project;
  if (options.values.expect && options.values.expect !== revision)
    throw new CliError('CONFLICT', errorMessage('projectRevisionChanged'));
  const plan = planWrite(options, project);
  const { id, text } = plan;
  const after = readSource(text);
  if (
    Object.keys(after.files).length > MAX_PROJECT_FILES ||
    Object.values(after.files).reduce((size, content) => size + Buffer.byteLength(content), 0) >
      MAX_PROJECT_BYTES
  )
    throw new CliError('LIMIT', errorMessage('projectFileCountOrContentSizeLimitExceeded'));
  const changedFiles = [...new Set([...Object.keys(source.files), ...Object.keys(after.files)])]
    .filter((file) => source.files[file] !== after.files[file])
    .sort();
  if (!options.dryRun) saveProject(root, snapshot, text, options.language);
  return {
    operation: options.command,
    deletion: plan.deletion,
    id,
    dryRun: options.dryRun,
    changedFiles,
    previousRevision: revision,
    revision: options.dryRun ? revision : createHash('sha256').update(text).digest('hex'),
  };
}

export function planWrite(options: Options, project: ReturnType<typeof readProject>) {
  return options.command === 'project-edit'
    ? { id: 'project', text: planProjectSettings(options, project), deletion: undefined }
    : options.command.startsWith('comment-')
      ? { ...planComment(options, project), deletion: undefined }
      : planTask(options, project);
}
