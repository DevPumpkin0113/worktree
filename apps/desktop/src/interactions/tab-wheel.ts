const LINE_HEIGHT = 16;
export function bindTabWheel(root: HTMLElement, enabled = () => true) {
  const wheel = (event: WheelEvent) => {
    if (!enabled() || event.ctrlKey || root.scrollWidth <= root.clientWidth) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    const scale =
      event.deltaMode === 1 ? LINE_HEIGHT : event.deltaMode === 2 ? root.clientWidth : 1;
    event.preventDefault();
    root.scrollLeft = Math.max(
      0,
      Math.min(root.scrollWidth - root.clientWidth, root.scrollLeft + delta * scale),
    );
  };
  root.addEventListener('wheel', wheel, { passive: false });
  return () => root.removeEventListener('wheel', wheel);
}
