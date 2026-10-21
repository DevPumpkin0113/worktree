export function sourceLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}
export function patchWorkRow(raw: string, previous: string[], values: string[]): string {
  const pieces = raw.split('|');
  values.forEach((value, index) => {
    if (value === previous[index]) return;
    const original = pieces[index + 1];
    pieces[index + 1] =
      (original.match(/^\s*/)?.[0] ?? '') +
      value.replaceAll('|', '&#124;') +
      (original.match(/\s*$/)?.[0] ?? '');
  });
  return pieces.join('|');
}
