const EDGE_GAP = 8;
const TRIGGER_GAP = 6;
const MAX_HEIGHT = 240;
export function floatingSubmenuPosition(
  anchor: { left: number; top: number; bottom: number; width: number },
  viewport: { width: number; height: number },
  contentHeight: number,
  contentWidth?: number,
) {
  const fallback = floatingListPosition(anchor, viewport, contentHeight, contentWidth);
  const right = anchor.left + anchor.width + TRIGGER_GAP;
  const left = anchor.left - TRIGGER_GAP - fallback.width;
  if (right + fallback.width > viewport.width - EDGE_GAP && left < EDGE_GAP) return fallback;
  const maxHeight = Math.min(MAX_HEIGHT, Math.max(0, viewport.height - EDGE_GAP * 2));
  return {
    left: right + fallback.width <= viewport.width - EDGE_GAP ? right : left,
    top: Math.max(
      EDGE_GAP,
      Math.min(anchor.top, viewport.height - EDGE_GAP - Math.min(contentHeight, maxHeight)),
    ),
    width: fallback.width,
    maxHeight,
  };
}
export function floatingListPosition(
  anchor: { left: number; top: number; bottom: number; width: number },
  viewport: { width: number; height: number },
  contentHeight: number,
  contentWidth?: number,
) {
  const width = Math.min(
    Math.max(contentWidth ?? anchor.width, 142),
    Math.max(0, viewport.width - EDGE_GAP * 2),
  );
  const below = Math.max(0, viewport.height - anchor.bottom - TRIGGER_GAP - EDGE_GAP);
  const above = Math.max(0, anchor.top - TRIGGER_GAP - EDGE_GAP);
  const desired = Math.min(MAX_HEIGHT, contentHeight);
  const upward = below < desired && above > below;
  const maxHeight = Math.min(MAX_HEIGHT, upward ? above : below);
  return {
    left: Math.max(EDGE_GAP, Math.min(anchor.left, viewport.width - width - EDGE_GAP)),
    top: Math.max(
      EDGE_GAP,
      upward
        ? anchor.top - TRIGGER_GAP - Math.min(contentHeight, maxHeight)
        : anchor.bottom + TRIGGER_GAP,
    ),
    width,
    maxHeight,
  };
}
