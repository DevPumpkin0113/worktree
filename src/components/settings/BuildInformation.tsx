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
          <p className="about-description">WBS 문서를 읽고 탐색하는 데스크톱 앱</p>
          <p id="appVersion" className="app-version" aria-live="polite">
            {build ? '버전 ' + build.version : '버전 확인 중'}
          </p>
        </div>
      </div>
      <div className="about-build">
        <span id="buildChannel" className="about-build-tag">
          {build ? (build.channel === 'release' ? '정식 배포' : '개발용') : '확인 중'}
        </span>
        <span>
          빌드 일시{' '}
          <span id="buildTime" className="about-build-value">
            {date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('ko-KR') : error || '—'}
          </span>
        </span>
        <span>
          커밋 <span id="buildCommit">{build?.commit ?? '—'}</span>
        </span>
        <span id="buildPlatform">{build?.platform}</span>
      </div>
    </div>
  );
}
