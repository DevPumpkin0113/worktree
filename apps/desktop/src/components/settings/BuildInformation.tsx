import { worktreeReleaseName } from '@worktree/core/release-name';
import { messages } from '../../i18n/messages';
import type { useAppInfo } from '../../hooks/use-app-info';
export function BuildInformation({
  build,
  error,
}: {
  build: ReturnType<typeof useAppInfo>['build'];
  error: string;
}) {
  const date = build ? new Date(Number(build.builtAt) * 1000) : null;
  return (
    <div className="settings-about-card">
      <div className="about-identity">
        <img src="/worktree-icon.png" width={64} height={64} alt="" />
        <div>
          <h4>Worktree</h4>
          <p className="about-description">{messages.appDescription}</p>
          <p id="appVersion" className="app-version" aria-live="polite">
            {build ? worktreeReleaseName(build.version) : messages.loadingVersion}
          </p>
        </div>
      </div>
      <div className="about-build">
        <span id="buildChannel" className="about-build-tag">
          {build
            ? build.channel === 'release'
              ? messages.releaseBuild
              : messages.developmentBuild
            : messages.checking}
        </span>
        <span>
          {messages.buildTime}{' '}
          <span id="buildTime" className="about-build-value">
            {date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('ko-KR') : error || '—'}
          </span>
        </span>
        <span>
          {messages.commit + ' '}
          <span id="buildCommit">{build?.commit ?? '—'}</span>
        </span>
        <span id="buildPlatform">{build?.platform}</span>
      </div>
    </div>
  );
}
