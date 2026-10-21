import type { Language } from '../i18n/messages';
import { messages } from '../i18n/messages';
import type { Status, WorkModel, Problem } from '../domain/types';
export type { Status, WorkRow, WorkModel, Problem } from '../domain/types';
export type View = 'tree' | 'board' | 'flow' | 'gantt';
export type Page = 'board' | 'tasks' | 'analytics' | 'project';
export type DetailMode = 'sidebar' | 'modal';
export interface OpenDocument {
  path: string;
  text: string;
  model: WorkModel | null;
  problems: Problem[];
  view: View;
  ganttUnit: 'day' | 'week';
  graphFocus: string | null;
}
export interface SettingsStorage {
  ready: Promise<void>;
  warning: string;
  getItem(key: string): string | null;
  setItem(key: string, value: string): Promise<void>;
}
export interface Platform {
  invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
  setTitle(title: string): void;
  control(action: 'minimize' | 'maximize' | 'close' | 'drag'): Promise<void>;
  onResize?(callback: (maximized: boolean) => void): Promise<() => void>;
  channel?(handler: (event: DownloadEvent) => void): unknown;
}
export interface DownloadEvent {
  phase: string;
  downloaded: number;
  total?: number;
}
export interface Settings {
  language: Language;
  separator: 'none' | 'hyphen';
  detailMode: DetailMode;
  ready: boolean;
  error: string;
  saving: boolean;
}
export interface WorkspaceSnapshot {
  documents: OpenDocument[];
  activePath: string | null;
  recent: string[];
  ready: boolean;
  page: Page;
  query: string;
  owner: string;
  status: string;
  selectedId: string | null;
  settingsOpen: boolean;
  problemsOpen: boolean;
  operationProblems: Problem[];
  settings: Settings;
}
export const STATUS_NAMES: Record<Status, string> = {
  get todo() {
    return messages.todo;
  },
  get doing() {
    return messages.doing;
  },
  get blocked() {
    return messages.blocked;
  },
  get done() {
    return messages.done;
  },
};
export const TYPE_NAMES = {
  get group() {
    return messages.workGroup;
  },
  get task() {
    return messages.task;
  },
  get milestone() {
    return messages.milestone;
  },
};
