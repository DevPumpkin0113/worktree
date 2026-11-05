import { DEFAULT_EPIC_ICON, isEpicIcon, isEpicIconColor, type EpicIcon } from './epic-icons';
import { messages } from './i18n/messages';
import { parseProject } from './project-document';
import {
  projectConfig,
  readSource,
  serializeSource,
  ProjectValidationError,
  type TaskReference,
} from './project-source';
import { readTaskFile, writeTaskFile } from './task-file';
export interface ProjectTaskDraft {
  completedAt?: string;
  type: 'task' | 'milestone' | 'epic';
  icon?: EpicIcon;
  iconColor?: string;
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
    type: row?.epic ? 'epic' : row?.milestone ? 'milestone' : 'task',
    ...(row?.epic ? { icon: row.icon ?? DEFAULT_EPIC_ICON, iconColor: row.iconColor ?? '-' } : {}),
    name: row?.name ?? '',
    description: row?.description ?? '',
    owner: row?.owner ?? '',
    status: row?.type === 'group' ? 'auto' : (row?.status ?? 'todo'),
    parent: row?.parent ?? '-',
    start: row?.start ?? '-',
    end: row?.end ?? '-',
    effort: row?.effort ?? '-',
    deps: row?.deps.join(', ') || '-',
    priority: row?.priority ?? '-',
    taskType: row?.taskType ?? model.taskTypes![0],
    labels: row?.labels?.join(', ') ?? '',
    blockedReason: row?.blockedReason ?? '',
    references: row?.references?.map((value) => ({ ...value })) ?? [],
  };
}
export function nextProjectId(text: string, kind: boolean | 'epic' = false) {
  const config = projectConfig(readSource(text)),
    model = parseProject(text);
  const prefix = kind === 'epic' ? 'EP' : kind ? 'MS' : config.taskPrefix;
  let number =
    kind === 'epic'
      ? (config.nextEpicNumber ?? 1)
      : kind
        ? config.nextMilestoneNumber
        : config.nextTaskNumber;
  if (config.taskPrefix === 'EP' && prefix === 'EP')
    number = Math.max(number, config.nextTaskNumber, config.nextEpicNumber ?? 1);
  // IDs remain globally unique, including legacy projects whose task prefix is EP.
  for (const row of model.rows.filter(
    (row) => row.id.startsWith(prefix) && /^\d+$/.test(row.id.slice(prefix.length)),
  ))
    number = Math.max(number, Number(row.id.slice(prefix.length)) + 1);
  if (!Number.isSafeInteger(number) || number >= Number.MAX_SAFE_INTEGER)
    throw Error(messages.idSequenceExhausted);
  return prefix + String(number).padStart(3, '0');
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
    !['task', 'milestone', 'epic'].includes(draft.type) ||
    (existing &&
      (existing.epic ? 'epic' : existing.milestone ? 'milestone' : 'task') !== draft.type)
  )
    throw Error(messages.taskTypeLocked);
  if (!draft.name.trim() || /[\r\n\0]/.test(draft.name)) throw Error(messages.taskRequiredFields);
  const milestone = draft.type === 'milestone',
    epic = draft.type === 'epic',
    container = milestone || epic,
    key = id ?? nextProjectId(text, epic ? 'epic' : milestone);
  const file = (epic ? 'epics/' : milestone ? 'milestones/' : 'tasks/') + key + '.md';
  const metadata = existing ? readTaskFile(file, source.files[file]).metadata : {};
  if (draft.icon !== undefined && (!epic || !isEpicIcon(draft.icon)))
    throw new ProjectValidationError(file, 'icon', String(draft.icon));
  if (epic && draft.icon !== undefined) {
    if (draft.icon === DEFAULT_EPIC_ICON) delete metadata.icon;
    else metadata.icon = draft.icon;
  }
  if (draft.iconColor !== undefined) {
    if (!epic || (draft.iconColor !== '-' && !isEpicIconColor(draft.iconColor)))
      throw new ProjectValidationError(file, 'iconColor', String(draft.iconColor));
    if (draft.iconColor === '-') delete metadata.iconColor;
    else metadata.iconColor = draft.iconColor.toLowerCase();
  }
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
  if (milestone) metadata.epic = draft.parent || '-';
  if (!container) {
    if (draft.status === 'done' && existing?.status !== 'done') metadata.completedAt = updatedAt;
    else if (draft.status !== 'done') delete metadata.completedAt;
    if (draft.completedAt !== undefined) metadata.completedAt = draft.completedAt;
    const parentEpic = model.rows.find((row) => row.id === draft.parent)?.epic;
    if (parentEpic || metadata.epic !== undefined) metadata.epic = parentEpic ? draft.parent : '-';
    Object.assign(metadata, {
      status: draft.status,
      owner: draft.owner.trim() || '-',
      milestone: parentEpic ? '-' : draft.parent || '-',
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
  }
  source.files[file] = writeTaskFile(metadata, !container || epic ? draft.description : '');
  if (!existing) {
    config[epic ? 'nextEpicNumber' : milestone ? 'nextMilestoneNumber' : 'nextTaskNumber'] =
      Number(key.match(/\d+$/)![0]) + 1;
    source.files['project.json'] = JSON.stringify(config, null, 2) + '\n';
  }
  const result = serializeSource(source);
  parseProject(result);
  return { text: result, id: key };
}
