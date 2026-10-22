import { systemError } from './i18n/error-context';
import { errorMessage } from './i18n/error-messages';
import fs from 'node:fs';
import { MAX_PROJECT_BYTES } from '@worktree/core/project-limits';
import { CliError } from './errors';
import type { Options } from './arguments';
export function readInput(file: string, session = false) {
  if (file === '-' && (session || process.stdin.isTTY))
    throw new CliError(
      'USAGE',
      errorMessage('standardInputRequiresAPipeOutsideShellUseAFileInShell'),
    );
  const descriptor = file === '-' ? 0 : fs.openSync(file, 'r');
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    const buffer = Buffer.alloc(65536);
    for (;;) {
      const count = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (!count) break;
      size += count;
      if (size > MAX_PROJECT_BYTES) throw new CliError('LIMIT', errorMessage('inputExceedsMib'));
      chunks.push(Buffer.from(buffer.subarray(0, count)));
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    } catch {
      throw new CliError('USAGE', systemError('INPUT_ENCODING'), file);
    }
  } finally {
    if (file !== '-') fs.closeSync(descriptor);
  }
}
export function jsonInput(file: string, session = false): unknown {
  try {
    return JSON.parse(readInput(file, session));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new CliError('USAGE', errorMessage('inputIsNotValidJson'), file);
    throw error;
  }
}
export function prepareBody(options: Options) {
  for (const key of ['text', 'description']) {
    const file = options.values[key + '-file'];
    if (file !== undefined) options.values[key] = readInput(file, options.session);
  }
}
