import readline from 'node:readline';
export type Ask = (label: string, initial: string) => Promise<string | undefined>;

export function readlineAsk(input: readline.Interface): Ask {
  return (label, initial) =>
    new Promise((resolve) => {
      let settled = false;
      const finish = (answer?: string) => {
        if (settled) return;
        settled = true;
        input.off('SIGINT', cancel);
        input.off('close', cancel);
        controller.abort();
        resolve(answer);
      };
      const controller = new AbortController();
      const cancel = () => {
        Object.assign(input, { line: '', cursor: 0 });
        finish();
      };
      input.once('SIGINT', cancel);
      input.once('close', cancel);
      input.question(
        `${label}${initial ? ` (${initial})` : ''}: `,
        { signal: controller.signal },
        (answer) => finish(answer.trim() || initial),
      );
    });
}
