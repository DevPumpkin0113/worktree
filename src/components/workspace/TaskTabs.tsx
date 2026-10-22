import { useTabStrip } from '../../hooks/use-tab-strip';
import { useRef, useLayoutEffect } from 'react';
import type { WorkModel } from '../../app/types';
import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';
export function TaskTabs({
  ids,
  selectedId,
  model,
  label,
  onSelect,
  onClose,
  onMove,
  enabled,
}: {
  ids: string[];
  selectedId: string | null;
  model: WorkModel;
  label: (id: string) => string;
  onSelect: (id: string | null) => void;
  onClose: (id: string) => void;
  onMove: (source: string, target: string, after: boolean) => void;
  enabled: boolean;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const root = useRef<HTMLElement>(null);
  const drag = useTabStrip(root, {
    getPaths: () => ids,
    isEnabled: () => enabled,
    move: onMove,
    focus: (source) => refs.current.get(source)?.focus({ preventScroll: true }),
  });
  const keys = ['home', ...ids];
  const closeTab = (id: string) => {
    onClose(id);
    const remaining = keys.filter((key) => key !== id);
    const next =
      selectedId === id
        ? remaining[Math.min(keys.indexOf(id), remaining.length - 1)]
        : (selectedId ?? 'home');
    refs.current.get(next)?.focus();
  };
  useLayoutEffect(() => {
    refs.current
      .get(selectedId ?? 'home')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selectedId]);
  return (
    <nav
      className="task-tabs"
      ref={root}
      onClickCapture={(event) => {
        if (drag.consumeClick()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      role="tablist"
      aria-label={messages.taskTabs}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const index = keys.indexOf(selectedId ?? 'home');
        const next =
          event.key === 'ArrowRight'
            ? (index + 1) % keys.length
            : event.key === 'ArrowLeft'
              ? (index - 1 + keys.length) % keys.length
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? keys.length - 1
                  : -1;
        if (next < 0) return;
        event.preventDefault();
        onSelect(next === 0 ? null : keys[next]);
        refs.current.get(keys[next])?.focus();
      }}
    >
      <button
        type="button"
        role="tab"
        className="task-home-tab"
        id="task-home-tab"
        aria-label={messages.homeTab}
        title={messages.homeTab}
        aria-selected={!selectedId}
        aria-controls="workspaceHome"
        tabIndex={selectedId ? -1 : 0}
        ref={(element) => {
          if (element) refs.current.set('home', element);
          else refs.current.delete('home');
        }}
        onClick={() => onSelect(null)}
      >
        <Icon name="home" />
      </button>
      {ids.map((id, index) => {
        const row = model.rows.find((item) => item.id === id);
        const title = row ? (row.milestone ? row.name : label(id) + ' · ' + row.name) : label(id);
        return (
          <div
            className="task-tab"
            key={id}
            role="presentation"
            data-active={selectedId === id}
            data-tab-index={index}
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClick={(event) => {
              if (event.button !== 1) return;
              event.preventDefault();
              closeTab(id);
            }}
          >
            <button
              type="button"
              role="tab"
              id={'task-tab-' + id}
              data-tab={index}
              aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
              aria-selected={selectedId === id}
              aria-controls="detail"
              tabIndex={selectedId === id ? 0 : -1}
              title={title}
              ref={(element) => {
                if (element) refs.current.set(id, element);
                else refs.current.delete(id);
              }}
              onClick={() => onSelect(id)}
            >
              {label(id)}
            </button>
            <button
              type="button"
              className="task-tab-close"
              data-close-tab={index}
              aria-label={messages.closeTaskTab + ': ' + title}
              onClick={() => closeTab(id)}
            >
              <Icon name="close" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
