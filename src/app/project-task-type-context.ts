import { createContext } from 'react';
import type { TaskTypeColors } from '../domain/task-type-colors';
export const EMPTY_TASK_TYPE_COLORS: TaskTypeColors = {};
export const ProjectTaskTypeContext = createContext<TaskTypeColors>(EMPTY_TASK_TYPE_COLORS);
