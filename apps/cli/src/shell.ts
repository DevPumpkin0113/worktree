import { initWizard, wantsInitWizard } from './init-wizard';
import { readlineAsk } from './init-prompts';
import { errorMessage } from './i18n/error-messages';
import path from 'node:path';
import { projectFolder, hasProjectMarker } from './project-location';
import { setLanguage } from '@worktree/core/i18n/messages';
import readline from 'node:readline';
import { parseArguments, type Options } from './arguments';
import { execute } from './commands';
import { readProject } from './project-reader';
import { runCommand, describeError, formatError } from './run-command';
import { CliError } from './errors';
import { shellOutput } from './shell-output';
export function tokenize(line: string) {
  const words: string[] = [];
  let word = '',
    quote = '',
    started = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) {
        if (line[i + 1] === quote) {
          word += c;
          i++;
        } else quote = '';
      } else word += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      started = true;
    } else if (/\s/.test(c)) {
      if (started) {
        words.push(word);
        word = '';
        started = false;
      }
    } else {
      word += c;
      started = true;
    }
  }
  if (quote) throw new CliError('USAGE', errorMessage('unclosedQuote'));
  if (started) words.push(word);
  return words;
}
function location(input: string) {
  const root = projectFolder(input);
  let name = path.basename(root) || root;
  if (hasProjectMarker(root)) {
    try {
      name = readProject(root).model.title;
    } catch (error) {
      if (!(error instanceof CliError) || error.code !== 'RECOVERY_REQUIRED') throw error;
    }
  }
  return {
    root,
    name,
    initialized: hasProjectMarker(root),
  };
}
export async function shell(initial: Options) {
  setLanguage(initial.language);
  const opened = location(initial.project);
  let project = opened.root,
    projectName = opened.name,
    language = initial.language,
    json = initial.json,
    author = '';
  let wizardActive = false;
  const terminal = !!process.stdin.isTTY && !!process.stdout.isTTY;
  const input = readline.createInterface({
    input: process.stdin,
    output: terminal ? process.stdout : undefined,
    terminal,
    historySize: 200,
  });
  const prompt = () => {
    if (terminal) {
      input.setPrompt(`worktree [${projectName}]> `);
      input.prompt();
    }
  };
  if (!json)
    console.log(
      language === 'ko'
        ? 'Worktree shell · help로 명령 확인 · exit 또는 quit으로 종료'
        : 'Worktree shell · Type help for commands · Type exit or quit to leave',
    );
  if (!opened.initialized && !json)
    console.log(
      language === 'ko'
        ? '프로젝트가 초기화되지 않았습니다. init 명령으로 시작하세요.'
        : 'Project is not initialized. Run init to create the project.',
    );
  // History and session state stay in memory; project contents are never cached to disk.
  input.on('SIGINT', () => {
    if (wizardActive) return;
    // Reset both public readline values; prompting alone retains unfinished input.
    Object.assign(input, { line: '', cursor: 0 });
    process.stdout.write('\n');
    prompt();
  });
  try {
    prompt();
    for await (const line of input) {
      try {
        setLanguage(language);
        const words = tokenize(line);
        if (!words.length) {
          prompt();
          continue;
        }
        if (words[0] === 'exit' || words[0] === 'quit') {
          if (json) console.log(JSON.stringify({ ok: true, command: words[0] }));
          break;
        }
        if (['use', 'language', 'format', 'author'].includes(words[0])) {
          const replyJson = json;
          if (words.length !== 2)
            throw new CliError('USAGE', errorMessage('requiresOneValue', [words[0]]));
          if (words[0] === 'use') {
            const opened = location(words[1]);
            project = opened.root;
            projectName = opened.name;
          }
          if (words[0] === 'language') {
            if (!['ko', 'en'].includes(words[1]))
              throw new CliError('USAGE', errorMessage('invalidLanguage'));
            language = words[1] as 'ko' | 'en';
          }
          if (words[0] === 'format') {
            if (!['table', 'json'].includes(words[1]))
              throw new CliError('USAGE', errorMessage('invalidFormat'));
            json = words[1] === 'json';
          }
          if (words[0] === 'author') author = words[1];
          console.log(
            replyJson || json
              ? JSON.stringify({
                  ok: true,
                  command: words[0],
                  value: words[0] === 'use' ? project : words[1],
                })
              : 'OK',
          );
          prompt();
          continue;
        }
        const args = [...words];
        if (!args.includes('--project')) args.push('--project', project);
        if (!args.includes('--lang')) args.push('--lang', language);
        if (json && !args.includes('--json')) args.push('--json');
        if (author && args[0] === 'comment' && args[1] === 'add' && !args.includes('--author'))
          args.push('--author', author);
        const options = parseArguments(args, process.cwd());
        options.session = true;
        setLanguage(options.language);
        if (['help', 'version'].includes(options.command))
          console.log(runCommand(args, process.cwd(), true).output);
        else if (options.command === 'shell')
          throw new CliError('USAGE', errorMessage('nestedShellsAreNotSupported'));
        else {
          if (wantsInitWizard(options, terminal)) {
            wizardActive = true;
            try {
              if (!(await initWizard(options, readlineAsk(input), console.log))) {
                prompt();
                continue;
              }
            } finally {
              wizardActive = false;
            }
          }
          const result = execute(options);
          console.log(shellOutput(result, options));
          if (
            'initialized' in result &&
            result.initialized &&
            projectFolder(options.project) === projectFolder(project)
          ) {
            const refreshed = location(project);
            project = refreshed.root;
            projectName = refreshed.name;
          }
        }
      } catch (error) {
        const detail = describeError(error);
        console.error(json ? JSON.stringify({ error: detail }) : formatError(detail));
      }
      prompt();
    }
  } finally {
    input.close();
  }
}
