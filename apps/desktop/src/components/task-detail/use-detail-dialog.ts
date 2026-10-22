import { useEffect, useLayoutEffect, useRef } from 'react';
import { bindDetailResize } from '../../interactions/detail-resize';
import type { DetailMode } from '../../app/types';
export function useDetailDialog({
  visible,
  mode,
  path,
  id,
  collapsed,
  onClose,
}: {
  visible: boolean;
  mode: DetailMode;
  path: string | null;
  id: string | null;
  collapsed: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    header = useRef<HTMLElement>(null),
    handle = useRef<HTMLDivElement>(null);
  const resize = useRef<ReturnType<typeof bindDetailResize> | null>(null);
  const pressedOutside = useRef(false);
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node || mode === 'tabs') return;
    if (!visible) {
      if (node.open) node.close();
      return;
    }
    if (!node.open) node.show();
  }, [visible, mode]);
  useLayoutEffect(() => {
    if (visible && dialog.current) dialog.current.scrollTop = 0;
  }, [path, id]);
  useLayoutEffect(() => {
    const node = header.current!;
    const measure = () => {
      const height = node.getBoundingClientRect().height;
      if (height) dialog.current?.style.setProperty('--detail-header-height', height + 'px');
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [visible, mode]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    if (mode !== 'sidebar' || !handle.current || !dialog.current) return;
    resize.current = bindDetailResize({
      handle: handle.current!,
      dialog: dialog.current!,
      hide: () => closeRef.current(),
    });
    return () => {
      resize.current?.dispose();
      resize.current = null;
    };
  }, [mode]);
  useEffect(() => resize.current?.fit(), [collapsed]);
  const isBackdrop = (target: EventTarget, x: number, y: number) => {
    const node = dialog.current;
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    return target === node && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom);
  };
  return { dialog, header, handle, pressedOutside, isBackdrop };
}
