import { validPriorities, type ProjectPriority } from './project-priorities';
import { defaultTaskTypeColors } from './default-task-types';
import type { TaskTypeColors } from './task-type-colors';
import { projectRuleValues } from './project-initialization';
import type { DateFormat, TimeFormat } from './project-display';
import { messages } from './i18n/messages';
import { parseProject } from './project-document';
import { projectConfig, readSource, serializeSource } from './project-source';

export interface ProjectSettingsDraft {
  name: string;
  useEffort: boolean;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  idSeparator: 'none' | 'hyphen';
  taskTypes: string;
  taskTypeColors: TaskTypeColors;
  labels: string;
  priorities: ProjectPriority[];
  assignees: string;
}
export function projectSettingsDraft(text: string): ProjectSettingsDraft {
  const config = projectConfig(readSource(text));
  return {
    name: config.name,
    useEffort: config.useEffort,
    dateFormat: config.dateFormat ?? 'yyyy-MM-dd',
    timeFormat: config.timeFormat ?? '24h',
    idSeparator: config.idSeparator ?? 'none',
    taskTypes: config.taskTypes.join(', '),
    taskTypeColors: config.taskTypeColors ?? defaultTaskTypeColors(config.taskTypes),
    labels: config.labels.join(', '),
    priorities: parseProject(text).priorities!.map((p) => ({ ...p })),
    assignees: (config.assignees ?? []).join(', '),
  };
}
export function updateProjectSettings(text: string, draft: ProjectSettingsDraft) {
  const model = parseProject(text),
    source = readSource(text),
    config = projectConfig(source);
  const taskTypes = projectRuleValues(draft.taskTypes),
    labels = projectRuleValues(draft.labels);
  if (!draft.name.trim() || draft.name.length > 200 || /[\r\n\0]/.test(draft.name))
    throw Error(messages.projectNameRequired);
  if (!taskTypes.length) throw Error(messages.projectTypesRequired);
  if (new Set(taskTypes).size !== taskTypes.length || new Set(labels).size !== labels.length)
    throw Error(messages.projectDuplicateValues);
  const inUse = model.rows.find((row) => !row.milestone && !taskTypes.includes(row.taskType!));
  if (inUse) throw Error(messages.projectTypeInUse(inUse.taskType!));
  if (!validPriorities(draft.priorities)) throw Error(messages.invalidPriorities);
  const usedPriority = model.rows.find(
    (row) =>
      !row.milestone &&
      row.priority &&
      row.priority !== '-' &&
      !draft.priorities.some((p) => p.id === row.priority),
  );
  if (usedPriority) throw Error(messages.priorityInUse);
  if (!['none', 'hyphen'].includes(draft.idSeparator)) throw Error(messages.invalidIdSeparator);
  // Only these fields are editable: preserve the prefix, ID sequences, schema and extension keys.
  Object.assign(config, {
    name: draft.name.trim(),
    useEffort: draft.useEffort,
    dateFormat: draft.dateFormat,
    timeFormat: draft.timeFormat,
    idSeparator: draft.idSeparator,
    taskTypes,
    taskTypeColors: Object.fromEntries(
      Object.entries(draft.taskTypeColors ?? {}).filter(([type]) => taskTypes.includes(type)),
    ),
    labels,
    priorities: draft.priorities,
    assignees: projectRuleValues(draft.assignees),
  });
  source.files['project.json'] = JSON.stringify(config, null, 2) + '\n';
  const updated = serializeSource(source);
  parseProject(updated);
  return updated;
}
