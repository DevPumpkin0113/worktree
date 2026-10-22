import { errorMessage } from './i18n/error-messages';
import { jsonInput } from './input';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_TASK_TYPES, defaultTaskTypeColors } from '@worktree/core/default-task-types';
import { defaultPriorities } from '@worktree/core/project-priorities';
import {
  validTaskPrefix,
  validInitializationDirectory,
} from '@worktree/core/project-initialization';
import { parseProject } from '@worktree/core/project-document';
import { projectConfig, serializeSource } from '@worktree/core/project-source';
import { MAX_PROJECT_BYTES } from '@worktree/core/project-limits';
import { projectFolder, hasProjectMarker } from './project-location';
import { invokeStorage } from './native-store';
import { readProject } from './project-reader';
import { CliError } from './errors';
import type { Options } from './arguments';
export function initializeProject(options: Options) {
  const root = projectFolder(options.project),
    values = options.values;
  const input: Record<string, unknown> = values.input
    ? (jsonInput(values.input, options.session) as Record<string, unknown>)
    : { ...options.initialization };
  if (!input || Array.isArray(input) || typeof input !== 'object')
    throw new CliError('USAGE', errorMessage('inputMustBeAJsonObject'));
  const allowed = [
    'name',
    'prefix',
    'directory',
    'useEffort',
    'idSeparator',
    'dateFormat',
    'timeFormat',
    'taskTypes',
    'taskTypeColors',
    'labels',
    'priorities',
    'assignees',
  ];
  for (const key of Object.keys(input))
    if (!allowed.includes(key))
      throw new CliError('USAGE', errorMessage('unknownInitializationField', [key]));
  const aliases: Record<string, string> = {
    name: 'name',
    prefix: 'prefix',
    directory: 'directory',
    'id-separator': 'idSeparator',
    'date-format': 'dateFormat',
    'time-format': 'timeFormat',
  };
  for (const [key, value] of Object.entries(values))
    if (Object.hasOwn(aliases, key)) input[aliases[key]] = value;
  if (values['use-effort'] !== undefined) {
    if (!['true', 'false'].includes(values['use-effort']))
      throw new CliError('USAGE', errorMessage('useEffortRequiresTrueFalse'));
    input.useEffort = values['use-effort'] === 'true';
  }
  const rawPrefix = input.prefix ?? 'W';
  if (typeof rawPrefix !== 'string')
    throw new CliError('USAGE', errorMessage('prefixMustBeAString'));
  const prefix = rawPrefix.replace(/[a-z]/g, (c) => c.toUpperCase());
  const name = input.name ?? path.basename(root),
    directory = input.directory ?? 'docs/worktree';
  if (typeof name !== 'string' || !name.trim() || name.length > 200 || /[\r\n\0]/.test(name))
    throw new CliError('USAGE', errorMessage('provideAProjectNameOfToCharacters'));
  if (!validTaskPrefix(prefix))
    throw new CliError('USAGE', errorMessage('prefixMustBeToAsciiLettersExcludingMs'));
  if (typeof directory !== 'string' || !validInitializationDirectory(directory))
    throw new CliError('UNSAFE_PATH', errorMessage('invalidRelativeDataDirectory'));
  if (hasProjectMarker(root))
    throw new CliError(
      'ALREADY_INITIALIZED',
      errorMessage('aProjectMarkerAlreadyExistsInitializationNeverOverwritesIt'),
    );
  const reset = path.join(root, '.worktree-reset.json');
  if (fs.lstatSync(reset, { throwIfNoEntry: false }))
    throw new CliError('RECOVERY_REQUIRED', errorMessage('pendingReset', [reset]));
  let data = root;
  for (const part of directory.split('/')) {
    data = path.join(data, part);
    const meta = fs.lstatSync(data, { throwIfNoEntry: false });
    if (meta?.isSymbolicLink())
      throw new CliError('UNSAFE_PATH', errorMessage('linkedDataPath', [data]));
  }
  if (fs.existsSync(data))
    throw new CliError('TARGET_EXISTS', errorMessage('dataDirectoryAlreadyExists', [data]));
  const taskTypes = input.taskTypes ?? [...DEFAULT_TASK_TYPES];
  if (!Array.isArray(taskTypes) || !taskTypes.every((value) => typeof value === 'string'))
    throw new CliError('USAGE', errorMessage('tasktypesMustBeAStringArray'));
  const config = {
    schemaVersion: 1,
    name: name.trim(),
    taskPrefix: prefix,
    useEffort: input.useEffort ?? false,
    idSeparator: input.idSeparator ?? 'none',
    dateFormat: input.dateFormat ?? 'yyyy-MM-dd',
    timeFormat: input.timeFormat ?? '24h',
    taskTypes,
    taskTypeColors: input.taskTypeColors ?? defaultTaskTypeColors(taskTypes),
    labels: input.labels ?? [],
    priorities: input.priorities ?? defaultPriorities(),
    assignees: input.assignees ?? [],
    nextTaskNumber: 1,
    nextMilestoneNumber: 1,
  };
  const content = JSON.stringify(config, null, 2) + '\n';
  if (Buffer.byteLength(content) > MAX_PROJECT_BYTES)
    throw new CliError('LIMIT', errorMessage('projectConfigurationIsTooLarge'));
  parseProject(serializeSource({ dataDirectory: directory, files: { 'project.json': content } }));
  if (!options.dryRun)
    invokeStorage({
      operation: 'init',
      root,
      name: config.name,
      directory,
      prefix,
      useEffort: config.useEffort,
      idSeparator: config.idSeparator,
      rules: {
        dateFormat: config.dateFormat,
        timeFormat: config.timeFormat,
        taskTypes: config.taskTypes,
        taskTypeColors: config.taskTypeColors,
        labels: config.labels,
        priorities: config.priorities,
        assignees: config.assignees,
      },
      language: options.language,
    });
  return {
    initialized: !options.dryRun,
    dryRun: options.dryRun,
    project: config.name,
    root,
    dataDirectory: directory,
    prefix,
    settings: projectConfig({ dataDirectory: directory, files: { 'project.json': content } }),
    changedFiles: ['worktree.json', directory + '/project.json'],
    revision: options.dryRun ? undefined : readProject(root).revision,
  };
}
