import { useLayoutEffect, useRef, type RefObject } from 'react';
import { bindDocumentTabs } from '../interactions/document-tabs';
import { bindTabWheel } from '../interactions/tab-wheel';
interface TabStripOptions {
  getPaths: () => string[];
  isEnabled: () => boolean;
  move: (source: string, target: string, after: boolean) => void;
  focus: (source: string) => void;
}
export function useTabStrip(rootRef: RefObject<HTMLElement | null>, options: TabStripOptions) {
  const latest = useRef(options);
  latest.current = options;
  const drag = useRef<ReturnType<typeof bindDocumentTabs> | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame: number | undefined;
    drag.current = bindDocumentTabs(root, {
      getPaths: () => latest.current.getPaths(),
      isEnabled: () => latest.current.isEnabled(),
      move: (source, target, after) => {
        const scroll = root.scrollLeft;
        latest.current.move(source, target, after);
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          root.scrollLeft = scroll;
          latest.current.focus(source);
        });
      },
    });
    const removeWheel = bindTabWheel(root, () => latest.current.isEnabled());
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      drag.current?.dispose();
      drag.current = null;
      removeWheel();
    };
  }, [rootRef]);
  return { consumeClick: () => drag.current?.consumeClick() ?? false };
}
