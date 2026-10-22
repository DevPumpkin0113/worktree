import { errorMessage } from './i18n/error-messages';
import { projectFolder } from './project-location';
import { invokeStorage } from './native-store';
import { CliError } from './errors';
import type { Options } from './arguments';
export function recoverProject(options: Options) {
  if (!options.yes && !options.dryRun)
    throw new CliError('CONFIRMATION_REQUIRED', errorMessage('passYesToRecover'));
  const root = projectFolder(options.project);
  const response = invokeStorage({
    operation: 'recover',
    root,
    apply: options.yes && !options.dryRun,
    language: options.language,
  });
  return { recovery: response, root, dryRun: options.dryRun };
}
