export function bindChartPan(root: HTMLElement) {
  let gesture: {
      scroller: HTMLElement;
      id: number;
      x: number;
      y: number;
      left: number;
      top: number;
      moved: boolean;
    } | null = null,
    suppressUntil = 0;
  function finish() {
    if (!gesture) return;
    const { scroller, moved } = gesture;
    scroller.classList.toggle('panning', false);
    if (moved) suppressUntil = Date.now() + 400;
    gesture = null;
  }
  root.onpointerdown = (event) => {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    const scroller = (event.target as Element).closest<HTMLElement>(
      '.gantt-scroll,.diagram-scroll',
    );
    if (
      !scroller ||
      (event.target as Element).closest<HTMLElement>(
        'button,select,input,a,.graph-node,.schedule-bar',
      )
    )
      return;
    gesture = {
      scroller,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
      moved: false,
    };
  };
  root.onpointermove = (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x,
      dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
    if (!gesture.moved) {
      gesture.moved = true;
      root.setPointerCapture?.(event.pointerId);
      gesture.scroller.classList.toggle('panning', true);
    }
    event.preventDefault();
    gesture.scroller.scrollLeft = gesture.left - dx;
    gesture.scroller.scrollTop = gesture.top - dy;
  };
  root.onpointerup = finish;
  root.onpointercancel = finish;
  root.onlostpointercapture = finish;
  return {
    consumeClick() {
      if (Date.now() < suppressUntil) {
        suppressUntil = 0;
        return true;
      }
      return false;
    },
  };
}
