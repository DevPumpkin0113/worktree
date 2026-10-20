import type { WorkRow } from '../domain/types';
const scrollers = ['.diagram-scroll', '.gantt-scroll'];

export function createDocumentViewState() {
  const documents = new Map<
    string,
    {
      views: Map<
        string,
        { left: number; top: number; nested: Record<string, { left: number; top: number }> }
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
        nested: {} as Record<string, { left: number; top: number }>,
      };
      for (const selector of scrollers) {
        const node = root.querySelector?.<HTMLElement>(selector);
        if (node) scroll.nested[selector] = { left: node.scrollLeft, top: node.scrollTop };
      }
      for (const summary of root.querySelectorAll?.<HTMLElement>('summary[data-work-id]') || [])
        current.groups.set(
          summary.dataset.workId!,
          (summary.parentElement as HTMLDetailsElement).open,
        );
      current.views.set(view, scroll);
    },
    restore(path: string, view: string, root: HTMLElement, rows: Pick<WorkRow, 'id'>[]) {
      const current = documents.get(path);
      if (current) {
        const ids = new Set(rows.map((row) => row.id));
        for (const id of current.groups.keys()) if (!ids.has(id)) current.groups.delete(id);
        for (const summary of root.querySelectorAll?.<HTMLElement>('summary[data-work-id]') || [])
          if (current.groups.has(summary.dataset.workId!))
            (summary.parentElement as HTMLDetailsElement).open = current.groups.get(
              summary.dataset.workId!,
            )!;
      }
      const scroll = current?.views.get(view);
      root.scrollLeft = scroll?.left || 0;
      root.scrollTop = scroll?.top || 0;
      for (const selector of scrollers) {
        const node = root.querySelector?.<HTMLElement>(selector);
        if (node) {
          node.scrollLeft = scroll?.nested[selector]?.left || 0;
          node.scrollTop = scroll?.nested[selector]?.top || 0;
        }
      }
    },
    forget(path: string) {
      documents.delete(path);
    },
  };
}
