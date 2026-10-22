import { errorMessage } from './i18n/error-messages';
import { CliError } from './errors';
export const commandGroups: Record<string, string[]> = {
  task: ['list', 'show', 'add', 'edit', 'delete'],
  milestone: ['list', 'show', 'add', 'edit', 'delete'],
  comment: ['list', 'add', 'edit', 'delete'],
  project: ['show', 'edit'],
};
export const singleCommands = [
  'init',
  'status',
  'validate',
  'schema',
  'shell',
  'version',
  'batch',
  'recover',
];
export function resolveHelpTopic(words: string[]) {
  if (!words.length) return undefined;
  const [group, verb] = words;
  if (Object.hasOwn(commandGroups, group)) {
    if (!verb) return group;
    if (commandGroups[group].includes(verb)) {
      const max =
        group === 'comment'
          ? ['edit', 'delete'].includes(verb)
            ? 4
            : 3
          : ['show', 'edit', 'delete'].includes(verb) && group !== 'project'
            ? 3
            : 2;
      if (words.length <= max) return `${group} ${verb}`;
    }
  } else if (singleCommands.includes(group) && words.length === 1) return group;
  throw new CliError('USAGE', errorMessage('unknownHelpTopic', [words.join(' ')]));
}
