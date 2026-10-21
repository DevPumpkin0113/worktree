import type { WorkModel, WorkRow, Status } from './types';
import {
  readSource,
  projectConfig,
  ProjectValidationError,
  PRIORITIES,
  isRelativePath,
  type TaskReference,
} from './project-source';
import { readTaskFile } from './task-file';
export function parseProject(text: string): WorkModel {
  const source = readSource(text),
    config = projectConfig(source);
  const rows: WorkRow[] = [];
  const locations = new Map<string, { file: string; lines: Map<string, number> }>();
  for (const [file, content] of Object.entries(source.files).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (file === 'project.json') continue;
    if (!/^(tasks|milestones)\/[A-Z]+\d{3,}\.md$/.test(file) || typeof content !== 'string')
      throw new ProjectValidationError(file, 'filename', file);
    const { metadata: m, lines, description } = readTaskFile(file, content);
    const milestone = file.startsWith('milestones/');
    const fail = (field: string): never => {
      throw new ProjectValidationError(
        file,
        field,
        JSON.stringify(m[field]) ?? '',
        lines.get(field) ?? 0,
      );
    };
    const string = (key: string, fallback = ''): string =>
      m[key] === undefined
        ? fallback
        : typeof m[key] === 'string' && !String(m[key]).includes('\0')
          ? (m[key] as string)
          : fail(key);
    const list = (key: string): string[] =>
      m[key] === undefined
        ? []
        : Array.isArray(m[key]) && (m[key] as unknown[]).every((v) => typeof v === 'string')
          ? (m[key] as string[])
          : fail(key);
    const id = string('id');
    const prefix = milestone ? 'MS' : config.taskPrefix;
    if (
      !new RegExp('^' + prefix + '\\d{3,}$').test(id) ||
      file !== (milestone ? 'milestones/' : 'tasks/') + id + '.md'
    )
      fail('id');
    const number = Number(id.match(/\d+$/)?.[0]);
    if (!Number.isSafeInteger(number) || number < 1) fail('id');
    if (m.schemaVersion !== 1) fail('schemaVersion');
    const name = string('title');
    if (!name.trim() || /[\r\n]/.test(name)) fail('title');
    const status = milestone ? 'todo' : string('status', 'todo');
    if (!['todo', 'doing', 'blocked', 'done'].includes(status)) fail('status');
    const start = string('start', '-'),
      end = string('end', '-');
    const validDate = (s: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s;
    if (
      (start === '-') !== (end === '-') ||
      (start !== '-' && (!validDate(start) || !validDate(end) || start > end))
    )
      fail('start');
    const effort = string('effort', '-');
    if (effort !== '-' && (!Number.isFinite(Number(effort)) || Number(effort) <= 0)) fail('effort');
    const taskType = string('type', config.taskTypes[0]);
    if (!milestone && !config.taskTypes.includes(taskType)) fail('type');
    const priority = string('priority', 'normal');
    if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) fail('priority');
    const labels = list('labels');
    if (
      new Set(labels).size !== labels.length ||
      labels.some((v) => !v.trim() || /[\r\n\0,]/.test(v))
    )
      fail('labels');
    const references = m.references ?? [];
    if (
      !Array.isArray(references) ||
      !references.every(
        (v) =>
          v &&
          ['text', 'file'].includes(v.type) &&
          typeof v.value === 'string' &&
          v.value.trim() &&
          !v.value.includes('\0') &&
          (v.type !== 'file' || isRelativePath(v.value)),
      )
    )
      fail('references');
    for (const key of ['createdAt', 'updatedAt']) {
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(string(key)) ||
        Number.isNaN(Date.parse(string(key))) ||
        new Date(string(key)).toISOString() !== string(key)
      )
        fail(key);
    }
    if (string('updatedAt') < string('createdAt')) fail('updatedAt');
    const row: WorkRow = {
      id,
      name,
      type: milestone ? 'group' : 'task',
      milestone,
      parent: milestone ? '-' : string('milestone', '-'),
      description: description,
      owner: milestone ? '-' : string('owner', '-'),
      status: status as Status,
      start,
      end,
      effort: milestone ? '-' : effort,
      deps: milestone ? [] : list('dependencies'),
      priority,
      taskType,
      labels,
      blockedReason: string('blockedReason'),
      references: references as TaskReference[],
      createdAt: string('createdAt'),
      updatedAt: string('updatedAt'),
    };
    if (new Set(row.deps).size !== row.deps.length) fail('dependencies');
    rows.push(row);
    locations.set(id, { file, lines });
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const failRow = (
    row: WorkRow,
    field: string,
    value: string,
    reason: ProjectValidationError['reason'] = 'field',
  ): never => {
    const at = locations.get(row.id)!;
    throw new ProjectValidationError(at.file, field, value, at.lines.get(field) ?? 0, reason);
  };
  for (const row of rows) {
    if (row.parent !== '-' && !byId.get(row.parent)?.milestone)
      failRow(row, 'milestone', row.parent, 'milestone');
    for (const dep of row.deps) {
      const previous = byId.get(dep) ?? failRow(row, 'dependencies', dep, 'dependency');
      if (!previous || previous.milestone || dep === row.id)
        failRow(row, 'dependencies', dep, 'dependency');
      if (row.start !== '-' && previous.end !== '-' && row.start <= previous.end)
        failRow(row, 'start', dep, 'dependencyDate');
    }
  }
  // Iterative traversal keeps long task chains within the JavaScript call stack limit.
  const completed = new Set<string>();
  for (const row of rows) {
    const visiting = new Set<string>(),
      stack: [string, boolean][] = [[row.id, false]];
    while (stack.length) {
      const [id, exiting] = stack.pop()!;
      if (exiting) {
        visiting.delete(id);
        completed.add(id);
        continue;
      }
      if (visiting.has(id)) failRow(byId.get(id)!, 'dependencies', id, 'cycle');
      if (completed.has(id)) continue;
      visiting.add(id);
      stack.push([id, true]);
      for (const dep of byId.get(id)!.deps) stack.push([dep, false]);
    }
  }
  for (const row of rows.filter((r) => r.milestone)) {
    const children = rows.filter((child) => child.parent === row.id);
    row.status =
      !children.length || children.every((r) => r.status === 'todo')
        ? 'todo'
        : children.every((r) => r.status === 'done')
          ? 'done'
          : children.some((r) => r.status === 'blocked')
            ? 'blocked'
            : 'doing';
  }
  return {
    title: config.name,
    idPrefix: config.taskPrefix,
    useEffort: config.useEffort,
    nextTaskNumber: String(config.nextTaskNumber),
    nextMilestoneNumber: String(config.nextMilestoneNumber),
    taskTypes: config.taskTypes,
    labels: [...new Set([...config.labels, ...rows.flatMap((row) => row.labels ?? [])])],
    dataDirectory: source.dataDirectory,
    rows,
  };
}
