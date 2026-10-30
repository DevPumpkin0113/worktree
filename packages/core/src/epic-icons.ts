import emojiRegex from 'emoji-regex';

export const EPIC_ICONS = ['layers', 'folder', 'desktop', 'terminal', 'tools', 'rocket'] as const;

export type LegacyEpicIcon = (typeof EPIC_ICONS)[number];

export const LUCIDE_EPIC_ICONS = [
  'layers',
  'folder',
  'folder-open',
  'monitor',
  'terminal',
  'wrench',
  'rocket',
  'code',
  'database',
  'server',
  'cloud',
  'globe',
  'shield',
  'lock',
  'key',
  'git-branch',
  'git-merge',
  'box',
  'package',
  'boxes',
  'archive',
  'file-text',
  'notebook',
  'book-open',
  'bookmark',
  'flag',
  'diamond',
  'target',
  'calendar',
  'clock',
  'alarm-clock',
  'timer',
  'check',
  'check-check',
  'circle-check',
  'circle-dot',
  'circle',
  'play',
  'pause',
  'circle-alert',
  'bug',
  'flask-conical',
  'lightbulb',
  'sparkles',
  'star',
  'heart',
  'bolt',
  'zap',
  'flame',
  'palette',
  'brush',
  'pen-tool',
  'image',
  'camera',
  'music',
  'headphones',
  'gamepad-2',
  'coffee',
  'pizza',
  'leaf',
  'tree-pine',
  'flower',
  'sun',
  'moon',
  'mountain',
  'plane',
  'map',
  'compass',
  'users',
  'user',
  'briefcase',
  'building',
  'house',
  'chart-no-axes-combined',
  'chart-pie',
  'chart-column',
  'smartphone',
  'laptop',
  'cpu',
  'hard-drive',
  'network',
  'settings',
  'cog',
  'search',
  'list',
  'list-tree',
  'layout-grid',
  'panels-top-left',
] as const;

export type LucideEpicIconName = (typeof LUCIDE_EPIC_ICONS)[number];

export type LucideEpicIcon = `lucide:${LucideEpicIconName}`;

export type EpicIcon = string;
export function isEpicIconColor(value: unknown): value is string {
  return typeof value === 'string' && value.length === 7 && /^#[0-9a-f]{6}$/i.test(value);
}

export const EPIC_ICON_EMOJIS: Readonly<Record<LegacyEpicIcon, string>> = {
  layers: '🗂️',
  folder: '📁',
  desktop: '🖥️',
  terminal: '💻',
  tools: '🛠️',
  rocket: '🚀',
};

export const DEFAULT_EPIC_ICON: LucideEpicIcon = 'lucide:layers';

export const DEFAULT_EPIC_EMOJI = EPIC_ICON_EMOJIS.layers;

const emojiPattern = emojiRegex();

export function lucideEpicIconName(value: unknown): LucideEpicIconName | undefined {
  if (typeof value !== 'string' || !value.startsWith('lucide:')) return undefined;
  const name = value.slice('lucide:'.length);
  return (LUCIDE_EPIC_ICONS as readonly string[]).includes(name)
    ? (name as LucideEpicIconName)
    : undefined;
}

export function isLucideEpicIcon(value: unknown): value is LucideEpicIcon {
  return lucideEpicIconName(value) !== undefined;
}

export function isEpicEmoji(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (/^\p{Emoji_Component}$/u.test(value)) return false;
  const matches = value.match(emojiPattern);
  return matches?.length === 1 && matches[0] === value;
}

export function isEpicIcon(value: unknown): value is EpicIcon {
  return (
    typeof value === 'string' &&
    ((EPIC_ICONS as readonly string[]).includes(value) ||
      isLucideEpicIcon(value) ||
      isEpicEmoji(value))
  );
}
