import { patchWorkRow, sourceLines } from './work-source';
import { messages } from '../i18n/messages';
import { parseWbs } from './model';
import { findWorkTable } from './work-table';
export interface TaskDraft {
  type: 'task' | 'milestone';
  name: string;
  criteria: string;
  owner: string;
  status: string;
  parent: string;
  start: string;
  end: string;
  effort: string;
  deps: string;
}
export function taskDraft(text: string, id?: string): TaskDraft {
  parseWbs(text);
  const row = id
    ? findWorkTable(text)
        .table.slice(2)
        .find((row) => row.cells[0] === id)?.cells
    : undefined;
  if (id && !row) throw Error(messages.editTaskMissing);
  return row
    ? {
        type: row[2] as TaskDraft['type'],
        name: row[3],
        criteria: row[4],
        owner: row[5],
        status: row[6],
        parent: row[1],
        start: row[7],
        end: row[8],
        effort: row[9],
        deps: row[10],
      }
    : {
        type: 'task',
        name: '',
        criteria: '',
        owner: '-',
        status: 'todo',
        parent: '-',
        start: '-',
        end: '-',
        effort: '-',
        deps: '-',
      };
}
export function nextTaskId(text: string) {
  const model = parseWbs(text);
  const largest = model.rows
    .filter((row) => !row.milestone)
    .reduce((maximum, row) => {
      const number = BigInt(row.id.match(/\d+$/)![0]);
      return number > maximum ? number : maximum;
    }, 0n);
  const used = new Set(model.rows.map((row) => row.id));
  const sequence = BigInt(model.nextTaskNumber ?? '1');
  let number = sequence > largest ? sequence : largest + 1n;
  while (used.has(model.idPrefix + String(number).padStart(3, '0'))) number++;
  return model.idPrefix + String(number).padStart(3, '0');
}
export function nextMilestoneId(text: string) {
  const model = parseWbs(text);
  const rows = model.rows;
  const maximum = rows.reduce((maximum, row) => {
    const match = row.id.match(/^MS(\d{3,})$/);
    const number = match ? BigInt(match[1]) : 0n;
    return number > maximum ? number : maximum;
  }, 0n);
  const sequence = BigInt(model.nextMilestoneNumber ?? '1');
  return 'MS' + String(sequence > maximum ? sequence : maximum + 1n).padStart(3, '0');
}
export function updateTaskSource(text: string, draft: TaskDraft, taskId?: string) {
  parseWbs(text);
  const { table } = findWorkTable(text);
  const target = taskId ? table.slice(2).find((row) => row.cells[0] === taskId) : undefined;
  if (taskId && !target) throw Error(messages.editTaskMissing);
  if (!draft.name.trim() || (draft.type !== 'milestone' && !draft.criteria.trim()))
    throw Error(
      draft.type === 'milestone' ? messages.milestoneRequiredTitle : messages.taskRequiredFields,
    );
  if (Object.values(draft).some((value) => /[\r\n\0]/.test(value) || value.includes('&#124;')))
    throw Error(messages.taskSingleLine);
  if (target && target.cells[2] !== draft.type) throw Error(messages.taskTypeLocked);
  if (!target && !['task', 'milestone'].includes(draft.type)) throw Error(messages.taskTypeLocked);
  const id = taskId ?? (draft.type === 'milestone' ? nextMilestoneId(text) : nextTaskId(text));
  const values = [
    id,
    draft.parent || '-',
    draft.type,
    draft.name.trim(),
    draft.criteria.trim(),
    draft.owner.trim() || '-',
    draft.type === 'milestone' ? 'auto' : draft.status,
    draft.start || '-',
    draft.end || '-',
    draft.type === 'milestone' ? '-' : draft.effort || '-',
    draft.type === 'milestone' ? '-' : draft.deps.trim() || '-',
  ];
  const encode = (value: string) => value.replaceAll('|', '&#124;');
  const lines = sourceLines(text);
  if (target) {
    const ending = lines[target.line - 1].match(/\r?\n$/)?.[0] ?? '';
    lines[target.line - 1] = patchWorkRow(target.raw, target.cells, values) + ending;
  } else {
    const last = table.at(-1)!;
    const ending = lines[last.line - 1].match(/\r?\n$/)?.[0];
    const newline = ending ?? text.match(/\r?\n/)?.[0] ?? '\n';
    if (!ending) lines[last.line - 1] += newline;
    lines.splice(
      last.line,
      0,
      '| ' + values.map(encode).join(' | ') + ' |' + (ending ? newline : ''),
    );
  }
  const updated = lines.join('');
  parseWbs(updated);
  return { text: updated, id };
}
