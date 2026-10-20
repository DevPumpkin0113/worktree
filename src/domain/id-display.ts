import type { WorkModel } from './types';
interface IdStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}
const KEY = 'worktree.id-separator';
export function readSeparator(storage: Pick<IdStorage, 'getItem'>) {
  try {
    return storage.getItem(KEY) === 'hyphen' ? 'hyphen' : 'none';
  } catch {
    return 'none';
  }
}
export function saveSeparator(storage: IdStorage, value: string) {
  if (!['none', 'hyphen'].includes(value)) throw Error('잘못된 ID 구분자 설정입니다.');
  return storage.setItem(KEY, value);
}
export function createIdLabels(model: WorkModel, separator: string) {
  const labels = new Map<string, string>(),
    counts = new Map<string, number>();
  for (const row of model.rows) {
    const number = row.id.match(/(\d+)$/)?.[1];
    const label = model.idPrefix + (separator === 'hyphen' ? '-' : '') + number;
    labels.set(row.id, label);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  for (const [id, label] of labels)
    if ((counts.get(label) ?? 0) > 1) labels.set(id, label + ' [' + id + ']');
  return labels;
}
