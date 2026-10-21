import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
const DEFAULT_HEIGHT = 220;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 480;
const KEYBOARD_STEP = 16;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function useProjectTreeHeight(enabled: boolean) {
  const container = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; y: number; height: number; handle: HTMLDivElement } | null>(
    null,
  );
  const [requested, setRequested] = useState(DEFAULT_HEIGHT);
  const [limits, setLimits] = useState({ min: MIN_HEIGHT, max: MAX_HEIGHT });
  const [dragging, setDragging] = useState(false);
  const height = clamp(requested, limits.min, limits.max);
  useLayoutEffect(() => {
    const tree = container.current,
      area = viewport.current,
      nav = tree?.parentElement;
    if (!tree || !area || !nav || !enabled) return;
    const style = (node: Element) => window.getComputedStyle(node);
    const number = (value: string) => Number.parseFloat(value) || 0;
    const measure = () => {
      if (!nav.clientHeight) return;
      const navStyle = style(nav),
        treeStyle = style(tree);
      const siblings = [...nav.children]
        .filter((node) => node !== tree)
        .reduce((sum, node) => {
          const css = style(node);
          // The footer's auto top margin is spare space, not a minimum requirement.
          return (
            sum +
            node.getBoundingClientRect().height +
            (node.classList.contains('workspace-nav-footer') ? 0 : number(css.marginTop)) +
            number(css.marginBottom)
          );
        }, 0);
      const chrome = tree.getBoundingClientRect().height - area.getBoundingClientRect().height;
      const available =
        nav.clientHeight -
        number(navStyle.paddingTop) -
        number(navStyle.paddingBottom) -
        siblings -
        chrome -
        number(treeStyle.marginTop) -
        number(treeStyle.marginBottom);
      const max = Math.max(0, Math.min(MAX_HEIGHT, Math.floor(available)));
      const min = Math.min(MIN_HEIGHT, max);
      setLimits((previous) =>
        previous.min === min && previous.max === max ? previous : { min, max },
      );
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    for (const node of [nav, tree, ...nav.children]) observer?.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);
  function finish(cancel = false) {
    const saved = gesture.current;
    if (!saved) return;
    gesture.current = null;
    if (cancel) setRequested(saved.height);
    if (saved.handle.hasPointerCapture(saved.id)) saved.handle.releasePointerCapture(saved.id);
    setDragging(false);
  }
  useEffect(() => {
    if (!enabled) finish();
  }, [enabled]);
  useEffect(() => {
    document.documentElement.classList.toggle('resizing-project-tree', dragging);
    return () => document.documentElement.classList.remove('resizing-project-tree');
  }, [dragging]);
  useEffect(
    () => () => {
      const saved = gesture.current;
      gesture.current = null;
      if (saved?.handle.hasPointerCapture(saved.id)) saved.handle.releasePointerCapture(saved.id);
    },
    [],
  );
  return {
    container,
    viewport,
    height,
    limits,
    dragging,
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!enabled || event.button !== 0 || gesture.current) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = {
        id: event.pointerId,
        y: event.clientY,
        height,
        handle: event.currentTarget,
      };
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const saved = gesture.current;
      if (!saved || saved.id !== event.pointerId) return;
      setRequested(clamp(saved.height + event.clientY - saved.y, limits.min, limits.max));
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      if (gesture.current?.id === event.pointerId) finish();
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) {
      if (gesture.current?.id === event.pointerId) finish(true);
    },
    onLostPointerCapture() {
      finish();
    },
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (!enabled) return;
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
        return;
      }
      const next =
        event.key === 'ArrowUp'
          ? height - KEYBOARD_STEP
          : event.key === 'ArrowDown'
            ? height + KEYBOARD_STEP
            : event.key === 'Home'
              ? limits.min
              : event.key === 'End'
                ? limits.max
                : null;
      if (next === null) return;
      event.preventDefault();
      setRequested(clamp(next, limits.min, limits.max));
    },
  };
}
