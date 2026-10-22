import { ProjectValidationError } from './project-source';
export function readTaskFile(file: string, text: string) {
  if (text.includes('\0')) throw new ProjectValidationError(file, 'content', 'NUL');
  const match = text.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new ProjectValidationError(file, 'metadata', '', 1);
  const metadata: Record<string, unknown> = {};
  const lines = new Map<string, number>();
  match[1].split(/\r?\n/).forEach((line, index) => {
    const entry = line.match(/^([A-Za-z][A-Za-z0-9]*):[ \t]*(.+)$/);
    if (!entry || Object.hasOwn(metadata, entry[1]))
      throw new ProjectValidationError(file, 'metadata', line, index + 2);
    try {
      metadata[entry[1]] = JSON.parse(entry[2]);
    } catch {
      throw new ProjectValidationError(file, entry[1], entry[2], index + 2);
    }
    lines.set(entry[1], index + 2);
  });
  return {
    metadata,
    lines,
    description: text
      .replace(/^\uFEFF/, '')
      .slice(match[0].length)
      .replace(/^\r?\n/, '')
      .replace(/\r?\n$/, ''),
  };
}
export function writeTaskFile(metadata: Record<string, unknown>, description = '') {
  return (
    '---\n' +
    Object.entries(metadata)
      .map(([key, value]) => key + ': ' + JSON.stringify(value))
      .join('\n') +
    '\n---\n\n' +
    description +
    '\n'
  );
}
