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
    const node = dialog.current!;
    if (!visible) {
      if (node.open) node.close();
      return;
    }
    if (node.open && node.classList.contains('sidebar') !== (mode === 'sidebar')) node.close();
    node.classList.toggle('sidebar', mode === 'sidebar');
    if (!node.open) {
      if (mode === 'sidebar') node.show();
      else node.showModal();
    }
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
  }, [visible]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    resize.current = bindDetailResize({
      handle: handle.current!,
      dialog: dialog.current!,
      hide: () => closeRef.current(),
    });
    return () => resize.current?.dispose();
  }, []);
  useEffect(() => resize.current?.fit(), [collapsed]);
  const isBackdrop = (target: EventTarget, x: number, y: number) => {
    const node = dialog.current!,
      rect = node.getBoundingClientRect();
    return target === node && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom);
  };
  return { dialog, header, handle, pressedOutside, isBackdrop };
}
