import type { WorkspaceStore } from '../../app/workspace-store';
import type { WorkspaceSnapshot } from '../../app/types';
export function DisplaySettings({
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
        <h3>표시</h3>
        <p>변경하면 바로 적용되며, 앱을 다시 실행해도 유지됩니다.</p>
      </div>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <label htmlFor="idSeparator">ID 구분자</label>
            <p className="setting-description">
              작업 ID에 하이픈을 표시합니다. 원본 ID와 작업 연결은 유지됩니다.
            </p>
          </div>
          <select
            id="idSeparator"
            value={state.settings.separator}
            disabled={!state.settings.ready || state.settings.saving}
            onChange={(event) => void store.saveSetting('separator', event.target.value)}
          >
            <option value="none">없음</option>
            <option value="hyphen">하이픈 (-)</option>
          </select>
        </div>
        <p id="idPreview" className="settings-preview">
          미리보기: {store.active?.model?.idPrefix ?? 'W'}
          {state.settings.separator === 'hyphen' ? '-' : ''}001
        </p>
      </div>
      <div className="settings-card">
        <div className="setting-row">
          <div>
            <label htmlFor="detailMode">상세 정보 표시</label>
            <p className="setting-description">
              작업을 선택했을 때 상세 정보를 여는 방식을 선택합니다.
            </p>
          </div>
          <select
            id="detailMode"
            value={state.settings.detailMode}
            disabled={!state.settings.ready || state.settings.saving}
            onChange={(event) => void store.saveSetting('detailMode', event.target.value)}
          >
            <option value="modal">모달</option>
            <option value="sidebar">우측 사이드 패널</option>
          </select>
        </div>
      </div>
    </>
  );
}
