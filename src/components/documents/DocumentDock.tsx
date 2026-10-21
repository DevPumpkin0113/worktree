import { messages } from '../../i18n/messages';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { bindDocumentTabs } from '../../interactions/document-tabs';
import type { WorkspaceStore } from '../../app/workspace-store';
import type { WorkspaceSnapshot } from '../../app/types';
export function DocumentDock({
  store,
  state,
}: {
  store: WorkspaceStore;
  state: WorkspaceSnapshot;
}) {
  const tabs = useRef<HTMLDivElement>(null),
    dock = useRef<HTMLElement>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const drag = useRef<ReturnType<typeof bindDocumentTabs> | null>(null);
  const latest = useRef(state);
  latest.current = state;
  useLayoutEffect(() => {
    const root = tabs.current!;
    drag.current = bindDocumentTabs(root, {
      getPaths: () => store.getSnapshot().documents.map((doc) => doc.path),
      isEnabled: () => latest.current.ready && !latest.current.settingsOpen,
      move(source: string, target: string, after: boolean) {
        const scroll = root.scrollLeft;
        store.reorder(source, target, after);
        requestAnimationFrame(() => {
          root.scrollLeft = scroll;
          const index = store.getSnapshot().documents.findIndex((doc) => doc.path === source);
          root
            .querySelector<HTMLButtonElement>(`[data-tab="${index}"]`)
            ?.focus({ preventScroll: true });
        });
      },
    });
    return () => {
      for (const key of [
        'onpointerdown',
        'onpointermove',
        'onpointerup',
        'onpointercancel',
        'onlostpointercapture',
        'onkeydown',
      ] as const)
        root[key] = null;
    };
  }, [store]);
  useEffect(() => {
    if (!recentOpen) return;
    const outside = (event: PointerEvent) => {
      if (!dock.current?.contains(event.target as Node)) setRecentOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setRecentOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key, true);
    };
  }, [recentOpen]);
  return (
    <nav
      ref={dock}
      id="documentDock"
      className="document-dock"
      aria-label={messages.openDocuments}
      inert={state.settingsOpen}
    >
      <span className="dock-label">{messages.documents}</span>
      <div
        ref={tabs}
        id="tabs"
        onClick={(event) => {
          if (drag.current?.consumeClick()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {state.documents.length ? (
          state.documents.map((doc, index) => {
            const title = doc.model?.title ?? doc.path.split(/[\\/]/).pop();
            return (
              <div
                data-tab-index={index}
                key={doc.path}
                className={'document-tab' + (doc.path === state.activePath ? ' selected' : '')}
                title={doc.path}
              >
                <button
                  data-tab={index}
                  title={doc.path + messages.reorderTabHint}
                  aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                  aria-pressed={doc.path === state.activePath}
                  onClick={(event) => {
                    if (drag.current?.consumeClick()) {
                      event.stopPropagation();
                      return;
                    }
                    store.selectDocument(doc.path);
                  }}
                >
                  {title}
                </button>
                <button
                  className="tab-close"
                  data-close-tab={index}
                  aria-label={title + messages.closeDocumentSuffix}
                  onClick={(event) => {
                    event.stopPropagation();
                    store.closeDocument(doc.path);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <span className="dock-empty">{messages.noOpenDocument}</span>
        )}
      </div>
      <div
        id="recentFiles"
        className="recent-files"
        aria-label={messages.recentFiles}
        hidden={!recentOpen}
      >
        {state.recent.length ? (
          state.recent.map((path) => (
            <button
              key={path}
              type="button"
              title={path}
              onClick={() => {
                setRecentOpen(false);
                void store.open(path);
              }}
            >
              {path.split(/[\\/]/).pop()}
              <span>{path}</span>
            </button>
          ))
        ) : (
          <p>{messages.noRecentFiles}</p>
        )}
      </div>
      <button
        id="recentOpen"
        type="button"
        className="dock-open recent-open"
        aria-label={messages.recentFiles}
        aria-expanded={recentOpen}
        aria-controls="recentFiles"
        title={messages.recentFiles}
        disabled={!state.ready}
        onClick={() => setRecentOpen((value) => !value)}
      >
        {messages.recent}
      </button>
      <button
        id="dockOpen"
        className="dock-open"
        aria-label={messages.openDocument}
        title={messages.openDocument}
        disabled={!state.ready}
        onClick={() => void store.pick()}
      >
        +
      </button>
    </nav>
  );
}
