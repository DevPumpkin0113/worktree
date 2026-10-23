import path from 'node:path';
import { projectConfig } from '@worktree/core/project-source';
import type { Options } from './arguments';
import { CliError } from './errors';
import { errorMessage } from './i18n/error-messages';
import { readProject } from './project-reader';
import { invokeStorage } from './native-store';

export function resetProject(options: Options) {
  const project = readProject(options.project);
  const config = projectConfig(project.source);
  if (options.values.expect && options.values.expect !== project.revision)
    throw new CliError('CONFLICT', errorMessage('projectChangedReadItAgainBeforeRetrying'));
  const confirmation = options.values['confirm-name'];
  if (confirmation !== undefined && confirmation !== config.name)
    throw new CliError('CONFIRMATION_REQUIRED', errorMessage('resetNameMismatch'));
  if (!options.dryRun && (!options.yes || confirmation === undefined))
    throw new CliError('CONFIRMATION_REQUIRED', errorMessage('resetConfirmationRequired'));
  invokeStorage({
    operation: 'reset',
    root: project.root,
    expected: project.snapshot,
    confirmation: confirmation ?? config.name,
    apply: !options.dryRun,
    language: options.language,
  });
  return {
    reset: !options.dryRun,
    dryRun: options.dryRun,
    initialized: options.dryRun,
    project: config.name,
    root: project.root,
    dataDirectory: project.source.dataDirectory,
    deletedPaths: [
      path.join(project.root, project.source.dataDirectory),
      path.join(project.root, 'worktree.json'),
    ],
    taskCount: project.model.rows.filter((row) => !row.milestone).length,
    milestoneCount: project.model.rows.filter((row) => row.milestone).length,
    commentCount: project.model.comments?.filter((comment) => !comment.deleted).length ?? 0,
    revision: project.revision,
    nextCommand: 'worktree init',
  };
}
