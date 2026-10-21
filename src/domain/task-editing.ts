import { messages } from '../i18n/messages';
import { parseProject } from './project-document';
import { projectConfig, readSource, serializeSource, type TaskReference } from './project-source';
import { readTaskFile, writeTaskFile } from './task-file';
export interface ProjectTaskDraft {
  type: 'task' | 'milestone';
  name: string;
  description: string;
  owner: string;
  status: string;
  parent: string;
  start: string;
  end: string;
  effort: string;
  deps: string;
  priority: string;
  taskType: string;
  labels: string;
  blockedReason: string;
  references: TaskReference[];
}
export function projectTaskDraft(text: string, id?: string): ProjectTaskDraft {
  const model = parseProject(text),
    row = id ? model.rows.find((row) => row.id === id) : undefined;
  if (id && !row) throw Error(messages.editTaskMissing);
  return {
    type: row?.milestone ? 'milestone' : 'task',
    name: row?.name ?? '',
    description: row?.description ?? '',
    owner: row?.owner ?? '',
    status: row?.milestone ? 'auto' : (row?.status ?? 'todo'),
    parent: row?.parent ?? '-',
    start: row?.start ?? '-',
    end: row?.end ?? '-',
    effort: row?.effort ?? '-',
    deps: row?.deps.join(', ') || '-',
    priority: row?.priority ?? 'normal',
    taskType: row?.taskType ?? model.taskTypes![0],
    labels: row?.labels?.join(', ') ?? '',
    blockedReason: row?.blockedReason ?? '',
    references: row?.references?.map((value) => ({ ...value })) ?? [],
  };
}
export function nextProjectId(text: string, milestone = false) {
  const source = readSource(text),
    config = projectConfig(source),
    model = parseProject(text);
  let number = milestone ? config.nextMilestoneNumber : config.nextTaskNumber;
  for (const row of model.rows.filter((row) => !!row.milestone === milestone))
    number = Math.max(number, Number(row.id.match(/\d+$/)![0]) + 1);
  if (!Number.isSafeInteger(number) || number >= Number.MAX_SAFE_INTEGER)
    throw Error(messages.idSequenceExhausted);
  return (milestone ? 'MS' : config.taskPrefix) + String(number).padStart(3, '0');
}
export function updateProjectTask(
  text: string,
  draft: ProjectTaskDraft,
  id?: string,
  now = new Date().toISOString(),
) {
  const source = readSource(text),
    config = projectConfig(source),
    model = parseProject(text);
  const existing = id ? model.rows.find((row) => row.id === id) : undefined;
  if (id && !existing) throw Error(messages.editTaskMissing);
  if (
    !['task', 'milestone'].includes(draft.type) ||
    (existing && !!existing.milestone !== (draft.type === 'milestone'))
  )
    throw Error(messages.taskTypeLocked);
  if (!draft.name.trim() || /[\r\n\0]/.test(draft.name)) throw Error(messages.taskRequiredFields);
  const milestone = draft.type === 'milestone',
    key = id ?? nextProjectId(text, milestone);
  const file = (milestone ? 'milestones/' : 'tasks/') + key + '.md';
  const metadata = existing ? readTaskFile(file, source.files[file]).metadata : {};
  const updatedAt = existing?.updatedAt && existing.updatedAt > now ? existing.updatedAt : now;
  Object.assign(metadata, {
    schemaVersion: 1,
    id: key,
    title: draft.name.trim(),
    start: draft.start || '-',
    end: draft.end || '-',
    createdAt: existing?.createdAt ?? now,
    updatedAt,
  });
  if (!milestone)
    Object.assign(metadata, {
      status: draft.status,
      owner: draft.owner.trim() || '-',
      milestone: draft.parent || '-',
      effort: draft.effort || '-',
      dependencies:
        draft.deps === '-'
          ? []
          : [
              ...new Set(
                draft.deps
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              ),
            ],
      priority: draft.priority,
      type: draft.taskType,
      labels: [
        ...new Set(
          draft.labels
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ],
      blockedReason: draft.blockedReason,
      references: draft.references,
    });
  source.files[file] = writeTaskFile(metadata, milestone ? '' : draft.description);
  if (!existing) {
    config[milestone ? 'nextMilestoneNumber' : 'nextTaskNumber'] =
      Number(key.match(/\d+$/)![0]) + 1;
    source.files['project.json'] = JSON.stringify(config, null, 2) + '\n';
  }
  const result = serializeSource(source);
  parseProject(result);
  return { text: result, id: key };
}
