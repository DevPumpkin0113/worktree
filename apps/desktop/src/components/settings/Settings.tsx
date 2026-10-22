import type { useAppInfo } from '../../hooks/use-app-info';
import { messages } from '../../i18n/messages';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AboutSettings } from './AboutSettings';
import { GeneralSettings } from './GeneralSettings';
import { Icon } from '../shared/Icon';
import type { WorkspaceStore } from '../../app/workspace-store';
import type { WorkspaceSnapshot } from '../../app/types';
export function Settings({
  store,
  state,
  app,
}: {
  store: WorkspaceStore;
  state: WorkspaceSnapshot;
  app: ReturnType<typeof useAppInfo>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState<'general' | 'about'>('general');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const opened = useRef(false);
  useLayoutEffect(() => {
    if (state.settingsOpen) {
      setPage('general');
      if (!dialog.current!.open) dialog.current!.show();
      opened.current = true;
    } else if (dialog.current!.open) dialog.current!.close();
  }, [state.settingsOpen]);
  useEffect(() => {
    if (!state.settingsOpen && opened.current)
      document.getElementById('settingsOpen')?.focus({ preventScroll: true });
  }, [state.settingsOpen]);
  return (
    <dialog
      ref={dialog}
      id="settings"
      aria-labelledby="settingsTitle"
      onCancel={(event) => {
        event.preventDefault();
        store.closeSettings();
      }}
    >
      <header className="settings-topbar">
        <h2 id="settingsTitle">{messages.appSettings}</h2>
        <button
          id="settingsClose"
          className="modal-close"
          aria-label={messages.closeAppSettings}
          title={messages.close}
          autoFocus
          onClick={() => store.closeSettings()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="settings-shell">
        <aside className="settings-sidebar">
          <nav
            className="settings-menu"
            role="tablist"
            aria-label={messages.appSettingsMenu}
            aria-orientation="vertical"
          >
            {(['general', 'about'] as const).map((key, index) => (
              <button
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                key={key}
                id={key === 'general' ? 'settingsGeneralTab' : 'settingsAboutTab'}
                type="button"
                role="tab"
                aria-selected={page === key}
                aria-controls={key === 'general' ? 'settingsGeneralPage' : 'settingsAboutPage'}
                tabIndex={page === key ? 0 : -1}
                className={'settings-menu-item' + (page === key ? ' active' : '')}
                onClick={() => setPage(key)}
                onKeyDown={(event) => {
                  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
                  setPage(next === 0 ? 'general' : 'about');
                  tabs.current[next]?.focus();
                }}
              >
                {key === 'general' ? messages.general : messages.aboutApp}
              </button>
            ))}
          </nav>
          <div className="settings-brand">
            <img src="/worktree-icon.png" width={24} height={24} alt="" />
            <span>Worktree</span>
          </div>
        </aside>
        <div className="settings-main">
          <section
            id="settingsGeneralPage"
            className="settings-page"
            role="tabpanel"
            aria-labelledby="settingsGeneralTab"
            hidden={page !== 'general'}
          >
            <GeneralSettings store={store} state={state} />
          </section>
          <section
            id="settingsAboutPage"
            className="settings-page"
            role="tabpanel"
            aria-labelledby="settingsAboutTab"
            hidden={page !== 'about'}
          >
            <AboutSettings app={app} settingsReady={state.settings.ready} />
          </section>
          <p id="settingsError" role="alert">
            {state.settings.error}
          </p>
        </div>
      </div>
    </dialog>
  );
}
