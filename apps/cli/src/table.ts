import { stripVTControlCharacters } from 'node:util';
function width(value: string) {
  return [...value].reduce(
    (n, c) =>
      n +
      (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff01-\uff60\u{1f300}-\u{1faff}]/u.test(
        c,
      )
        ? 2
        : 1),
    0,
  );
}
function cell(value: unknown) {
  return stripVTControlCharacters(String(value ?? '-')).replace(/[\r\n\t]/g, ' ');
}
export function table(headers: string[], rows: unknown[][]) {
  const cells = [headers, ...rows].map((row) => row.map(cell));
  const widths = headers.map((_, i) =>
    Math.min(54, Math.max(...cells.map((row) => width(row[i])))),
  );
  function fit(value: string, max: number) {
    let text = '';
    if (width(value) <= max) text = value;
    else {
      for (const c of value) {
        if (width(text + c) > max - 1) break;
        text += c;
      }
      text += '…';
    }
    return text + ' '.repeat(Math.max(0, max - width(text)));
  }
  const border = (left: string, middle: string, right: string) =>
    left + widths.map((w) => '─'.repeat(w + 2)).join(middle) + right;
  const line = (row: string[]) =>
    '│' + row.map((v, i) => ' ' + fit(v, widths[i]) + ' ').join('│') + '│';
  return [
    border('┌', '┬', '┐'),
    line(cells[0]),
    border('├', '┼', '┤'),
    ...cells.slice(1).map(line),
    border('└', '┴', '┘'),
  ].join('\n');
}
