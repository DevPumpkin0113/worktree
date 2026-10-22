import { legacyPriorities, type ProjectPriority } from '../domain/project-priorities';
import { priorityColorFor } from './priority-color';
import { messages } from '../i18n/messages';
import type { WorkRow } from '../domain/types';
import { escapeHtml as escape } from './html';
import { STATUS_NAMES as stateName } from '../app/types';

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
    layer.forEach((r, y) => positions.set(r.id, { x: 24 + x * 280, y: 52 + y * 112 })),
  );
  return {
    positions,
    children,
    width: Math.max(560, layers.length * 280 + 16),
    height: Math.max(210, Math.max(0, ...layers.map((x) => x.length)) * 112 + 76),
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
        `<text x="${24 + i * 280}" y="26" class="stage-label">${i === 0 ? messages.noPredecessors : messages.dependencyStage(i)}</text>`,
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
          return `<path class="graph-edge ${related ? (highlighted ? 'related' : 'dim') : ''}" marker-end="url(#dependency-arrow)" d="M${a.x + 220} ${a.y + 38} C${a.x + 250} ${a.y + 38},${b.x - 30} ${b.y + 38},${b.x} ${b.y + 38}"/>`;
        }),
    )
    .join('');
  const cards = nodes
    .map((r) => {
      const p = layout.positions.get(r.id)!,
        dim = related ? !related.has(r.id) : !matchedIds.has(r.id);
      const name = r.name.length > 19 ? r.name.slice(0, 18) + '…' : r.name;
      return `<g class="graph-node ${dim ? 'dim' : ''} ${focus === r.id ? 'selected' : ''}" data-select="${r.id}" tabindex="0" role="button" aria-label="${escape(label(r.id) + ' ' + r.name)}"><title>${escape(label(r.id) + ' · ' + r.name + ' · ' + stateName[r.status])}</title><rect x="${p.x}" y="${p.y}" width="220" height="78" rx="10"/><circle cx="${p.x + 16}" cy="${p.y + 19}" r="4" class="dot-${r.status}"/><foreignObject x="${p.x + 28}" y="${p.y + 9}" width="178" height="22"><div xmlns="http://www.w3.org/1999/xhtml" class="graph-identity"><span>${escape(label(r.id))}</span><span class="graph-priority" style="background:${priorityColorFor(r.priority ?? '-', priorities) ?? 'transparent'}" aria-hidden="true"></span></div></foreignObject><text x="${p.x + 14}" y="${p.y + 47}" class="graph-name">${escape(name)}</text><text x="${p.x + 14}" y="${p.y + 65}" class="graph-status">${stateName[r.status]}</text></g>`;
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
    ? `<div class="dependency-focus"><div><strong>${escape(label(current.id) + ' · ' + current.name)}</strong><div class="sub">${escape(messages.directPredecessorsPrefix)}${escape(preceding)}${escape(messages.directSuccessorsPrefix)}${escape(following)}</div></div><button data-id="${current.id}">${escape(messages.networkDetails)}</button><button data-clear-focus>${escape(messages.clearHighlight)}</button></div>`
    : `<div class="notice">${escape(messages.networkHint)}</div>`;
  return (
    info +
    `<div class="chart-scroll-frame"><div class="diagram-scroll" tabindex="0" aria-label="${escape(messages.workNetwork)}"><div class="dependency-stage-header" style="width:${layout.width}px"><svg width="${layout.width}" height="40" aria-hidden="true">${titles}</svg></div><svg class="dependency-canvas" width="${layout.width}" height="${layout.height}" role="group" aria-label="${escape(messages.networkLabel)}"><defs><marker id="dependency-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="dependency-arrow"/></marker></defs>${edges}${cards}</svg></div></div><p class="sub">${escape(messages.networkFilterHint)}</p>`
  );
}
