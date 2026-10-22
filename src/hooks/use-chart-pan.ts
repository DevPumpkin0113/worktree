import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { bindChartPan } from '../interactions/chart-pan';
export function useChartPan(root: RefObject<HTMLElement | null>) {
  const pan = useRef<ReturnType<typeof bindChartPan> | null>(null);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    pan.current = bindChartPan(node);
    return () => {
      node.onpointerdown = null;
      node.onpointermove = null;
      node.onpointerup = null;
      node.onpointercancel = null;
      node.onlostpointercapture = null;
      pan.current = null;
    };
  }, [root]);
  return useCallback(() => pan.current?.consumeClick() ?? false, []);
}
