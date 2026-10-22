import { errorMessage } from './i18n/error-messages';
import { createHash } from 'node:crypto';
import { parseProject } from '@worktree/core/project-document';
import { readSource } from '@worktree/core/project-source';
import { MAX_PROJECT_BYTES, MAX_PROJECT_FILES } from '@worktree/core/project-limits';
import { parseArguments, type Options } from './arguments';
import { planWrite } from './write-commands';
import { jsonInput, prepareBody } from './input';
import { saveProject } from './native-store';
import { BatchError, CliError } from './errors';
import type { readProject } from './project-reader';
const MAX_BATCH_COMMANDS = 100;
export function executeBatch(options: Options, original: ReturnType<typeof readProject>) {
  if (!options.values.input) throw new CliError('USAGE', errorMessage('specifyInputBatchJson'));
  if (options.values.expect && options.values.expect !== original.revision)
    throw new CliError('CONFLICT', errorMessage('projectRevisionChanged'));
  const input = jsonInput(options.values.input, options.session) as { commands?: unknown };
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => k !== 'commands') ||
    !Array.isArray(input.commands) ||
    !input.commands.length ||
    input.commands.length > MAX_BATCH_COMMANDS
  )
    throw new CliError('USAGE', errorMessage('batchRequiresToCommandsInACommandsArray'));
  let project = original;
  const results: {
    index: number;
    operation: string;
    id: string;
    deletion?: ReturnType<typeof planWrite>['deletion'];
  }[] = [];
  for (const [index, args] of input.commands.entries()) {
    try {
      if (!Array.isArray(args) || !args.length || !args.every((v) => typeof v === 'string'))
        throw new CliError('USAGE', errorMessage('invalidBatchCommandAtIndex', [index]));
      // One root, revision, language and commit boundary belong to the outer command.
      if (
        args.some((v) =>
          [
            '--project',
            '--expect',
            '--dry-run',
            '--lang',
            '--json',
            '--help',
            '-h',
            '--version',
            '-v',
            '--input',
            '--text-file',
            '--description-file',
          ].includes(v),
        )
      )
        throw new CliError('USAGE', errorMessage('unsupportedBatchOptionAtIndex', [index]));
      const item = parseArguments(args, original.root);
      if (
        !['add', 'edit', 'delete', 'comment-add', 'comment-edit', 'comment-delete'].includes(
          item.command,
        )
      )
        throw new CliError('USAGE', errorMessage('unsupportedBatchCommandAtIndex', [index]));
      if (options.dryRun) item.dryRun = true;
      if (options.yes) item.yes = true;
      item.language = options.language;
      prepareBody(item);
      const plan = planWrite(item, project);
      const source = readSource(plan.text);
      if (
        Object.keys(source.files).length > MAX_PROJECT_FILES ||
        Object.values(source.files).reduce((n, s) => n + Buffer.byteLength(s), 0) >
          MAX_PROJECT_BYTES
      )
        throw new CliError('LIMIT', errorMessage('projectFileCountOrContentSizeLimitExceeded'));
      results.push({ index, operation: item.command, id: plan.id, deletion: plan.deletion });
      project = {
        ...original,
        source,
        snapshot: plan.text,
        model: parseProject(plan.text),
        revision: createHash('sha256').update(plan.text).digest('hex'),
      };
    } catch (error) {
      throw new BatchError(index, error);
    }
  }
  if (!options.dryRun)
    saveProject(original.root, original.snapshot, project.snapshot, options.language);
  return {
    operation: 'batch',
    id: 'batch',
    deletion: undefined,
    dryRun: options.dryRun,
    results,
    changedFiles: [
      ...new Set([...Object.keys(original.source.files), ...Object.keys(project.source.files)]),
    ]
      .filter((f) => original.source.files[f] !== project.source.files[f])
      .sort(),
    previousRevision: original.revision,
    revision: options.dryRun ? original.revision : project.revision,
  };
}
