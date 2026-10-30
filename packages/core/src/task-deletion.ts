import { messages } from './i18n/messages';
import { parseProject } from './project-document';
import { readSource, projectConfig, serializeSource } from './project-source';
import { readTaskFile, writeTaskFile } from './task-file';
import { nextProjectId } from './task-editing';
export interface DeleteOptions {
  children: 'keep' | 'delete';
  detachPredecessors: boolean;
}
export function projectDeletionImpact(
  text: string,
  id: string,
  children: DeleteOptions['children'],
) {
  const model = parseProject(text),
    target = model.rows.find((row) => row.id === id);
  if (!target) throw Error(messages.editTaskMissing);
  const childRows = model.rows.filter((row) => row.parent === id);
  const removed = new Set([id]);
  if (children === 'delete') {
    const pending = [...childRows];
    while (pending.length) {
      const child = pending.pop()!;
      removed.add(child.id);
      pending.push(...model.rows.filter((row) => row.parent === child.id));
    }
  }
  return {
    target,
    commentCount:
      model.comments?.filter((comment) => removed.has(comment.taskId) && !comment.deleted).length ??
      0,
    childRows,
    removed,
    dependents: model.rows.filter(
      (row) => !removed.has(row.id) && row.deps.some((id) => removed.has(id)),
    ),
  };
}
export function deleteProjectTask(
  text: string,
  id: string,
  options: DeleteOptions,
  now = new Date().toISOString(),
) {
  if (!['keep', 'delete'].includes(options.children)) throw Error(messages.invalidDeleteOption);
  const impact = projectDeletionImpact(text, id, options.children),
    source = readSource(text),
    model = parseProject(text);
  if (impact.dependents.length && !options.detachPredecessors)
    throw Error(messages.deleteReferencesRequired);
  const config = projectConfig(source);
  // Preserve high water marks even when externally authored files outgrow the saved sequences.
  config.nextTaskNumber = Number(nextProjectId(text).match(/\d+$/)![0]);
  config.nextMilestoneNumber = Number(nextProjectId(text, true).match(/\d+$/)![0]);
  if (config.nextEpicNumber !== undefined || impact.target.epic)
    config.nextEpicNumber = Number(nextProjectId(text, 'epic').match(/\d+$/)![0]);
  source.files['project.json'] = JSON.stringify(config, null, 2) + '\n';
  for (const row of model.rows) {
    const file = (row.epic ? 'epics/' : row.milestone ? 'milestones/' : 'tasks/') + row.id + '.md';
    if (impact.removed.has(row.id)) {
      delete source.files[file];
      continue;
    }
    if (impact.removed.has(row.parent) || row.deps.some((dep) => impact.removed.has(dep))) {
      const { metadata, description } = readTaskFile(file, source.files[file]);
      if (impact.removed.has(row.parent)) {
        if (row.milestone) metadata.epic = '-';
        else {
          const parent = model.rows.find((candidate) => candidate.id === row.parent);
          metadata.milestone = '-';
          const retainedEpic =
            parent?.milestone && !impact.removed.has(parent.parent) ? parent.parent : '-';
          if (retainedEpic !== '-' || metadata.epic !== undefined) metadata.epic = retainedEpic;
        }
      }
      if (row.type === 'task')
        metadata.dependencies = row.deps.filter((dep) => !impact.removed.has(dep));
      metadata.updatedAt = row.updatedAt! > now ? row.updatedAt : now;
      source.files[file] = writeTaskFile(metadata, description);
    }
  }
  for (const comment of model.comments ?? []) {
    if (impact.removed.has(comment.taskId))
      delete source.files[`comments/${comment.taskId}/${comment.id}.md`];
  }
  const result = serializeSource(source);
  parseProject(result);
  return result;
}
