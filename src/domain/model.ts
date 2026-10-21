import { DocumentValidationError, type DocumentDiagnostic } from './document-diagnostics';
import { WBS_COLUMNS } from './wbs-schema';
import type { WorkModel, WorkRow } from './types';
type ParsedRow = Omit<WorkRow, 'type' | 'status'> & { type: string; status: string };
import { findWorkTable, isTableSeparator } from './work-table';

export function parseWbs(markdown: string): WorkModel {
  const frontmatter =
    markdown.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
  const meta = (key: string) => {
    const value = frontmatter.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'))?.[1]?.trim();
    if (!value) return undefined;
    return value.replace(/^(["'])(.*)\1$/, '$2');
  };
  const effortSetting = frontmatter.match(/^use_effort:[ \t]*(.*)$/m);
  if (effortSetting && !/^(true|false)$/.test(effortSetting[1].trim()))
    throw new DocumentValidationError([{ code: 'INVALID_USE_EFFORT' }]);
  const useEffort = effortSetting ? effortSetting[1].trim() === 'true' : true;
  const idPrefix = meta('id_prefix') ?? 'W';
  if (!/^[A-Z]+$/.test(idPrefix))
    throw new DocumentValidationError([{ code: 'INVALID_ID_PREFIX' }]);

  const { sectionFound, table } = findWorkTable(markdown);
  if (!sectionFound) throw new DocumentValidationError([{ code: 'MISSING_WORK_SECTION' }]);
  const expected = WBS_COLUMNS;
  if (JSON.stringify(table[0]?.cells) !== JSON.stringify(expected))
    throw new DocumentValidationError([{ code: 'INVALID_COLUMN_ORDER' }]);
  if (!isTableSeparator(table[1]?.cells, expected.length))
    throw new DocumentValidationError([{ code: 'INVALID_SEPARATOR' }]);
  const keys = [
    'id',
    'parent',
    'type',
    'name',
    'criteria',
    'owner',
    'status',
    'start',
    'end',
    'effort',
    'deps',
  ] as const;
  const rows: ParsedRow[] = table.slice(2).map(({ cells: values }) => {
    if (values.length !== 11) throw new DocumentValidationError([{ code: 'INVALID_COLUMN_COUNT' }]);
    const row = Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Record<
      (typeof keys)[number],
      string
    >;
    return { ...row, deps: row.deps === '-' ? [] : row.deps.split(',').map((x) => x.trim()) };
  });
  const errors: DocumentDiagnostic[] = [],
    byId = new Map<string, ParsedRow>();
  for (const r of rows) {
    const parts = r.id.match(/^([A-Z]+)-?(\d{3,})$/);
    if (!parts) errors.push({ code: 'INVALID_ID', taskId: r.id });
    else if (parts[1] !== idPrefix && parts[1] !== 'W')
      errors.push({ code: 'PREFIX_MISMATCH', taskId: r.id, prefix: idPrefix });
    if (byId.has(r.id)) errors.push({ code: 'DUPLICATE_ID', taskId: r.id });
    byId.set(r.id, r);
    if (!['group', 'task', 'milestone'].includes(r.type))
      errors.push({ code: 'INVALID_TYPE', taskId: r.id });
    if (
      !(r.type === 'group'
        ? r.status === 'auto'
        : ['todo', 'doing', 'blocked', 'done'].includes(r.status))
    )
      errors.push({ code: 'INVALID_STATUS', taskId: r.id });
    const validDate = (x: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(x) &&
      !Number.isNaN(Date.parse(x)) &&
      new Date(x).toISOString().slice(0, 10) === x;
    if (
      (r.start === '-') !== (r.end === '-') ||
      (r.start !== '-' && (!validDate(r.start) || !validDate(r.end) || r.start > r.end))
    )
      errors.push({ code: 'INVALID_DATE', taskId: r.id });
    if (r.type === 'milestone' && (r.start !== r.end || r.effort !== '0'))
      errors.push({ code: 'INVALID_MILESTONE', taskId: r.id });
    if (
      r.type === 'task' &&
      r.effort !== '-' &&
      (!Number.isFinite(Number(r.effort)) || Number(r.effort) <= 0)
    )
      errors.push({ code: 'INVALID_EFFORT', taskId: r.id });
    if (
      (r.type === 'group' && [r.start, r.end, r.effort].some((x) => x !== '-')) ||
      (r.type === 'group' && r.deps.length)
    )
      errors.push({ code: 'INVALID_GROUP_FIELDS', taskId: r.id });
  }
  for (const r of rows) {
    if (r.parent !== '-' && byId.get(r.parent)?.type !== 'group')
      errors.push({ code: 'INVALID_PARENT', taskId: r.id });
    if (r.type === 'group' && !rows.some((x) => x.parent === r.id))
      errors.push({ code: 'EMPTY_GROUP', taskId: r.id });
    for (const id of r.deps) {
      const dep = byId.get(id);
      if (!dep || dep.type === 'group')
        errors.push({
          code: 'INVALID_DEPENDENCY',
          taskId: r.id,
          dependencyId: id,
          target: dep ? 'group' : 'missing',
        });
      else if (r.start !== '-' && dep.end !== '-' && r.start <= dep.end)
        errors.push({ code: 'INVALID_DEPENDENCY_DATE', taskId: r.id, dependencyId: id });
    }
  }
  function cycle(edges: (row: ParsedRow) => string[], relation: 'parent' | 'deps') {
    const visited = new Set<string>(),
      active = new Set<string>();
    function visit(id: string) {
      if (active.has(id)) {
        errors.push({ code: 'CYCLIC_REFERENCE', taskId: id, relation });
        return;
      }
      if (visited.has(id)) return;
      active.add(id);
      for (const next of edges(byId.get(id)!)) if (byId.has(next)) visit(next);
      active.delete(id);
      visited.add(id);
    }
    for (const r of rows) visit(r.id);
  }
  cycle((r) => (r.parent && r.parent !== '-' ? [r.parent] : []), 'parent');
  cycle((r) => r.deps || [], 'deps');
  if (errors.length) throw new DocumentValidationError(errors);
  const leaves = (id: string): ParsedRow[] =>
    rows.filter((r) => r.parent === id).flatMap((r) => (r.type === 'group' ? leaves(r.id) : [r]));
  for (const r of rows.filter((r) => r.type === 'group')) {
    const children = leaves(r.id);
    r.status = children.every((x) => x.status === 'done')
      ? 'done'
      : children.some((x) => x.status === 'blocked')
        ? 'blocked'
        : children.every((x) => x.status === 'todo')
          ? 'todo'
          : 'doing';
  }
  return { title: meta('title') || 'WBS', idPrefix, useEffort, rows: rows as WorkRow[] };
}
