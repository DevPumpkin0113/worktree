import { messages } from '../i18n/messages';
import { parseProject } from './project-document';
import { projectConfig, readSource, serializeSource } from './project-source';

export interface ProjectSettingsDraft {
  name: string;
  useEffort: boolean;
  taskTypes: string;
  labels: string;
}
export function projectSettingsDraft(text: string): ProjectSettingsDraft {
  const config = projectConfig(readSource(text));
  return {
    name: config.name,
    useEffort: config.useEffort,
    taskTypes: config.taskTypes.join(', '),
    labels: config.labels.join(', '),
  };
}
export function updateProjectSettings(text: string, draft: ProjectSettingsDraft) {
  const model = parseProject(text),
    source = readSource(text),
    config = projectConfig(source);
  const list = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  const taskTypes = list(draft.taskTypes),
    labels = list(draft.labels);
  if (!draft.name.trim() || draft.name.length > 200 || /[\r\n\0]/.test(draft.name))
    throw Error(messages.projectNameRequired);
  if (!taskTypes.length) throw Error(messages.projectTypesRequired);
  if (new Set(taskTypes).size !== taskTypes.length || new Set(labels).size !== labels.length)
    throw Error(messages.projectDuplicateValues);
  const inUse = model.rows.find((row) => !row.milestone && !taskTypes.includes(row.taskType!));
  if (inUse) throw Error(messages.projectTypeInUse(inUse.taskType!));
  // Only these fields are editable: preserve the prefix, ID sequences, schema and extension keys.
  Object.assign(config, { name: draft.name.trim(), useEffort: draft.useEffort, taskTypes, labels });
  source.files['project.json'] = JSON.stringify(config, null, 2) + '\n';
  const updated = serializeSource(source);
  parseProject(updated);
  return updated;
}
