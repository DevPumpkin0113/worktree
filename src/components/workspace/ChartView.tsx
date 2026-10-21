import { getLanguage } from '../../i18n/messages';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { renderDependencies, renderGantt } from '../../views/schedule-views';
import { bindChartPan } from '../../interactions/chart-pan';
import { markSelectedWork } from '../../interactions/work-selection';
import type { View, WorkRow } from '../../app/types';
// SVG 계산·출력과 직접 포인터 이동은 이 어댑터 내부 DOM에서만 수행한다.
export function ChartView({
  view,
  rows,
  filtered,
  label,
  selectedId,
  focus,
  onFocus,
  unit,
  onUnit,
  onSelect,
  onScroll,
}: {
  view: View;
  rows: WorkRow[];
  filtered: WorkRow[];
  label: (id: string) => string;
  selectedId: string | null;
  focus: string | null;
  onFocus: (focus: string | null) => void;
  unit: 'day' | 'week';
  onUnit: (unit: 'day' | 'week') => void;
  onSelect: (id: string) => void;
  onScroll: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const pan = useRef<ReturnType<typeof bindChartPan> | null>(null);
  const validFocus = rows.some((row) => row.id === focus) ? focus : null;
  const language = getLanguage();
  const html = useMemo(
    () =>
      view === 'flow'
        ? renderDependencies(rows, filtered, validFocus, label)
        : renderGantt(filtered, label, unit, undefined, width),
    [view, rows, filtered, validFocus, label, unit, width, language],
  );
  useLayoutEffect(() => {
    const node = root.current!;
    pan.current = bindChartPan(node);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => setWidth(node.clientWidth || 960));
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      node.onpointerdown = null;
      node.onpointermove = null;
      node.onpointerup = null;
      node.onpointercancel = null;
      node.onlostpointercapture = null;
    };
  }, []);
  useLayoutEffect(() => {
    markSelectedWork(root.current, selectedId);
  }, [html, selectedId]);
  return (
    <div
      ref={root}
      className="chart-adapter"
      onScrollCapture={onScroll}
      onClick={(event) => {
        if (pan.current?.consumeClick()) return;
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
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLSelectElement && target.id === 'ganttUnit')
          onUnit(target.value as 'day' | 'week');
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
