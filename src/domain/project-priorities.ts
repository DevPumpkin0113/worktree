import { messages } from '../i18n/messages';
export const MAX_PROJECT_PRIORITIES = 100;
export const MAX_PRIORITY_NAME_LENGTH = 100;
export interface ProjectPriority {
  id: string;
  name: string;
}
export function defaultPriorities(): ProjectPriority[] {
  return [
    { id: 'high', name: messages.highPriority },
    { id: 'normal', name: messages.normalPriority },
    { id: 'low', name: messages.lowPriority },
  ];
}
export function legacyPriorities() {
  return [{ id: 'urgent', name: messages.urgentPriority }, ...defaultPriorities()];
}
export function validPriorities(value: unknown): value is ProjectPriority[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_PROJECT_PRIORITIES &&
    value.every(
      (p) =>
        p &&
        Object.keys(p).every((key) => ['id', 'name'].includes(key)) &&
        typeof p.id === 'string' &&
        /^[A-Za-z0-9_][A-Za-z0-9_-]{0,79}$/.test(p.id) &&
        typeof p.name === 'string' &&
        p.name === p.name.trim() &&
        !!p.name &&
        p.name.length <= MAX_PRIORITY_NAME_LENGTH &&
        !/[\r\n\0,]/.test(p.name),
    ) &&
    new Set(value.map((p) => p.id)).size === value.length &&
    new Set(value.map((p) => p.name)).size === value.length
  );
}
export function movePriority(values: ProjectPriority[], from: number, to: number) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= values.length ||
    to >= values.length
  )
    return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
