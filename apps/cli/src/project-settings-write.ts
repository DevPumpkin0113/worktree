import { errorMessage } from './i18n/error-messages';
import { jsonInput } from './input';
import { projectSettingsDraft, updateProjectSettings } from '@worktree/core/project-settings';
import { projectConfig } from '@worktree/core/project-source';
import { CliError } from './errors';
import type { Options } from './arguments';
import type { readProject } from './project-reader';

export function planProjectSettings(options: Options, project: ReturnType<typeof readProject>) {
  if (!options.values.input) throw new CliError('USAGE', errorMessage('specifyInputSettingsJson'));
  const input: unknown = jsonInput(options.values.input, options.session);
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length)
    throw new CliError('USAGE', errorMessage('expectedANonEmptySettingsObject'));
  const config = projectConfig(project.source);
  const editable = [
    'name',
    'useEffort',
    'dateFormat',
    'timeFormat',
    'idSeparator',
    'taskTypes',
    'taskTypeColors',
    'labels',
    'priorities',
    'assignees',
  ];
  for (const [key, value] of Object.entries(input)) {
    if (!editable.includes(key))
      throw new CliError('USAGE', errorMessage('readOnlyOrUnknownField', [key]));
    Object.assign(config, { [key]: value });
  }
  // Validate typed JSON before adapting it to the desktop's string-based form draft.
  const source = {
    ...project.source,
    files: { ...project.source.files, 'project.json': JSON.stringify(config) },
  };
  const valid = projectConfig(source);
  const draft = projectSettingsDraft(project.snapshot);
  Object.assign(draft, {
    name: valid.name,
    useEffort: valid.useEffort,
    dateFormat: valid.dateFormat ?? 'yyyy-MM-dd',
    timeFormat: valid.timeFormat ?? '24h',
    idSeparator: valid.idSeparator ?? 'none',
    taskTypes: valid.taskTypes.join(', '),
    labels: valid.labels.join(', '),
    assignees: (valid.assignees ?? []).join(', '),
    taskTypeColors: valid.taskTypeColors ?? draft.taskTypeColors,
    priorities: valid.priorities ?? draft.priorities,
  });
  return updateProjectSettings(project.snapshot, draft);
}
