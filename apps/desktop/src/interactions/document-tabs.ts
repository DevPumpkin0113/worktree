const DRAG_THRESHOLD = 6;

export function reorderDocumentTabs(
  paths: string[],
  source: string,
  target: string,
  after = false,
) {
  if (source === target || !paths.includes(source) || !paths.includes(target)) return paths;
  const next = paths.filter((path) => path !== source),
    index = next.indexOf(target) + (after ? 1 : 0);
  next.splice(index, 0, source);
  return next;
}

// Pointer gestures keep Tauri's native file drop handler available on Windows.
export function bindDocumentTabs(
  root: HTMLElement,
  {
    getPaths,
    move,
    isEnabled = () => true,
  }: {
    getPaths: () => string[];
    move: (source: string, target: string, after: boolean) => void;
    isEnabled?: () => boolean;
  },
) {
  let gesture: {
      source: string;
      pointer: number;
      x: number;
      y: number;
      moved: boolean;
      target: string | null;
      after: boolean;
    } | null = null,
    suppressUntil = 0;
  const tabs = () => [...(root.querySelectorAll?.<HTMLElement>('[data-tab-index]') || [])];
  function clearMarks() {
    for (const tab of tabs())
      for (const name of ['tab-dragging', 'tab-drop-before', 'tab-drop-after'])
        tab.classList.toggle(name, false);
  }
  function finish(commit = false) {
    if (!gesture) return;
    const current = gesture;
    gesture = null;
    clearMarks();
    if (current.moved) suppressUntil = Date.now() + 400;
    if (root.hasPointerCapture?.(current.pointer)) root.releasePointerCapture(current.pointer);
    if (commit && current.target && isEnabled())
      move(current.source, current.target, current.after);
  }
  root.onpointerdown = (event) => {
    if (
      gesture ||
      event.isPrimary === false ||
      event.button !== 0 ||
      !isEnabled() ||
      (event.target as Element).closest<HTMLElement>('[data-close-tab]')
    )
      return;
    const button = (event.target as Element).closest<HTMLElement>('[data-tab]');
    if (!button) return;
    const source = getPaths()[Number(button.dataset.tab)];
    if (!source) return;
    gesture = {
      source,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      target: null,
      after: false,
    };
  };
  root.onpointermove = (event) => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (!isEnabled() || !getPaths().includes(gesture.source)) {
      finish();
      return;
    }
    if (
      !gesture.moved &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DRAG_THRESHOLD
    )
      return;
    if (!gesture.moved) {
      gesture.moved = true;
      root.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    clearMarks();
    const bounds = root.getBoundingClientRect();
    if (
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom ||
      event.clientX < bounds.left ||
      event.clientX > bounds.right
    ) {
      gesture.target = null;
      return;
    }
    if (event.clientX < bounds.left + 24) root.scrollLeft -= 24;
    else if (event.clientX > bounds.right - 24) root.scrollLeft += 24;
    const paths = getPaths(),
      items = tabs();
    const dragged = items.find((tab) => paths[Number(tab.dataset.tabIndex)] === gesture!.source);
    dragged?.classList.toggle('tab-dragging', true);
    const others = items.filter((tab) => paths[Number(tab.dataset.tabIndex)] !== gesture!.source);
    const before = others.find((tab) => {
      const rect = tab.getBoundingClientRect();
      return event.clientX < rect.left + rect.width / 2;
    });
    const target = before || others.at(-1);
    gesture.target = target ? paths[Number(target.dataset.tabIndex)] : null;
    gesture.after = !before;
    target?.classList.toggle(before ? 'tab-drop-before' : 'tab-drop-after', true);
  };
  root.onpointerup = (event) => {
    if (gesture?.pointer === event.pointerId) finish(true);
  };
  root.onpointercancel = () => finish();
  root.onlostpointercapture = () => finish();
  root.onkeydown = (event) => {
    if (event.key === 'Escape' && gesture) {
      event.preventDefault();
      event.stopPropagation();
      finish();
      return;
    }
    if (
      !isEnabled() ||
      !event.altKey ||
      !event.shiftKey ||
      !['ArrowLeft', 'ArrowRight'].includes(event.key)
    )
      return;
    const button = (event.target as Element).closest<HTMLElement>('[data-tab]');
    if (!button) return;
    const paths = getPaths(),
      index = Number(button.dataset.tab),
      after = event.key === 'ArrowRight',
      target = paths[index + (after ? 1 : -1)];
    if (!target) return;
    event.preventDefault();
    move(paths[index], target, after);
  };
  return {
    dispose() {
      finish();
      for (const key of [
        'onpointerdown',
        'onpointermove',
        'onpointerup',
        'onpointercancel',
        'onlostpointercapture',
        'onkeydown',
      ] as const)
        root[key] = null;
    },
    consumeClick() {
      if (Date.now() < suppressUntil) {
        suppressUntil = 0;
        return true;
      }
      return false;
    },
  };
}
