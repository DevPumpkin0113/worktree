import { systemError } from './i18n/error-context';
import { errorMessage } from './i18n/error-messages';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CliError } from './errors';
export function invokeStorage(request: Record<string, unknown>) {
  const name = `worktree-store${process.platform === 'win32' ? '.exe' : ''}`;
  const executable = [
    new URL('./' + name, import.meta.url),
    new URL('../dist/' + name, import.meta.url),
  ]
    .map((url) => fileURLToPath(url))
    .find((file) => fs.existsSync(file));
  if (!executable)
    throw new CliError(
      'STORAGE_UNAVAILABLE',
      errorMessage('runNpmRunBuildCliToBuildTheNativeStorageHelper'),
    );
  const result = spawnSync(executable, [], {
    input: JSON.stringify(request),
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error)
    throw new CliError('STORAGE_ERROR', systemError('STORAGE_ERROR') + ': ' + result.error.message);
  let response: {
    status?: string;
    pending?: string[];
    initialized?: boolean;
    error?: { code: string; message: string };
  };
  try {
    response = JSON.parse(result.stdout);
  } catch {
    throw new CliError(
      'STORAGE_ERROR',
      systemError('STORAGE_ERROR') + (result.stderr ? ': ' + result.stderr : ''),
    );
  }
  if (response.error)
    throw new CliError(
      response.error.code,
      systemError(response.error.code) + ': ' + response.error.message,
    );
  if (result.status !== 0) throw new CliError('STORAGE_ERROR', errorMessage('storageHelperFailed'));
  if (response.status === 'conflict')
    throw new CliError('CONFLICT', errorMessage('projectChangedReadItAgainBeforeRetrying'));
  if (!['saved', 'initialized', 'recovered', 'inspected'].includes(response.status ?? ''))
    throw new CliError('STORAGE_ERROR', errorMessage('unexpectedStorageResponse'));
  return response;
}

export function saveProject(root: string, expected: string, text: string, language: string) {
  invokeStorage({ operation: 'save', root, expected, text, language });
}
