import { errorMessage } from './i18n/error-messages';
import { jsonInput } from './input';
import {
  projectTaskDraft,
  updateProjectTask,
  type ProjectTaskDraft,
} from '@worktree/core/task-editing';
import { deleteProjectTask, projectDeletionImpact } from '@worktree/core/task-deletion';
import type { Options } from './arguments';
import type { readProject } from './project-reader';
import { CliError } from './errors';
export interface DeletionPreview {
  removedIds: string[];
  retainedChildIds: string[];
  detachedFrom: string[];
  commentCount: number;
}
export function planTask(options: Options, project: ReturnType<typeof readProject>) {
  const { model, snapshot } = project;
  const values = options.values;
  let id = options.id ?? '',
    text = snapshot;
  const target = model.rows.find((row) => row.id === id);
  let deletion: DeletionPreview | undefined;
  if (
    options.command !== 'add' &&
    (!target || !!target.milestone !== (options.kind === 'milestone'))
  )
    throw new CliError('TASK_NOT_FOUND', errorMessage('itemNotFound', [id]));
  if (options.command === 'delete') {
    if (!options.yes && !options.dryRun)
      throw new CliError('CONFIRMATION_REQUIRED', errorMessage('passYesToDelete'));
    const impact = projectDeletionImpact(
      snapshot,
      id,
      (values.children ?? 'keep') as 'keep' | 'delete',
    );
    if (target?.milestone && impact.childRows.length && !values.children && !options.dryRun)
      throw new CliError('CHILD_POLICY_REQUIRED', errorMessage('specifyChildrenKeepDelete'));
    if (impact.dependents.length && !options.detach && !options.dryRun)
      throw new CliError(
        'REFERENCES_EXIST',
        errorMessage('reviewDryRunAndPassDetachToDetachDependentTasks'),
      );
    deletion = {
      removedIds: [...impact.removed],
      retainedChildIds: values.children === 'delete' ? [] : impact.childRows.map((row) => row.id),
      detachedFrom: impact.dependents.map((row) => row.id),
      commentCount: impact.commentCount,
    };
    text = deleteProjectTask(snapshot, id, {
      children: (values.children ?? 'keep') as 'keep' | 'delete',
      detachPredecessors: options.detach || options.dryRun,
    });
  } else {
    const draft = projectTaskDraft(snapshot, options.command === 'edit' ? id : undefined);
    draft.type = options.kind as 'task' | 'milestone';
    const aliases: Record<string, keyof ProjectTaskDraft> = {
      title: 'name',
      description: 'description',
      owner: 'owner',
      status: 'status',
      milestone: 'parent',
      start: 'start',
      end: 'end',
      effort: 'effort',
      priority: 'priority',
      type: 'taskType',
      labels: 'labels',
      deps: 'deps',
      'blocked-reason': 'blockedReason',
      references: 'references',
    };
    const input: Record<string, unknown> = values.input
      ? (jsonInput(values.input, options.session) as Record<string, unknown>)
      : {};
    if (!input || Array.isArray(input) || typeof input !== 'object')
      throw new CliError('USAGE', errorMessage('inputMustBeAJsonObject'));
    for (const [key, value] of Object.entries(values))
      if (Object.hasOwn(aliases, key))
        input[key] = key === 'references' ? JSON.parse(value) : value;
    for (const [key, value] of Object.entries(input)) {
      if (!Object.hasOwn(aliases, key))
        throw new CliError('USAGE', errorMessage('unknownInputField', [key]));
      const field = aliases[key];
      if (options.kind === 'milestone' && !['title', 'start', 'end'].includes(key))
        throw new CliError('USAGE', errorMessage('fieldNotAvailableForMilestones', [key]));
      if ((field === 'labels' || field === 'deps') && Array.isArray(value)) {
        if (!value.every((item) => typeof item === 'string' && !item.includes(',')))
          throw new CliError('USAGE', errorMessage('expectedAStringArray', [key]));
        draft[field] = value.join(',');
      } else if (field === 'references') {
        if (!Array.isArray(value))
          throw new CliError('USAGE', errorMessage('referencesMustBeAnArray'));
        draft.references = value;
      } else {
        if (typeof value !== 'string')
          throw new CliError('USAGE', errorMessage('expectedString', [key]));
        (draft as unknown as Record<string, unknown>)[field] = value;
      }
    }
    if (options.command === 'edit' && !Object.keys(input).length)
      throw new CliError('USAGE', errorMessage('specifyAtLeastOneFieldToEdit'));
    const result = updateProjectTask(snapshot, draft, options.command === 'edit' ? id : undefined);
    text = result.text;
    id = result.id;
  }
  return { id, text, deletion };
}
