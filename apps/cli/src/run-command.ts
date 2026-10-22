import { selectLanguage, systemError } from './i18n/error-context';
import { errorMessage } from './i18n/error-messages';
import { getLanguage, setLanguage } from '@worktree/core/i18n/messages';
import { ProjectValidationError } from '@worktree/core/project-source';
import { worktreeReleaseStage } from '@worktree/core/release-name';
import { version } from '../package.json';
import { parseArguments } from './arguments';
import { execute } from './commands';
import { BatchError, CliError } from './errors';
import { formatResult } from './output';
import { help } from './help';
export function runCommand(args: string[], cwd: string, session = false) {
  selectLanguage(args);
  const options = parseArguments(args, cwd);
  setLanguage(options.language);
  if (options.command === 'shell')
    throw new CliError('USAGE', errorMessage('nestedShellsAreNotSupported'));
  if (options.command === 'help')
    return {
      output: options.json
        ? JSON.stringify({ help: help(options.language, options.helpTopic, session) })
        : help(options.language, options.helpTopic, session),
      options,
    };
  if (options.command === 'version')
    return {
      output: options.json
        ? JSON.stringify({ version })
        : `${worktreeReleaseStage(version)} Worktree CLI ${version}`,
      options,
    };
  return { output: formatResult(execute(options), options), options };
}
export function describeError(error: unknown): {
  code: string;
  message: string;
  file?: string;
  field?: string;
  line?: number;
  value?: string;
  reason?: string;
  cause?: string;
  batchIndex?: number;
  batchCommand?: number;
} {
  if (error instanceof BatchError)
    return {
      ...describeError(error.cause),
      batchIndex: error.index,
      batchCommand: error.index + 1,
    };
  return error instanceof ProjectValidationError
    ? {
        code: 'INVALID_DOCUMENT',
        message: error.message,
        file: error.file,
        field: error.field,
        line: error.line,
        value: error.value,
        reason: error.reason,
      }
    : error instanceof CliError
      ? { code: error.code, message: error.message, file: error.file }
      : error instanceof SyntaxError
        ? { code: 'USAGE', message: systemError('INPUT_JSON'), cause: error.message }
        : {
            code: (error as NodeJS.ErrnoException)?.code ?? 'COMMAND_FAILED',
            message:
              error instanceof Error && !(error as NodeJS.ErrnoException).code
                ? error.message
                : systemError((error as NodeJS.ErrnoException)?.code ?? 'COMMAND_FAILED'),
            cause: error instanceof Error ? error.message : String(error),
          };
}

export function formatError(detail: ReturnType<typeof describeError>) {
  const position =
    detail.batchCommand === undefined
      ? ''
      : getLanguage() === 'ko'
        ? `일괄 명령 #${detail.batchCommand}: `
        : `Batch command #${detail.batchCommand}: `;
  return `${detail.code}: ${position}${detail.message}`;
}
