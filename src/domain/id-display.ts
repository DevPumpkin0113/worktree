import type { WorkModel } from './types';
export function createIdLabels(model: WorkModel, separator: string) {
  const labels = new Map<string, string>(),
    counts = new Map<string, number>();
  for (const row of model.rows) {
    if (row.milestone) {
      labels.set(row.id, row.id);
      continue;
    }
    const number = row.id.match(/(\d+)$/)?.[1];
    const label = model.idPrefix + (separator === 'hyphen' ? '-' : '') + number;
    labels.set(row.id, label);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  for (const [id, label] of labels)
    if ((counts.get(label) ?? 0) > 1) labels.set(id, label + ' [' + id + ']');
  return labels;
}
