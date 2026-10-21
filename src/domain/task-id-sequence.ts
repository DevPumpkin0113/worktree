export function preserveIdSequences(text: string, taskNumber: string, milestoneNumber: string) {
  const front = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)!;
  const newline = front[0].match(/\r?\n/)![0];
  let block = front[1];
  for (const [key, value] of [
    ['next_task_number', taskNumber],
    ['next_milestone_number', milestoneNumber],
  ]) {
    const pattern = new RegExp('^' + key + ':[^\\r\\n]*', 'm');
    block = pattern.test(block)
      ? block.replace(pattern, key + ': ' + value)
      : block + newline + key + ': ' + value;
  }
  return front[0].replace(front[1], () => block) + text.slice(front[0].length);
}
