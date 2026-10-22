import { createContext, useContext, type CSSProperties } from 'react';
import type { ProjectPriority } from '../domain/project-priorities';
import { priorityColorFor } from '../views/priority-color';
export const ProjectPriorityContext = createContext<ProjectPriority[] | undefined>(undefined);
export function priorityStyle(value: string, priorities?: ProjectPriority[]): CSSProperties {
  return {
    '--task-priority-color': priorityColorFor(value, priorities) ?? 'transparent',
  } as CSSProperties;
}
export function usePriorityStyle(value: string): CSSProperties {
  return priorityStyle(value, useContext(ProjectPriorityContext));
}
