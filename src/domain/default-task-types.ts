export const DEFAULT_TASK_TYPES = [
  'feature',
  'bug',
  'improvement',
  'task',
  'docs',
  'spike',
  'chore',
] as const;
export const DEFAULT_TASK_TYPE_COLORS: Readonly<Record<string, string>> = {
  feature: '#a2eeef',
  bug: '#d73a4a',
  improvement: '#f29a4e',
  task: '#e3dede',
  docs: '#1d76db',
  spike: '#d4c5f9',
  chore: '#6c757d',
};
export function defaultTaskTypeColors(types: readonly string[] = DEFAULT_TASK_TYPES) {
  return Object.fromEntries(
    types
      .filter((type) => Object.hasOwn(DEFAULT_TASK_TYPE_COLORS, type))
      .map((type) => [type, DEFAULT_TASK_TYPE_COLORS[type]]),
  );
}
