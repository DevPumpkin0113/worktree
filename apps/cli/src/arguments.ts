import { errorMessage } from './i18n/error-messages';
import { resolveHelpTopic } from './help-topics';
import { CliError } from './errors';
export interface Options {
  command:
    | 'help'
    | 'version'
    | 'status'
    | 'list'
    | 'show'
    | 'validate'
    | 'shell'
    | 'init'
    | 'batch'
    | 'recover'
    | 'project-show'
    | 'project-edit'
    | 'schema'
    | 'add'
    | 'edit'
    | 'delete'
    | 'comment-list'
    | 'comment-add'
    | 'comment-edit'
    | 'comment-delete';
  kind: 'task' | 'milestone' | 'comment';
  project: string;
  json: boolean;
  language: 'ko' | 'en';
  id?: string;
  commentId?: string;
  helpTopic?: string;
  session?: boolean;
  noInteractive?: boolean;
  initialization?: Record<string, unknown>;
  status?: string;
  owner?: string;
  values: Record<string, string>;
  yes: boolean;
  dryRun: boolean;
  detach: boolean;
}
const valued = [
  'text-file',
  'description-file',
  'search',
  'label',
  'project',
  'lang',
  'status',
  'owner',
  'title',
  'description',
  'milestone',
  'start',
  'end',
  'effort',
  'priority',
  'type',
  'labels',
  'deps',
  'blocked-reason',
  'references',
  'input',
  'text',
  'author',
  'reply-to',
  'children',
  'expect',
  'name',
  'prefix',
  'directory',
  'use-effort',
  'id-separator',
  'date-format',
  'time-format',
];
export function parseArguments(args: string[], cwd: string): Options {
  const result: Options = {
    command: 'help',
    kind: 'task',
    project: cwd,
    json: false,
    language: 'en',
    values: {},
    yes: false,
    dryRun: false,
    detach: false,
  };
  const words: string[] = [];
  const used = new Set<string>();
  let information: 'help' | 'version' | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-')) {
      words.push(arg);
      continue;
    }
    if (used.has(arg)) throw new CliError('USAGE', errorMessage('duplicateOption', [arg]));
    used.add(arg);
    if (arg === '--help' || arg === '-h') {
      information = 'help';
      continue;
    }
    if (arg === '--version' || arg === '-v') {
      information = 'version';
      continue;
    }
    if (arg === '--json') {
      result.json = true;
      continue;
    }
    if (arg === '--no-interactive') {
      result.noInteractive = true;
      continue;
    }
    if (arg === '--yes') {
      result.yes = true;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (arg === '--detach') {
      result.detach = true;
      continue;
    }
    const key = arg.slice(2);
    if (!arg.startsWith('--') || !valued.includes(key))
      throw new CliError('USAGE', errorMessage('unknownOption', [arg]));
    const value = args[++i];
    if (value === undefined || value.startsWith('--'))
      throw new CliError('USAGE', errorMessage('missingValue', [arg]));
    result.values[key] = value;
  }
  result.project = result.values.project ?? cwd;
  result.owner = result.values.owner;
  result.status = result.values.status;
  if (result.values.lang && !['ko', 'en'].includes(result.values.lang))
    throw new CliError('USAGE', errorMessage('invalidLanguage'));
  result.language = (result.values.lang ?? 'en') as 'ko' | 'en';
  if (result.status !== undefined && !['todo', 'doing', 'blocked', 'done'].includes(result.status))
    throw new CliError('USAGE', errorMessage('invalidStatus'));
  if (information === 'help' || words[0] === 'help') {
    result.command = 'help';
    result.helpTopic = resolveHelpTopic(words[0] === 'help' ? words.slice(1) : words);
    return result;
  }
  if (information === 'version') {
    result.command = 'version';
    return result;
  }
  const [first, verb, id, commentId] = words;
  if (!words.length || first === 'help') result.command = 'help';
  else if (
    ['version', 'status', 'validate', 'shell', 'init', 'schema', 'batch', 'recover'].includes(
      first,
    ) &&
    words.length === 1
  )
    result.command = first as Options['command'];
  else if (first === 'project' && ['show', 'edit'].includes(verb) && words.length === 2) {
    result.command = verb === 'show' ? 'project-show' : 'project-edit';
  } else if (
    ['task', 'milestone'].includes(first) &&
    ['list', 'show', 'add', 'edit', 'delete'].includes(verb)
  ) {
    result.kind = first as 'task' | 'milestone';
    result.command = verb as Options['command'];
    result.id = id;
    if (words.length !== (['show', 'edit', 'delete'].includes(verb) ? 3 : 2))
      throw new CliError('USAGE', errorMessage('invalidArguments'));
  } else if (first === 'comment' && ['list', 'add', 'edit', 'delete'].includes(verb)) {
    result.kind = 'comment';
    result.command = ('comment-' + verb) as Options['command'];
    result.id = id;
    result.commentId = commentId;
    if (words.length !== (['edit', 'delete'].includes(verb) ? 4 : 3))
      throw new CliError('USAGE', errorMessage('invalidCommentArguments'));
  } else throw new CliError('USAGE', errorMessage('unknownCommand', [words.join(' ')]));
  if (words.length > 1 && ['help', 'version'].includes(result.command))
    throw new CliError('USAGE', errorMessage('invalidArguments'));
  const allowed = new Set(['project', 'lang']);
  if (result.command === 'init')
    for (const key of [
      'name',
      'prefix',
      'directory',
      'use-effort',
      'id-separator',
      'date-format',
      'time-format',
      'input',
    ])
      allowed.add(key);
  if (result.command === 'batch') allowed.add('input');
  if (result.command === 'project-edit') allowed.add('input');
  if (result.command === 'list') {
    for (const key of ['search', 'milestone', 'type', 'priority', 'label']) allowed.add(key);
    allowed.add('status');
    allowed.add('owner');
  }
  if (['add', 'edit'].includes(result.command))
    for (const key of [
      'input',
      'title',
      'start',
      'end',
      ...(result.kind === 'task'
        ? [
            'description',
            'description-file',
            'milestone',
            'owner',
            'status',
            'effort',
            'priority',
            'type',
            'labels',
            'deps',
            'blocked-reason',
            'references',
          ]
        : []),
    ])
      allowed.add(key);
  if (result.command === 'delete' && result.kind === 'milestone') {
    allowed.add('children');
  }
  if (['comment-add', 'comment-edit'].includes(result.command)) {
    allowed.add('text');
    allowed.add('text-file');
  }
  if (result.command === 'comment-add') {
    allowed.add('author');
    allowed.add('reply-to');
  }
  const writing = [
    'add',
    'edit',
    'delete',
    'comment-add',
    'comment-edit',
    'comment-delete',
    'init',
    'project-edit',
    'batch',
    'recover',
  ].includes(result.command);
  if (writing && !['init', 'recover'].includes(result.command)) allowed.add('expect');
  for (const key of Object.keys(result.values))
    if (!allowed.has(key))
      throw new CliError('USAGE', errorMessage('optionNotAvailableForThisCommand', [key]));
  if (!writing && (result.yes || result.dryRun || result.detach))
    throw new CliError('USAGE', errorMessage('writeOptionsRequireAWriteCommand'));
  if (
    result.yes &&
    !['delete', 'comment-delete', 'batch', 'recover', 'init'].includes(result.command)
  )
    throw new CliError('USAGE', errorMessage('yesRequiresDelete'));
  if (result.noInteractive && result.command !== 'init')
    throw new CliError(
      'USAGE',
      errorMessage('optionNotAvailableForThisCommand', ['no-interactive']),
    );
  if (result.detach && result.command !== 'delete')
    throw new CliError('USAGE', errorMessage('detachRequiresDelete'));
  if (result.values.children && !['keep', 'delete'].includes(result.values.children))
    throw new CliError('USAGE', errorMessage('childrenMustBeKeepOrDelete'));
  for (const field of ['text', 'description'])
    if (result.values[field] !== undefined && result.values[field + '-file'] !== undefined)
      throw new CliError('USAGE', errorMessage('chooseOrFileNotBoth', [field, field]));
  if (
    Object.entries(result.values).filter(
      ([key, value]) => ['input', 'text-file', 'description-file'].includes(key) && value === '-',
    ).length > 1
  )
    throw new CliError('USAGE', errorMessage('standardInputCanOnlyBeReadOnce'));
  return result;
}
