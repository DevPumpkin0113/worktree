import { DisplayNameSetting } from './DisplayNameSetting';
import { FilterDropdown } from '../shared/FilterDropdown';
import { messages } from '../../i18n/messages';
import type { WorkspaceStore } from '../../app/workspace-store';
import type { WorkspaceSnapshot } from '../../app/types';
export function GeneralSettings({
  store,
  state,
}: {
  store: WorkspaceStore;
  state: WorkspaceSnapshot;
}) {
  return (
    <>
      {' '}
      <div className="settings-page-heading">
        <h3>{messages.general}</h3>
        <p>{messages.instantSettingsHint}</p>
      </div>
      <DisplayNameSetting
        key={state.settings.displayName}
        value={state.settings.displayName}
        disabled={!state.settings.ready || state.settings.saving}
        onSave={(value) => store.saveSetting('displayName', value)}
      />
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <label htmlFor="language">{messages.language}</label>
            <p className="setting-description">{messages.languageHint}</p>
          </div>
          <FilterDropdown
            id="language"
            label={messages.language}
            value={state.settings.language}
            disabled={!state.settings.ready || state.settings.saving}
            options={[
              { value: 'ko', label: messages.koreanLanguage },
              { value: 'en', label: messages.englishLanguage },
            ]}
            onChange={(language) => void store.saveSetting('language', language)}
          />
        </div>
      </div>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <label htmlFor="detailMode">{messages.detailDisplay}</label>
            <p className="setting-description">{messages.detailDisplayHint}</p>
          </div>
          <FilterDropdown
            id="detailMode"
            label={messages.detailDisplay}
            value={state.settings.detailMode}
            disabled={!state.settings.ready || state.settings.saving}
            options={[
              { value: 'tabs', label: messages.tabView },
              { value: 'sidebar', label: messages.rightSidebar },
            ]}
            onChange={(value) => void store.saveSetting('detailMode', value)}
          />
        </div>
      </div>
    </>
  );
}
