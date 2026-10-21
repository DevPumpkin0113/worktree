import { folderName } from '../../domain/project-paths';
import { messages } from '../../i18n/messages';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { bindDocumentTabs } from '../../interactions/document-tabs';
import type { WorkspaceStore } from '../../app/workspace-store';
import type { WorkspaceSnapshot } from '../../app/types';
export function ProjectDock({ store, state }: { store: WorkspaceStore; state: WorkspaceSnapshot }) {
  const tabs = useRef<HTMLDivElement>(null),
    dock = useRef<HTMLElement>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const drag = useRef<ReturnType<typeof bindDocumentTabs> | null>(null);
  const latest = useRef(state);
  latest.current = state;
  useLayoutEffect(() => {
    const root = tabs.current!;
    drag.current = bindDocumentTabs(root, {
      getPaths: () => store.getSnapshot().projects.map((doc) => doc.path),
      isEnabled: () => latest.current.ready && !latest.current.settingsOpen,
      move(source: string, target: string, after: boolean) {
        const scroll = root.scrollLeft;
        store.reorder(source, target, after);
        requestAnimationFrame(() => {
          root.scrollLeft = scroll;
          const index = store.getSnapshot().projects.findIndex((doc) => doc.path === source);
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
      id="projectDock"
      className="document-dock"
      aria-label={messages.openProjects}
      inert={state.settingsOpen}
    >
      <span className="dock-label">{messages.projects}</span>
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
        {state.projects.length ? (
          state.projects.map((doc, index) => {
            const title = folderName(doc.path);
            return (
              <div
                data-tab-index={index}
                key={doc.path}
                className={
                  'document-tab' + (doc.path === state.activeProjectPath ? ' selected' : '')
                }
                title={doc.path}
              >
                <button
                  data-tab={index}
                  title={doc.path + messages.reorderTabHint}
                  aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                  aria-pressed={doc.path === state.activeProjectPath}
                  onClick={(event) => {
                    if (drag.current?.consumeClick()) {
                      event.stopPropagation();
                      return;
                    }
                    void store.selectProject(doc.path);
                  }}
                >
                  {title}
                </button>
                <button
                  className="tab-close"
                  data-close-tab={index}
                  aria-label={title + messages.closeProjectSuffix}
                  onClick={(event) => {
                    event.stopPropagation();
                    store.closeProject(doc.path);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <span className="dock-empty">{messages.noOpenProject}</span>
        )}
      </div>
      <div
        id="recentFiles"
        className="recent-files"
        aria-label={messages.recentProjects}
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
          <p>{messages.noRecentProjects}</p>
        )}
      </div>
      <button
        id="recentOpen"
        type="button"
        className="dock-open recent-open"
        aria-label={messages.recentProjects}
        aria-expanded={recentOpen}
        aria-controls="recentFiles"
        title={messages.recentProjects}
        disabled={!state.ready}
        onClick={() => setRecentOpen((value) => !value)}
      >
        {messages.recent}
      </button>
      <button
        id="dockOpen"
        className="dock-open"
        aria-label={messages.openProject}
        title={messages.openProject}
        disabled={!state.ready}
        onClick={() => void store.pick()}
      >
        +
      </button>
    </nav>
  );
}
