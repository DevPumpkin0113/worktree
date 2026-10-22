import { legacyPriorities, type ProjectPriority } from '@worktree/core/project-priorities';
/** Colors follow the current list rank, without storing a color on the priority. */
export function priorityColor(index: number, count: number): string | undefined {
  if (
    !Number.isInteger(index) ||
    !Number.isInteger(count) ||
    count < 1 ||
    index < 0 ||
    index >= count
  )
    return undefined;
  const position = count === 1 ? 0 : index / (count - 1);
  if (position === 0) return 'var(--color-priority-high)';
  if (position === 0.5) return 'var(--color-priority-middle)';
  if (position === 1) return 'var(--color-priority-low)';
  const upper = position < 0.5;
  const percent = (upper ? 1 - position * 2 : 2 - position * 2) * 100;
  return `color-mix(in srgb, var(--color-priority-${upper ? 'high' : 'middle'}) ${Number(percent.toFixed(3))}%, var(--color-priority-${upper ? 'middle' : 'low'}))`;
}

export function priorityColorFor(
  value: string,
  priorities: ProjectPriority[] = legacyPriorities(),
) {
  return priorityColor(
    priorities.findIndex((priority) => priority.id === value),
    priorities.length,
  );
}
