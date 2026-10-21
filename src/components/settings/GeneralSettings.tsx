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
            <label htmlFor="idSeparator">{messages.idSeparator}</label>
            <p className="setting-description">{messages.idSeparatorHint}</p>
          </div>
          <select
            id="idSeparator"
            value={state.settings.separator}
            disabled={!state.settings.ready || state.settings.saving}
            onChange={(event) => void store.saveSetting('separator', event.target.value)}
          >
            <option value="none">{messages.none}</option>
            <option value="hyphen">{messages.hyphen}</option>
          </select>
        </div>
        <p id="idPreview" className="settings-preview">
          {messages.previewPrefix + ' '}
          {store.active?.model?.idPrefix ?? 'W'}
          {state.settings.separator === 'hyphen' ? '-' : ''}001
        </p>
      </div>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <label htmlFor="detailMode">{messages.detailDisplay}</label>
            <p className="setting-description">{messages.detailDisplayHint}</p>
          </div>
          <select
            id="detailMode"
            value={state.settings.detailMode}
            disabled={!state.settings.ready || state.settings.saving}
            onChange={(event) => void store.saveSetting('detailMode', event.target.value)}
          >
            <option value="modal">{messages.modal}</option>
            <option value="sidebar">{messages.rightSidebar}</option>
          </select>
        </div>
      </div>
    </>
  );
}
