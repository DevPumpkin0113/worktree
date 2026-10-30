import { createContext } from 'react';

export const TaskEditorTitleContext = createContext<HTMLElement | null>(null);
export const TaskEditorIconRequestContext = createContext<{
  requested: boolean;
  consume: () => void;
} | null>(null);
