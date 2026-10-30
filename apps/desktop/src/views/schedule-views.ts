import { legacyPriorities, type ProjectPriority } from '@worktree/core/project-priorities';
import { priorityColorFor } from './priority-color';
import { messages } from '../i18n/messages';
import type { WorkRow } from '@worktree/core/types';
import { escapeHtml as escape } from './html';
import { STATUS_NAMES as stateName } from '../app/types';

const GRAPH = { nodeWidth: 220, nodeHeight: 64, columnStep: 264, rowStep: 82, left: 16, top: 50 };

const EDGE_GAP = 5;
const EDGE_RADIUS = 6;
function dependencyPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const startX = from.x + GRAPH.nodeWidth + EDGE_GAP;
  const endX = to.x - EDGE_GAP;
  const startY = from.y + GRAPH.nodeHeight / 2;
  const endY = to.y + GRAPH.nodeHeight / 2;
  if (startY === endY) return `M${startX} ${startY}H${endX}`;
  const middle = (startX + endX) / 2;
  const radius = Math.min(EDGE_RADIUS, Math.abs(endY - startY) / 2, (endX - startX) / 4);
  const direction = Math.sign(endY - startY);
  return `M${startX} ${startY}H${middle - radius}Q${middle} ${startY} ${middle} ${startY + direction * radius}V${endY - direction * radius}Q${middle} ${endY} ${middle + radius} ${endY}H${endX}`;
}

export function graphLayout(rows: WorkRow[]) {
  const byId = new Map(rows.map((r) => [r.id, r])),
    depth = new Map<string, number>(),
    children = new Map<string, string[]>(rows.map((r) => [r.id, []]));
  for (const r of rows) for (const id of r.deps) if (children.has(id)) children.get(id)!.push(r.id);
  function level(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const deps = byId.get(id)!.deps.filter((d) => byId.has(d));
    const value = deps.length ? 1 + Math.max(...deps.map(level)) : 0;
    depth.set(id, value);
    return value;
  }
  const layers: WorkRow[][] = [];
  for (const r of rows) {
    const d = level(r.id);
    (layers[d] ??= []).push(r);
  }
  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, x) =>
    layer.forEach((r, y) =>
      positions.set(r.id, {
        x: GRAPH.left + x * GRAPH.columnStep,
        y: GRAPH.top + y * GRAPH.rowStep,
      }),
    ),
  );
  return {
    positions,
    children,
    width: Math.max(360, (layers.length - 1) * GRAPH.columnStep + GRAPH.nodeWidth + GRAPH.left * 2),
    height: Math.max(160, Math.max(0, ...layers.map((x) => x.length)) * GRAPH.rowStep + GRAPH.top),
    layers,
  };
}

export function relatedIds(rows: WorkRow[], id: string) {
  const byId = new Map(rows.map((r) => [r.id, r])),
    children = new Map<string, string[]>(rows.map((r) => [r.id, []]));
  for (const r of rows) for (const dep of r.deps) children.get(dep)?.push(r.id);
  const result = new Set([id]);
  for (const next of [
    (key: string) => byId.get(key)?.deps || [],
    (key: string) => children.get(key) || [],
  ]) {
    const visited = new Set<string>();
    const walk = (key: string): void => {
      if (visited.has(key)) return;
      visited.add(key);
      result.add(key);
      next(key).forEach(walk);
    };
    walk(id);
  }
  return result;
}

export function renderDependencies(
  rows: WorkRow[],
  matched: WorkRow[],
  selected: string | null,
  label: (id: string) => string,
  priorities: ProjectPriority[] = legacyPriorities(),
) {
  if (!matched.length) return `<div class="empty">${escape(messages.noMatchingTasks)}</div>`;
  const visible = new Set<string>();
  for (const r of matched) for (const id of relatedIds(rows, r.id)) visible.add(id);
  const nodes = rows.filter((r) => visible.has(r.id));
  const layout = graphLayout(nodes),
    byId = new Map(rows.map((r) => [r.id, r]));
  const focus = selected && visible.has(selected) ? selected : null,
    related = focus ? relatedIds(rows, focus) : null;
  const matchedIds = new Set(matched.map((r) => r.id));
  const titles = layout.layers
    .map(
      (_layer, i) =>
        `<text x="${GRAPH.left + i * GRAPH.columnStep}" y="23" class="stage-label">${i === 0 ? messages.noPredecessors : messages.dependencyStage(i)}</text>`,
    )
    .join('');
  const edges = nodes
    .flatMap((r) =>
      r.deps
        .filter((id) => visible.has(id))
        .map((id) => {
          const a = layout.positions.get(id)!,
            b = layout.positions.get(r.id)!;
          const highlighted = related?.has(id) && related.has(r.id);
          return `<path class="graph-edge ${related ? (highlighted ? 'related' : 'dim') : ''}" marker-end="url(#${highlighted ? 'dependency-arrow-related' : 'dependency-arrow'})" d="${dependencyPath(a, b)}"/>`;
        }),
    )
    .join('');
  const cards = nodes
    .map((r) => {
      const p = layout.positions.get(r.id)!,
        dim = related ? !related.has(r.id) : !matchedIds.has(r.id);
      return `<g class="graph-node ${dim ? 'dim' : ''} ${focus === r.id ? 'selected' : ''}" data-select="${r.id}" tabindex="0" role="button" aria-label="${escape(label(r.id) + ' ' + r.name)}"><title>${escape(label(r.id) + ' · ' + r.name + ' · ' + stateName[r.status])}</title><rect x="${p.x}" y="${p.y}" width="${GRAPH.nodeWidth}" height="${GRAPH.nodeHeight}" rx="6"/><rect class="graph-priority-strip" x="${p.x + 6}" y="${p.y + 10}" width="3" height="${GRAPH.nodeHeight - 20}" rx="1.5" style="fill:${priorityColorFor(r.priority ?? '-', priorities) ?? 'transparent'}"/><circle cx="${p.x + 18}" cy="${p.y + 18}" r="3" class="dot-${r.status}"/><foreignObject x="${p.x + 28}" y="${p.y + 7}" width="178" height="22"><div xmlns="http://www.w3.org/1999/xhtml" class="graph-identity"><span>${escape(label(r.id))}</span><span class="graph-status">${escape(stateName[r.status])}</span></div></foreignObject><foreignObject x="${p.x + 14}" y="${p.y + 33}" width="192" height="22"><div xmlns="http://www.w3.org/1999/xhtml" class="graph-name">${escape(r.name)}</div></foreignObject></g>`;
    })
    .join('');
  const current = focus ? byId.get(focus) : undefined;
  const preceding = current?.deps.map((id) => label(id)).join(', ') || messages.none;
  const following = current
    ? layout.children
        .get(current.id)!
        .map((id) => label(id))
        .join(', ') || messages.none
    : '';
  const info = current
    ? `<div class="dependency-focus network-toolbar"><div><strong>${escape(label(current.id) + ' · ' + current.name)}</strong><div class="sub">${escape(messages.directPredecessorsPrefix)}${escape(preceding)}${escape(messages.directSuccessorsPrefix)}${escape(following)}</div></div><button data-id="${current.id}">${escape(messages.networkDetails)}</button><button data-clear-focus>${escape(messages.clearHighlight)}</button></div>`
    : `<div class="network-toolbar"><span class="network-hint" title="${escape(messages.networkHint + ' ' + messages.networkFilterHint)}">${escape(messages.networkCompactHint)}</span></div>`;
  return (
    info +
    `<div class="chart-scroll-frame"><div class="diagram-scroll" tabindex="0" aria-label="${escape(messages.workNetwork)}"><div class="dependency-stage-header" style="width:${layout.width}px"><svg width="${layout.width}" height="36" aria-hidden="true">${titles}</svg></div><svg class="dependency-canvas" width="${layout.width}" height="${layout.height}" role="group" aria-label="${escape(messages.networkLabel)}"><defs>${[false, true].map((related) => `<marker id="${related ? 'dependency-arrow-related' : 'dependency-arrow'}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 7 4 1 7" class="dependency-arrow${related ? ' related' : ''}"/></marker>`).join('')}</defs>${edges}${cards}</svg></div></div>`
  );
}
