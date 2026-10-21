import { DEFAULT_TASK_TYPE_COLORS } from './default-task-types';
export type TaskTypeColors = Record<string, string>;
export function taskTypeColor(colors: TaskTypeColors | undefined, type: string) {
  const color = colors && Object.hasOwn(colors, type) ? colors[type] : undefined;
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : Object.hasOwn(DEFAULT_TASK_TYPE_COLORS, type)
      ? DEFAULT_TASK_TYPE_COLORS[type]
      : undefined;
}
export function validTaskTypeColors(value: unknown, types: string[]): value is TaskTypeColors {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([type, color]) =>
        types.includes(type) && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color),
    )
  );
}
