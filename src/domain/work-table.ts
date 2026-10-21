import { WBS_SECTION_PATTERN } from './wbs-schema';
export interface SourceLine {
  raw: string;
  line: number;
}
export interface TableRow extends SourceLine {
  cells: string[];
}
export function splitTableCells(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((value) => value.trim().replaceAll('&#124;', '|'));
}

// Columns are one-based Unicode character positions in the original line.
export function tableCellPositions(raw: string) {
  const characters = Array.from(raw),
    pipes: number[] = [];
  characters.forEach((character, index) => {
    if (character === '|') pipes.push(index);
  });
  if (!pipes.length) return [];
  const ends = pipes.slice(1);
  if (
    characters
      .slice(pipes.at(-1)! + 1)
      .join('')
      .trim()
  )
    ends.push(characters.length);
  return ends.map((end, index) => {
    const start = pipes[index] + 1,
      text = characters.slice(start, end).join('');
    const leading = Array.from(text.match(/^\s*/)?.[0] ?? '').length;
    const length = Array.from(text.trim()).length;
    const column = Math.min(start + leading, end) + 1;
    return { column, endColumn: column + Math.max(length - 1, 0) };
  });
}

// Retain source positions so parsing and error details use the same table boundary.
export function findWorkTable(markdown: string) {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const sectionStart = lines.findIndex((line) => WBS_SECTION_PATTERN.test(line));
  if (sectionStart < 0) return { sectionFound: false, table: [] };
  let sectionEnd = lines.findIndex(
    (line, index) => index > sectionStart && /^##(?:\s|$)/.test(line),
  );
  if (sectionEnd < 0) sectionEnd = lines.length;
  const start = lines.findIndex(
    (line, index) => index > sectionStart && index < sectionEnd && line.trim().startsWith('|'),
  );
  const table: TableRow[] = [];
  if (start >= 0) {
    for (let index = start; index < sectionEnd && lines[index].trim().startsWith('|'); index++) {
      table.push({ raw: lines[index], line: index + 1, cells: splitTableCells(lines[index]) });
    }
  }
  return { sectionFound: true, table };
}

export function isTableSeparator(cells: string[] | undefined, columnCount: number) {
  return cells?.length === columnCount && cells.every((value) => /^:?-{3,}:?$/.test(value));
}
