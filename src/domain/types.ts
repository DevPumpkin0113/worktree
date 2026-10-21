export type Status = 'todo' | 'doing' | 'blocked' | 'done';
export interface WorkRow {
  /** v2 milestone containers use the shared group rendering/aggregation model. */
  milestone?: boolean;
  id: string;
  parent: string;
  type: 'group' | 'task' | 'milestone';
  name: string;
  criteria: string;
  owner: string;
  status: Status;
  start: string;
  end: string;
  effort: string;
  deps: string[];
}
export interface WorkModel {
  schemaVersion?: 1 | 2;
  title: string;
  idPrefix: string;
  useEffort: boolean;
  rows: WorkRow[];
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
