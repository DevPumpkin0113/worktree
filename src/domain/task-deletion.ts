import { nextTaskId, nextMilestoneId } from './task-editing';
import { preserveIdSequences } from './task-id-sequence';
import { parseWbs } from './model';
import { findWorkTable } from './work-table';
import { patchWorkRow, sourceLines } from './work-source';
import { messages } from '../i18n/messages';
export interface DeleteOptions {
  children: 'keep' | 'delete';
  detachPredecessors: boolean;
}
export function deletionImpact(text: string, id: string, children: DeleteOptions['children']) {
  const model = parseWbs(text);
  const target = model.rows.find((row) => row.id === id);
  if (!target) throw Error(messages.editTaskMissing);
  const childRows = model.rows.filter((row) => row.parent === id);
  const removed = new Set([id, ...(children === 'delete' ? childRows.map((row) => row.id) : [])]);
  return {
    target,
    childRows,
    removed,
    dependents: model.rows.filter(
      (row) => !removed.has(row.id) && row.deps.some((dep) => removed.has(dep)),
    ),
  };
}
export function deleteTaskSource(text: string, id: string, options: DeleteOptions): string {
  if (!['keep', 'delete'].includes(options.children)) throw Error(messages.invalidDeleteOption);
  const impact = deletionImpact(text, id, options.children);
  if (impact.dependents.length && !options.detachPredecessors)
    throw Error(messages.deleteReferencesRequired);
  const lines = sourceLines(text);
  const removedLines = new Set<number>();
  for (const row of findWorkTable(text).table.slice(2)) {
    if (impact.removed.has(row.cells[0])) {
      removedLines.add(row.line - 1);
      continue;
    }
    const values = [...row.cells];
    if (impact.removed.has(values[1])) values[1] = '-';
    const deps = values[10] === '-' ? [] : values[10].split(',').map((dep) => dep.trim());
    const kept = deps.filter((dep) => !impact.removed.has(dep));
    if (kept.length !== deps.length) values[10] = kept.join(', ') || '-';
    const ending = lines[row.line - 1].match(/\r?\n$/)?.[0] ?? '';
    lines[row.line - 1] = patchWorkRow(row.raw, row.cells, values) + ending;
  }
  const updated = preserveIdSequences(
    lines.filter((_, index) => !removedLines.has(index)).join(''),
    nextTaskId(text)
      .match(/\d+$/)![0]
      .replace(/^0+(?=\d)/, ''),
    nextMilestoneId(text)
      .match(/\d+$/)![0]
      .replace(/^0+(?=\d)/, ''),
  );
  parseWbs(updated);
  return updated;
}
