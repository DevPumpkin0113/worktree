# 변경 이력

앱과 CLI의 공개 버전을 구분한다. 개발 중 변경은 해당 제품의 Unreleased에 기록하고 공개 시 버전·날짜로 옮긴다. 공개되지 않은 CLI 0.1~0.4.0의 개발 단계는 별도 배포 버전으로 표시하지 않는다.

- 이전 변경 이력은 Git 기록에서 확인한다. 작업 구성 기준은 [WORKTREE](docs/WORKTREE.md), 구현 작업 기록은 [프로젝트 작업판](docs/worktree/project.json)을 따른다.

## [App Unreleased]

## [CLI Unreleased]

## [CLI 0.5.0] - 2026-10-23

- project reset 추가: 전체 데이터 저장 폴더와 worktree.json 삭제 후 init으로 새 설정 생성. 부모 폴더와 저장 위치 밖 파일은 유지한다.
- 터미널·shell에서 삭제 범위와 정확한 프로젝트명 확인. 자동화는 --confirm-name·--yes 필수, --dry-run 전체 트리 검사·--expect 충돌 거부 제공.
- 공용 Rust 삭제·복구 재사용. 삭제와 재생성은 별도 단계이며 취소/실패가 삭제 데이터를 되살리지 않는다.
- README EN/KO 링크, 스킬 초기화/재초기화 지침과 명령 레퍼런스 반영.
- Trusted Publisher OIDC·provenance로 npm 게시, 공개 패키지 설치와 재초기화·재생성 검증 완료.

## [0.33.2] - 2026-10-23

- 데스크톱을 apps/desktop, 순수 규칙을 packages/core, 공용 Rust 저장·초기화·복구를 packages/storage로 분리했다. CLI는 apps/cli에서 공용 모듈을 사용한다.
- 앱·CLI 저장을 프로세스 간 OS 잠금으로 조정하고 기존 전체 스냅샷 충돌 검사·안전한 저장·복구를 유지한다.
- 루트 실행 명령·버전 검사·빌드·Windows 릴리즈 CI를 npm workspaces 구조에 맞게 수정했다. 앱과 CLI는 독립 버전으로 관리한다.

## [CLI 0.4.1] - 2026-10-23

최초 npm 공개 버전이다. 아래 기능은 이 버전에 포함된 초기 CLI 개발 단계의 누적 결과다.

- 프로젝트 생성·설정 조회/부분 수정, 작업·마일스톤·댓글/한 단계 답글 조회·생성·수정·확인 삭제.
- 검색·담당자/상태/마일스톤/유형/우선순위/라벨 필터, status·validate·프로젝트별 schema 조회.
- --json·--dry-run·revision/--expect와 공용 Rust helper 기반 저장·잠금·복구.
- UTF-8 본문/JSON 파일·stdin, 최대 100개 명령의 batch 단일 저장, recover의 검사/명시적 복구.
- DB 콘솔형 shell과 문자 표, 언어·작성자·프로젝트·출력 형식 전환·exit/quit. 상태와 이력은 메모리에만 유지한다.
- 대화형 init의 이름·저장 위치·접두어·기본/직접 작업 규칙·최종 확인. 자동화는 옵션/JSON 입력을 지원한다.
- 기본 영어와 한국어 안내, 명령별 도움말·필수/선택 옵션·기본값·예시·종료 코드. batch 오류 위치와 shell JSON 응답 통일.
- Windows x64·Node.js 24 이상용 @devpumpkin0113/worktree-cli 게시. 네이티브 저장 helper와 영문/한국어 README 포함, Trusted Publisher 연결.

## [0.33.1] - 2026-10-22

- Beta Worktree로 공개 배포. 기능 소개 README·예시 화면 9장과 시연용 프로젝트 데이터 추가.

### 초기화 오류 진단

- 프로젝트 초기화 실패 시 실패한 작업 단계·대상 경로·원본 오류를 함께 표시. 복구 실패는 최초 오류와 구분하여 안내.
- 삭제 범위와 복구 정책은 유지하며, 임시 파일 잠금으로 삭제 실패 안내와 재시도를 검증.

### 업데이트 알림
- 자동·수동 확인에서 업데이트가 있으면 설정 아이콘에 레드닷과 닫을 수 있는 안내 표시. 안내 닫기는 레드닷을 유지하고 설정 방문 시 해당 버전 알림 해제.
- 업데이트 상태를 앱에서 한 번만 관리하고 설정 화면과 공유. 알림 확인 상태는 현재 창에서만 유지하며 다운로드·설치는 기존 확인 절차 유지.
- README 초기화, 로컬 개발 문서 Git 제외, planning 문서의 docs 이전과 과거 변경 이력 아카이브 정리.
- 기존 로컬·원격 Git 태그 전체 제거. 앱 버전 표시와 GitHub 릴리즈 제목을 0.x.x는 Beta Worktree, 승인 후 1.x.x는 Release Worktree로 구분.
