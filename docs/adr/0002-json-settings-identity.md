# 0002. 개인 개발자 식별자와 JSON 설정

- 결정일: 2026-10-20
- 상태: 채택

개인 GitHub 계정을 기준으로 io.github.devpumpkin0113.worktree를 사용하고 사용자 설정은 %LOCALAPPDATA%/Worktree/settings.json에 둔다. 로컬 PC 설정이므로 Roaming 대신 Local을 사용하며 식별자가 바뀌어도 설정 경로는 유지한다.

이전 localStorage를 잃지 않도록 첫 창만 기존 WebView 프로필로 실행해 JSON에 이전한다. 이후 새 프로필을 사용하며 이전 프로필은 보존한다. LevelDB 직접 파싱이나 전체 캐시 복사는 잠금·규격 의존과 불필요한 대용량 복사 때문에 제외한다. 새 저장은 원자적으로 교체하고 파일 버전·값을 검사한다.
