import { useLayoutEffect, useState, type RefObject, type CSSProperties } from 'react';
import { floatingListPosition } from '../interactions/floating-list';

export function useFloatingList(
  open: boolean,
  trigger: RefObject<HTMLElement | null>,
  list: RefObject<HTMLDivElement | null>,
  itemCount?: number,
) {
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const button = trigger.current,
      popup = list.current;
    if (!open || !button || !popup) return;
    const nativePopover = typeof popup.showPopover === 'function';
    if (nativePopover) popup.showPopover();
    const update = () => {
      const anchor = button.getBoundingClientRect();
      setPosition(
        floatingListPosition(
          anchor,
          { width: window.innerWidth, height: window.innerHeight },
          popup.scrollHeight || 240,
        ),
      );
    };
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !popup.contains(event.target)) update();
    };
    update();
    window.addEventListener('resize', update);
    document.addEventListener('scroll', scroll, true);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(button);
    if (button.parentElement) observer?.observe(button.parentElement);
    observer?.observe(popup);
    return () => {
      window.removeEventListener('resize', update);
      document.removeEventListener('scroll', scroll, true);
      observer?.disconnect();
      if (nativePopover && popup.isConnected) popup.hidePopover();
    };
  }, [open, trigger, list, itemCount]);
  return position;
}
