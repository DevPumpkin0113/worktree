import { messages } from '../../i18n/messages';
import { useEffect, useState } from 'react';
import { Icon } from '../shared/Icon';
import type { WorkspaceStore } from '../../app/workspace-store';
export function Titlebar({
  store,
  settingsOpen,
}: {
  store: WorkspaceStore;
  settingsOpen: boolean;
}) {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    let live = true,
      unsubscribe: (() => void) | undefined;
    void store.platform
      .onResize?.((value) => {
        if (live) setMaximized(value);
      })
      .then((fn) => {
        if (live) unsubscribe = fn;
        else fn();
      })
      .catch((error) => store.report(error, '', messages.windowControlError));
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [store]);
  const control = (action: 'minimize' | 'maximize' | 'close' | 'drag') =>
    void store.platform
      .control(action)
      .catch((error) => store.report(error, '', messages.windowControlError));
  return (
    <header className="titlebar">
      <img className="app-mark" src="/worktree-icon.png" alt="" width={20} height={20} />
      <div className="header-actions header-actions-left">
        <button
          id="reload"
          aria-label={messages.reloadSource}
          title={messages.reloadSource}
          disabled={!store.activeProject}
          onClick={() => {
            void store.refreshProject();
          }}
        >
          <Icon name="reload" />
        </button>
      </div>
      <div
        id="titleDrag"
        className="title-drag"
        aria-label={messages.dragWindow}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          control(event.detail === 2 ? 'maximize' : 'drag');
        }}
      >
        <h1 id="title" hidden>
          {store.active?.model?.title ?? 'Worktree'}
        </h1>
      </div>
      <div className="header-actions" role="group" aria-label={messages.documentTools}>
        <button
          id="settingsOpen"
          className={settingsOpen ? 'active' : ''}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          aria-pressed={settingsOpen}
          aria-controls="settings"
          aria-label={messages.appSettings}
          title={messages.appSettings}
          onClick={() => store.toggleSettings()}
        >
          <Icon name="settings" />
        </button>
      </div>
      <div className="window-controls">
        {(['minimize', 'maximize', 'close'] as const).map((action, index) => (
          <button
            key={action}
            id={['windowMinimize', 'windowMaximize', 'windowClose'][index]}
            aria-label={
              action === 'maximize' && maximized
                ? messages.restoreWindow
                : [messages.minimizeWindow, messages.maximizeWindow, messages.closeWindow][index]
            }
            title={
              action === 'maximize' && maximized
                ? messages.restoreWindow
                : [messages.minimizeWindow, messages.maximizeWindow, messages.close][index]
            }
            onClick={() => control(action)}
          >
            <Icon name={action === 'maximize' && maximized ? 'restore' : action} />
          </button>
        ))}
      </div>
    </header>
  );
}
