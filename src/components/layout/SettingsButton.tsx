import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';
import type { useUpdateNotice } from '../../hooks/use-update-notice';
export function SettingsButton({
  settingsOpen,
  onClick,
  notice,
}: {
  settingsOpen: boolean;
  onClick: () => void;
  notice: ReturnType<typeof useUpdateNotice>;
}) {
  return (
    <div className="settings-button-container">
      <button
        id="settingsOpen"
        className={settingsOpen ? 'active' : ''}
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        aria-pressed={settingsOpen}
        aria-controls="settings"
        aria-label={
          notice.unread && notice.version
            ? messages.appSettings + ' · ' + messages.availableVersion(notice.version)
            : messages.appSettings
        }
        title={messages.appSettings}
        onClick={onClick}
      >
        <Icon name="settings" />
        {notice.unread ? <span className="settings-update-dot" aria-hidden="true" /> : null}
      </button>
      {notice.visible && notice.version ? (
        <aside className="settings-update-notice" aria-label={messages.update}>
          <div role="status">
            <strong>{messages.availableVersion(notice.version)}</strong>
            <p>{messages.updateNoticeHint}</p>
          </div>
          <button
            id="updateNoticeClose"
            className="update-notice-close"
            type="button"
            aria-label={messages.closeUpdateNotice}
            onClick={notice.dismiss}
          >
            <Icon name="close" />
          </button>
        </aside>
      ) : null}
    </div>
  );
}
