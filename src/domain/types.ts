export type Status = 'todo' | 'doing' | 'blocked' | 'done';
export interface WorkRow {
  /** Milestone containers share group rendering and aggregation. */
  milestone?: boolean;
  id: string;
  parent: string;
  type: 'group' | 'task';
  name: string;
  description: string;
  priority?: string;
  taskType?: string;
  labels?: string[];
  blockedReason?: string;
  references?: import('./project-source').TaskReference[];
  createdAt?: string;
  updatedAt?: string;
  owner: string;
  status: Status;
  start: string;
  end: string;
  effort: string;
  deps: string[];
}
export interface WorkModel {
  nextTaskNumber?: string;
  nextMilestoneNumber?: string;
  title: string;
  idPrefix: string;
  idSeparator?: 'none' | 'hyphen';
  useEffort: boolean;
  dateFormat?: import('./project-display').DateFormat;
  timeFormat?: import('./project-display').TimeFormat;
  rows: WorkRow[];
  taskTypes?: string[];
  taskTypeColors?: import('./task-type-colors').TaskTypeColors;
  labels?: string[];
  commonLabels?: string[];
  priorities?: import('./project-priorities').ProjectPriority[];
  assignees?: string[];
  dataDirectory?: string;
}
export interface Problem {
  category?: string;
  kind: string;
  source: string;
  message: string;
  id: string;
  name: string;
  reason: string;
  field: string;
  value: string;
  hint: string;
  example: string;
  raw: string;
  lineNumbers: number[];
  positions: { line: number; column: number; endColumn: number }[];
}
