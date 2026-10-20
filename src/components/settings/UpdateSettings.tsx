import type { useAppInfo } from '../../hooks/use-app-info';
import { Icon } from '../shared/Icon';
export function UpdateSettings({
  app,
  settingsReady,
}: {
  app: ReturnType<typeof useAppInfo>;
  settingsReady: boolean;
}) {
  return (
    <section className="about-section" aria-labelledby="aboutUpdateTitle">
      <div className="about-section-heading">
        <h4 id="aboutUpdateTitle">업데이트</h4>
      </div>
      <div
        id="updateStatus"
        className="about-update-status"
        role="status"
        aria-live="polite"
        aria-busy={app.busy}
      >
        <span className="about-status-icon" aria-hidden="true">
          <Icon name="reload" />
        </span>
        <div>
          <strong id="updateTitle">{app.title}</strong>
          <p id="updateDescription">{app.description}</p>
        </div>
      </div>
      <progress
        id="updateProgress"
        max={100}
        value={app.progress ?? undefined}
        aria-label="업데이트 다운로드 진행률"
        hidden={app.progress === undefined}
      />
      <details id="updateNotesSection" hidden={!app.update?.notes}>
        <summary>변경 내용</summary>
        <pre id="updateNotes">{app.update?.notes}</pre>
      </details>
      <div className="about-update-actions">
        <button
          id="checkUpdates"
          type="button"
          className="about-primary-action"
          disabled={app.busy}
          onClick={() => void app.check()}
        >
          업데이트 확인
        </button>
        <button
          id="installUpdate"
          type="button"
          disabled={app.busy || app.update?.kind !== 'available'}
          onClick={() => void app.install()}
        >
          다운로드 및 설치
        </button>
        <button
          id="releasePage"
          type="button"
          hidden={app.update?.kind !== 'manual'}
          onClick={() => void app.releases()}
        >
          릴리즈 열기
        </button>
      </div>
      <label className="about-auto-check">
        <input
          id="autoCheckUpdates"
          type="checkbox"
          checked={app.auto}
          disabled={app.preferenceBusy || !settingsReady}
          onChange={(event) => void app.changeAuto(event.target.checked)}
        />
        <span>앱 시작 시 자동 확인</span>
      </label>
      <p id="updateCheckedAt" className="about-pending-note">
        {app.checkedAt}
      </p>
      <p id="updatePreferenceError" role="alert">
        {app.preferenceError}
      </p>
    </section>
  );
}
