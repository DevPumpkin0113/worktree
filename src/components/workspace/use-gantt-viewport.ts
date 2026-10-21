import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ganttGeometry, type TimelineRange, type GanttUnit } from '../../views/gantt-timeline';
const FALLBACK_WIDTH = 960;
export function useGanttViewport(range: TimelineRange | null, unit: GanttUnit, today: string) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const [scroll, setScroll] = useState<number | null>(null);
  const anchor = useRef<{ unit: GanttUnit; start: number } | null>(null);
  const geometry = useMemo(
    () => (range ? ganttGeometry(range, unit, width, today) : null),
    [range?.start, range?.end, unit, width, today],
  );
  const present = !!range;
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth || FALLBACK_WIDTH);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [present]);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node || !geometry) return;
    const next =
      anchor.current?.unit === unit
        ? geometry.scrollForDate(anchor.current.start)
        : geometry.initialScroll;
    node.scrollLeft = next;
    const start = geometry.dateForScroll(next);
    anchor.current = { unit, start };
    node.dataset.windowStart = String(start);
    setScroll(next);
  }, [geometry, unit]);
  function updateScroll() {
    const node = scroller.current;
    if (!node || !geometry) return;
    const restored = node.dataset.restoreWindowStart;
    if (restored !== undefined) {
      delete node.dataset.restoreWindowStart;
      const time = Number(restored);
      if (Number.isFinite(time)) node.scrollLeft = geometry.scrollForDate(time);
    }
    const start = geometry.dateForScroll(node.scrollLeft);
    anchor.current = { unit, start };
    node.dataset.windowStart = String(start);
    setScroll(node.scrollLeft);
  }
  const start = geometry?.dateForScroll(scroll ?? geometry.initialScroll) ?? 0;
  return { scroller, geometry, start, updateScroll };
}
