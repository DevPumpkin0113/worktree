import type { WorkRow } from '../domain/types';
const unassignedKey = '@unassigned';
const groupSelector = 'summary[data-work-id], summary[data-view-group="unassigned"]';
const groupKey = (summary: HTMLElement) =>
  summary.dataset.workId ??
  (summary.dataset.viewGroup === 'unassigned' ? unassignedKey : undefined);
const scrollers = ['.diagram-scroll', '.gantt-scroll'];

export function createDocumentViewState() {
  const documents = new Map<
    string,
    {
      views: Map<
        string,
        {
          left: number;
          top: number;
          nested: Record<string, { left: number; top: number; date?: number }>;
        }
      >;
      groups: Map<string, boolean>;
    }
  >();
  function state(path: string) {
    if (!documents.has(path)) documents.set(path, { views: new Map(), groups: new Map() });
    return documents.get(path)!;
  }
  return {
    capture(path: string, view: string, root: HTMLElement) {
      if (!path) return;
      const current = state(path);
      const scroll = {
        left: root.scrollLeft || 0,
        top: root.scrollTop || 0,
        nested: {} as Record<string, { left: number; top: number; date?: number }>,
      };
      for (const selector of scrollers) {
        const node = root.querySelector?.<HTMLElement>(selector);
        if (node) {
          const date = Number(node.dataset?.windowStart);
          scroll.nested[selector] = {
            left: node.scrollLeft,
            top: node.scrollTop,
            ...(Number.isFinite(date) ? { date } : {}),
          };
        }
      }
      for (const summary of root.querySelectorAll?.<HTMLElement>(groupSelector) || []) {
        const key = groupKey(summary);
        if (key) current.groups.set(key, (summary.parentElement as HTMLDetailsElement).open);
      }
      current.views.set(view, scroll);
    },
    restore(
      path: string,
      view: string,
      root: HTMLElement,
      rows: (Pick<WorkRow, 'id'> & Partial<Pick<WorkRow, 'type' | 'parent'>>)[],
    ) {
      const current = documents.get(path);
      if (current) {
        const ids = new Set(rows.map((row) => row.id));
        if (rows.some((row) => row.type === 'task' && row.parent === '-')) ids.add(unassignedKey);
        for (const id of current.groups.keys()) if (!ids.has(id)) current.groups.delete(id);
        for (const summary of root.querySelectorAll?.<HTMLElement>(groupSelector) || []) {
          const key = groupKey(summary);
          if (key && current.groups.has(key))
            (summary.parentElement as HTMLDetailsElement).open = current.groups.get(key)!;
        }
      }
      const scroll = current?.views.get(view);
      root.scrollLeft = scroll?.left || 0;
      root.scrollTop = scroll?.top || 0;
      for (const selector of scrollers) {
        const node = root.querySelector?.<HTMLElement>(selector);
        if (node) {
          const saved = scroll?.nested[selector];
          if (saved?.date !== undefined) {
            node.dataset.restoreWindowStart = String(saved.date);
            node.dataset.windowStart = String(saved.date);
          }
          node.scrollLeft = saved?.left ?? (Number(node.dataset?.initialScrollLeft) || 0);
          node.scrollTop = saved?.top || 0;
          if (selector === '.gantt-scroll') node.dispatchEvent?.(new Event('scroll'));
        }
      }
    },
    forget(path: string) {
      documents.delete(path);
    },
  };
}
