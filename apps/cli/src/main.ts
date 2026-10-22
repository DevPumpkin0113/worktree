#!/usr/bin/env node
import { selectLanguage } from './i18n/error-context';
import { parseArguments } from './arguments';
import { runCommand, describeError, formatError } from './run-command';
import readline from 'node:readline';
import { initWizard, wantsInitWizard } from './init-wizard';
import { readlineAsk } from './init-prompts';
import { execute } from './commands';
import { formatResult } from './output';
import { shell } from './shell';
const args = process.argv.slice(2);
selectLanguage(args);
try {
  const options = parseArguments(args, process.cwd());
  if (options.command === 'shell') await shell(options);
  else if (wantsInitWizard(options, !!process.stdin.isTTY && !!process.stdout.isTTY)) {
    const input = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    try {
      if (await initWizard(options, readlineAsk(input), console.log))
        console.log(formatResult(execute(options), options));
    } finally {
      input.close();
    }
  } else console.log(runCommand(args, process.cwd()).output);
} catch (error) {
  const detail = describeError(error);
  console.error(args.includes('--json') ? JSON.stringify({ error: detail }) : formatError(detail));
  process.exitCode = detail.code === 'USAGE' ? 2 : 1;
}
