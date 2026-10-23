import { resetProject } from './project-reset';
import { errorMessage } from './i18n/error-messages';
import { prepareBody } from './input';
import { executeBatch } from './batch';
import { recoverProject } from './recovery';
import { projectInformation, schemaInformation } from './project-information';
import { initializeProject } from './init-command';
import { executeWrite } from './write-commands';
import { summarizeWork } from '@worktree/core/work-summary';
import type { Options } from './arguments';
import { CliError } from './errors';
import { readProject } from './project-reader';
export function execute(options: Options) {
  if (options.command === 'recover') return recoverProject(options);
  prepareBody(options);
  if (options.command === 'init') return initializeProject(options);
  if (options.command === 'project-reset') return resetProject(options);
  const project = readProject(options.project);
  const { root, source, model, revision } = project;
  if (options.command === 'batch') return executeBatch(options, project);
  if (
    [
      'add',
      'edit',
      'delete',
      'comment-add',
      'comment-edit',
      'comment-delete',
      'project-edit',
    ].includes(options.command)
  )
    return executeWrite(options, project);
  if (options.command === 'project-show') return projectInformation(project);
  if (options.command === 'schema') return schemaInformation(project);
  if (options.command === 'comment-list') {
    if (!model.rows.some((row) => row.id === options.id && !row.milestone))
      throw new CliError('TASK_NOT_FOUND', errorMessage('taskNotFound', [options.id]));
    return {
      project: model.title,
      revision,
      comments: model.comments?.filter((c) => c.taskId === options.id) ?? [],
    };
  }
  const tasks = model.rows.filter((row) => !!row.milestone === (options.kind === 'milestone'));
  if (options.command === 'validate')
    return {
      valid: true,
      project: model.title,
      revision,
      root,
      files: Object.keys(source.files).length,
    };
  if (options.command === 'status')
    return {
      project: model.title,
      revision,
      root,
      dataDirectory: source.dataDirectory,
      ...summarizeWork(model.rows),
      comments: model.comments?.filter((comment) => !comment.deleted).length ?? 0,
      statuses: Object.fromEntries(
        ['todo', 'doing', 'blocked', 'done'].map((status) => [
          status,
          model.rows.filter((row) => !row.milestone && row.status === status).length,
        ]),
      ),
    };
  if (options.command === 'list')
    return {
      project: model.title,
      revision,
      tasks: tasks
        .filter(
          (row) =>
            (!options.values.search ||
              `${row.id} ${row.name}`
                .toLocaleLowerCase()
                .includes(options.values.search.toLocaleLowerCase())) &&
            (!options.values.milestone || row.parent === options.values.milestone) &&
            (!options.values.type || row.taskType === options.values.type) &&
            (!options.values.priority || row.priority === options.values.priority) &&
            (!options.values.label || row.labels?.includes(options.values.label)) &&
            (!options.status || row.status === options.status) &&
            (options.owner === undefined || row.owner === options.owner),
        )
        .map((row) => ({
          id: row.id,
          title: row.name,
          status: row.status,
          owner: row.owner,
          milestone: row.parent,
          priority: row.priority,
          type: row.taskType,
          start: row.start,
          end: row.end,
        })),
    };
  const task = tasks.find((row) => row.id === options.id);
  if (!task) throw new CliError('TASK_NOT_FOUND', errorMessage('taskNotFound', [options.id]));
  return {
    project: model.title,
    revision,
    task,
    successors: tasks.filter((row) => row.deps.includes(task.id)).map((row) => row.id),
    comments: model.comments?.filter((comment) => comment.taskId === task.id) ?? [],
  };
}
