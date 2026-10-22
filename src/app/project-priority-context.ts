import { createContext, useContext, type CSSProperties } from 'react';
import { legacyPriorities, type ProjectPriority } from '../domain/project-priorities';
import { priorityColor } from '../views/priority-color';
export const ProjectPriorityContext = createContext<ProjectPriority[] | undefined>(undefined);
export function usePriorityStyle(value: string): CSSProperties {
  const priorities = useContext(ProjectPriorityContext) ?? legacyPriorities();
  return {
    '--task-priority-color':
      priorityColor(
        priorities.findIndex((p) => p.id === value),
        priorities.length,
      ) ?? 'transparent',
  } as CSSProperties;
}
