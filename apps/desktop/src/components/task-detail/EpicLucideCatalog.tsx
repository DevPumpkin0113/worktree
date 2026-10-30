import {
  DEFAULT_EPIC_ICON,
  LUCIDE_EPIC_ICONS,
  lucideEpicIconName,
  type LucideEpicIconName,
  type EpicIcon,
} from '@worktree/core/epic-icons';
import { EpicColorEditor } from './EpicColorEditor';
import { useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import { lucideKeywords } from '../../views/lucide-keywords';
import { LucideEpicIcon, lucideIconLabel } from '../shared/LucideEpicIcon';

const GRID_COLUMNS = 12;
const COLORS = [
  '#9ca3af',
  '#64748b',
  '#6366f1',
  '#06b6d4',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#f9a8d4',
  '#ef4444',
];
const GROUPS: { label: () => string; names: readonly LucideEpicIconName[] }[] = [
  { label: () => messages.iconCategoryPeople, names: ['users', 'user', 'heart', 'star'] },
  {
    label: () => messages.iconCategoryNature,
    names: ['leaf', 'tree-pine', 'flower', 'sun', 'moon', 'mountain', 'flame'],
  },
  { label: () => messages.iconCategoryFood, names: ['coffee', 'pizza'] },
  {
    label: () => messages.iconCategoryActivity,
    names: [
      'gamepad-2',
      'music',
      'headphones',
      'palette',
      'brush',
      'pen-tool',
      'camera',
      'image',
      'target',
      'rocket',
      'plane',
      'map',
      'compass',
    ],
  },
  {
    label: () => messages.iconCategoryWork,
    names: [
      'briefcase',
      'building',
      'house',
      'folder',
      'folder-open',
      'archive',
      'file-text',
      'notebook',
      'book-open',
      'bookmark',
      'calendar',
      'clock',
      'alarm-clock',
      'timer',
      'chart-no-axes-combined',
      'chart-pie',
      'chart-column',
    ],
  },
  {
    label: () => messages.iconCategoryTechnology,
    names: [
      'monitor',
      'terminal',
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
      'bug',
      'flask-conical',
      'smartphone',
      'laptop',
      'cpu',
      'hard-drive',
      'network',
      'settings',
      'cog',
      'wrench',
    ],
  },
];
export function EpicLucideCatalog({
  value,
  color,
  onColorChange,
  onSelect,
}: {
  value?: EpicIcon;
  color?: string;
  onColorChange: (color: string) => void;
  onSelect: (icon: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [editingColor, setEditingColor] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const selected = lucideEpicIconName(value ?? DEFAULT_EPIC_ICON);
  const aliases = lucideKeywords();
  const items = LUCIDE_EPIC_ICONS.filter((name) =>
    (
      name +
      ' ' +
      lucideIconLabel(name).toLowerCase() +
      ' ' +
      (Object.hasOwn(aliases, name) ? aliases[name] : '')
    ).includes(query.trim().toLowerCase()),
  );
  const groups = [
    ...GROUPS,
    {
      label: () => messages.iconCategorySymbols,
      names: LUCIDE_EPIC_ICONS.filter(
        (name) => !GROUPS.some((group) => group.names.includes(name)),
      ),
    },
  ];
  const firstVisible = groups.flatMap((group) => group.names).find((name) => items.includes(name));
  return (
    <>
      {editingColor ? (
        <EpicColorEditor
          color={color}
          onChange={onColorChange}
          onClose={() => setEditingColor(false)}
        />
      ) : (
        <div className="epic-icon-colors" role="group" aria-label={messages.iconColor}>
          <button
            type="button"
            className="epic-color-default"
            aria-label={messages.defaultIconColor}
            title={messages.defaultIconColor}
            aria-pressed={!color || color === '-'}
            onClick={() => onColorChange('-')}
          >
            {!color || color === '-' ? '✓' : ''}
          </button>
          {COLORS.map((item) => (
            <button
              type="button"
              key={item}
              data-icon-color={item}
              style={{ backgroundColor: item }}
              aria-label={messages.iconColor + ' ' + item}
              title={item}
              aria-pressed={color === item}
              onClick={() => onColorChange(item)}
            >
              {color === item ? '✓' : ''}
            </button>
          ))}
          <button
            type="button"
            className="epic-color-custom"
            title={messages.customIconColor}
            aria-label={messages.customIconColor}
            aria-expanded="false"
            onClick={() => setEditingColor(true)}
          />
        </div>
      )}
      <input
        className="epic-icon-search"
        aria-label={messages.searchIcons}
        placeholder={messages.searchIcons}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            grid.current?.querySelector<HTMLButtonElement>('button')?.focus();
          }
        }}
      />
      <div
        className="epic-lucide-categories"
        ref={grid}
        role="group"
        aria-label={messages.iconChoices}
        style={{ color: color && color !== '-' ? color : undefined }}
        onKeyDown={(event) => {
          const buttons = Array.from(
            grid.current?.querySelectorAll<HTMLButtonElement>('button') ?? [],
          );
          const index = buttons.indexOf(event.target as HTMLButtonElement);
          if (index < 0) return;
          const offset = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -GRID_COLUMNS,
            ArrowDown: GRID_COLUMNS,
          }[event.key];
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : offset === undefined
                  ? -1
                  : Math.max(0, Math.min(buttons.length - 1, index + offset));
          if (next >= 0) {
            event.preventDefault();
            event.stopPropagation();
            buttons[next]?.focus();
          }
        }}
      >
        {groups.map((group) => {
          const visible = group.names.filter((name) => items.includes(name));
          return visible.length ? (
            <section key={group.label()}>
              <h3>{group.label()}</h3>
              <div
                className="epic-lucide-grid"
                style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
              >
                {visible.map((name) => (
                  <button
                    type="button"
                    key={name}
                    data-lucide-icon={name}
                    title={lucideIconLabel(name)}
                    aria-label={lucideIconLabel(name)}
                    aria-pressed={selected === name}
                    tabIndex={
                      selected && items.includes(selected)
                        ? selected === name
                          ? 0
                          : -1
                        : firstVisible === name
                          ? 0
                          : -1
                    }
                    onClick={() => onSelect('lucide:' + name)}
                  >
                    <LucideEpicIcon name={name} />
                  </button>
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
      {!items.length ? (
        <p className="epic-icon-empty" role="status">
          {messages.noIconsFound}
        </p>
      ) : null}
    </>
  );
}
