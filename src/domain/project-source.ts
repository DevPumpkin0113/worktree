import { messages } from '../i18n/messages';

export interface ProjectConfig {
  schemaVersion: 1;
  name: string;
  taskPrefix: string;
  useEffort: boolean;
  taskTypes: string[];
  labels: string[];
  nextTaskNumber: number;
  nextMilestoneNumber: number;
}
export interface ProjectSource {
  dataDirectory: string;
  files: Record<string, string>;
}
export interface TaskReference {
  type: 'text' | 'file';
  value: string;
}
export class ProjectValidationError extends Error {
  constructor(
    readonly file: string,
    readonly field: string,
    readonly value: string,
    readonly line = 0,
    readonly reason: 'field' | 'dependency' | 'cycle' | 'dependencyDate' | 'milestone' = 'field',
  ) {
    super(messages.invalidProjectField(file, field));
  }
}
export const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export function serializeSource(source: ProjectSource) {
  return JSON.stringify({
    dataDirectory: source.dataDirectory,
    files: Object.fromEntries(Object.entries(source.files).sort(([a], [b]) => a.localeCompare(b))),
  });
}
export function readSource(text: string): ProjectSource {
  let value: ProjectSource;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ProjectValidationError('worktree.json', 'JSON', text);
  }
  if (
    !value ||
    typeof value.dataDirectory !== 'string' ||
    !value.files ||
    typeof value.files !== 'object' ||
    Array.isArray(value.files)
  )
    throw new ProjectValidationError('worktree.json', 'files', '');
  if (!isRelativePath(value.dataDirectory) || value.dataDirectory.includes('\\'))
    throw new ProjectValidationError('worktree.json', 'dataDirectory', value.dataDirectory);
  return value;
}
export function projectConfig(source: ProjectSource): ProjectConfig {
  const file = 'project.json';
  let config: ProjectConfig;
  try {
    config = JSON.parse(source.files[file]);
  } catch {
    throw new ProjectValidationError(file, 'JSON', source.files[file] ?? '');
  }
  const fail = (field: string) => {
    throw new ProjectValidationError(
      file,
      field,
      String(config?.[field as keyof ProjectConfig] ?? ''),
    );
  };
  if (config?.schemaVersion !== 1) fail('schemaVersion');
  if (typeof config.name !== 'string' || !config.name.trim() || /[\r\n\0]/.test(config.name))
    fail('name');
  if (
    typeof config.taskPrefix !== 'string' ||
    !/^[A-Z]{1,20}$/.test(config.taskPrefix) ||
    config.taskPrefix === 'MS'
  )
    fail('taskPrefix');
  if (typeof config.useEffort !== 'boolean') fail('useEffort');
  for (const key of ['taskTypes', 'labels'] as const) {
    if (
      !Array.isArray(config[key]) ||
      !config[key].every((v) => typeof v === 'string' && v.trim() && !/[\r\n\0,]/.test(v)) ||
      new Set(config[key]).size !== config[key].length
    )
      fail(key);
  }
  if (!config.taskTypes.length) fail('taskTypes');
  for (const key of ['nextTaskNumber', 'nextMilestoneNumber'] as const)
    if (!Number.isSafeInteger(config[key]) || config[key] < 1) fail(key);
  return config;
}
export function isRelativePath(value: string) {
  return (
    !!value &&
    !/^[\\/]|[:\0]/.test(value) &&
    value.split(/[\\/]/).every((p) => p && p !== '.' && p !== '..')
  );
}
