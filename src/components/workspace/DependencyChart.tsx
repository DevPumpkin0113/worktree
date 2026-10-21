import { getLanguage } from '../../i18n/messages';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { renderDependencies } from '../../views/schedule-views';
import { useChartPan } from '../../hooks/use-chart-pan';
import { markSelectedWork } from '../../interactions/work-selection';
import type { WorkRow } from '../../app/types';
export function DependencyChart({
  rows,
  filtered,
  label,
  selectedId,
  focus,
  onFocus,
  onSelect,
  onScroll,
}: {
  rows: WorkRow[];
  filtered: WorkRow[];
  label: (id: string) => string;
  selectedId: string | null;
  focus: string | null;
  onFocus: (focus: string | null) => void;
  onSelect: (id: string) => void;
  onScroll: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const consumeClick = useChartPan(root);
  const validFocus = rows.some((row) => row.id === focus) ? focus : null;
  const language = getLanguage();
  const html = useMemo(
    () => renderDependencies(rows, filtered, validFocus, label),
    [rows, filtered, validFocus, label, language],
  );
  useLayoutEffect(() => {
    markSelectedWork(root.current, selectedId);
  }, [html, selectedId]);
  return (
    <div
      ref={root}
      className="chart-adapter"
      onScrollCapture={onScroll}
      onClick={(event) => {
        if (consumeClick()) return;
        const target = (event.target as Element).closest<HTMLElement>(
          '[data-id],[data-select],[data-clear-focus]',
        );
        if (target?.dataset.select) onFocus(target.dataset.select);
        else if (target && 'clearFocus' in target.dataset) onFocus(null);
        else if (target?.dataset.id) onSelect(target.dataset.id);
      }}
      onDoubleClick={(event) => {
        const id = (event.target as Element).closest<HTMLElement>('[data-select]')?.dataset.select;
        if (id) onSelect(id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          const target = event.target as HTMLElement;
          if (target.dataset.id || target.dataset.select) {
            event.preventDefault();
            if (target.dataset.select) onFocus(target.dataset.select);
            else onSelect(target.dataset.id!);
          }
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
