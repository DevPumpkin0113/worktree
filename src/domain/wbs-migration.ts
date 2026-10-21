import { parseWbs } from './model';
import { findWorkTable } from './work-table';
import { patchWorkRow, sourceLines } from './work-source';
export function upgradeWbsSource(text: string): string {
  if (parseWbs(text).schemaVersion === 2) return text;
  const lines = sourceLines(text);
  for (const row of findWorkTable(text).table.slice(2)) {
    const values = [...row.cells];
    if (values[2] === 'group' && values[1] === '-') values[2] = 'milestone';
    else if (values[2] === 'milestone') {
      values[2] = 'task';
      values[9] = '-';
    }
    const ending = lines[row.line - 1].match(/\r?\n$/)?.[0] ?? '';
    lines[row.line - 1] = patchWorkRow(row.raw, row.cells, values) + ending;
  }
  let updated = lines.join('');
  const newline = text.match(/\r?\n/)?.[0] ?? '\n';
  const front = updated.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (front) {
    const block = front[0];
    const replacement = /^schema_version:/m.test(block)
      ? block.replace(/^schema_version:[^\r\n]*/m, 'schema_version: 2')
      : block.replace(/^(\uFEFF?---\r?\n)/, '$1schema_version: 2' + newline);
    updated = replacement + updated.slice(block.length);
  } else {
    const bom = updated.startsWith('\uFEFF') ? '\uFEFF' : '';
    updated =
      bom +
      '---' +
      newline +
      'schema_version: 2' +
      newline +
      '---' +
      newline +
      updated.slice(bom.length);
  }
  parseWbs(updated);
  return updated;
}
export function parseWorkspaceWbs(text: string) {
  return parseWbs(upgradeWbsSource(text));
}
