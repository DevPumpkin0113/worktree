import { useLayoutEffect, type RefObject } from 'react';

const HEADING_HEIGHT = '--workspace-heading-height';

export function useWorkspaceHeadingHeight(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const heading = ref.current;
    if (!heading) return;
    const style = document.documentElement.style;
    const previous = style.getPropertyValue(HEADING_HEIGHT);
    const update = () => {
      const height = heading.getBoundingClientRect().height;
      if (height > 0) style.setProperty(HEADING_HEIGHT, `${height}px`);
    };
    update();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(heading);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      if (previous) style.setProperty(HEADING_HEIGHT, previous);
      else style.removeProperty(HEADING_HEIGHT);
    };
  }, [ref]);
}
