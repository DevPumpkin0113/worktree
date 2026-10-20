# 개발 및 배포 가이드

사용자 설치·실행·사용법은 [README](../README.md), 에이전트 작업 규칙은 [AGENTS](../AGENTS.md)를 참고한다. 개발 계획은 [Worktree.wbs](../planning/Worktree.wbs), 후속 후보는 [ROADMAP](../planning/ROADMAP.md)에서 관리한다.

## 개발 환경과 실행

Windows x64에서 Node.js 24, Rust stable, Visual Studio C++ 빌드 도구와 WebView2를 사용한다. 앱은 Tauri 2·Vite·JavaScript로 구성되어 있다.

```powershell
npm ci
npm run tauri dev
```

## 코드 구조

```text
index.html                화면 마크업·진입점
src/
  main.mjs                화면 상태와 이벤트 연결
  domain/                 WBS 파싱·ID 표시 규칙
  views/                  차트·작업 상세 렌더링
  styles/                 공통 및 화면별 CSS
  platform/               Tauri 창 제어
  interactions/           차트 드래그 등 입력 처리
tests/                    자동화 테스트
scripts/                  버전 동기화·검사
public/                   프런트엔드 에셋
src-tauri/                Rust·앱 설정·배포 아이콘
```

보기 아이콘은 SVG를 사용하고 생성 PNG는 참고 자료로 유지한다. WBS 배포 양식은 templates에 두며 규격 변경 시 공용 resources/templates/wbs의 원본과 함께 갱신한다.

## 검증과 빌드

```powershell
npm test
npm run version:check
npm run build
npm run tauri build
```

- 실행 파일: src-tauri/target/release/worktree.exe
- 설치 프로그램: src-tauri/target/release/bundle/nsis/
- 화면 연결 테스트는 DOM 대역을 사용하므로 실제 앱 조작 검증을 대체하지 않는다.
- 릴리즈 전 파일 열기·드롭·문서 전환·자동 갱신·창 제어·설치 후 파일 연결을 확인하고 실제 검증 여부를 기록한다.

## 브랜치 운영

작업 시작·재개 시 AGENTS.md와 관련 지침을 확인한다. 문서·작업 규칙만 변경하면 검증 후 바로 커밋할 수 있다. 기능 개발·수정·리팩터링 등 소스코드 작업은 박대호의 명시적인 커밋 지시를 기다린다. 문서와 코드가 섞인 변경은 코드의 커밋 지시를 따른다. 커밋 허가는 푸시·병합·배포의 자동 허가가 아니며 아래 예시는 해당 행위가 허용된 범위에서만 실행한다.

- main: 검증을 마친 정식 배포 기준. 직접 기능을 개발하지 않는다.
- develop: 완료한 기능을 모아 다음 목표를 확인하고 유지보수하는 상시 브랜치. main에 병합한 뒤에도 남겨 둔다.
- feat/*·fix/*·chore/*: develop에서 분기하는 작업 단위 브랜치. 구현·검증 후 develop에 병합하고 임시 브랜치는 정리한다.

기능 하나가 끝나면 develop에 모은다. 사용자가 원하는 목표에 도달하고 통합 확인을 마쳤을 때 develop을 main에 병합한다. 단순 문서 변경은 develop에 직접 커밋할 수 있다. 병합 완료 후에도 develop에서 다음 작업을 계속하며 별도 release 브랜치는 기본적으로 사용하지 않는다.

```powershell
git switch develop
git switch -c feat/task-editing
# 구현·검증·커밋 후
git switch develop
git merge --no-ff feat/task-editing
git push origin develop
```

## 버전 변경과 자동 배포

버전 결정 기준과 변경 이력 운영 규칙은 [AGENTS의 버전과 릴리즈 운영](../AGENTS.md#버전과-릴리즈-운영)을 따른다. package.json을 기준으로 동기화 명령을 사용하며 앱 버전과 WBS schema_version은 별개다.

1. develop에서 목표 기능을 통합하고 사용자 확인을 받는다.
2. CHANGELOG.md의 Unreleased 내용을 새 버전과 날짜 아래로 옮긴다.
3. 앱 버전을 동기화하고 검사·테스트·빌드 및 필요한 실제 동작 검증을 수행해 develop에 커밋한다.
4. 배포가 승인되면 develop을 main에 병합하고 main을 푸시한다. 수동으로 릴리즈 태그를 만들 필요는 없다.

```powershell
git switch develop
npm run version:set -- 0.4.1
npm run version:check
npm test
npm run tauri build
# 변경 이력·문서를 갱신하고 검증 후 커밋·사용자 확인을 마친다.
git push origin develop
git switch main
git merge --no-ff develop
git push origin main
git switch develop
```

.github/workflows/release.yml은 main 갱신 시 실행된다. GitHub의 일반 병합·스쿼시 병합 모두 main push 이벤트로 처리된다. main 직접 푸시도 같은 이벤트이므로 운영 규칙상 main 직접 개발을 금지한다.

이미 공개 Release가 있는 버전이면 빌드와 게시를 건너뛴다. 새 버전이면 테스트·버전 검사·Windows x64 NSIS 빌드가 모두 성공한 뒤, 해당 main 커밋에 vX.Y.Z 태그와 GitHub Release를 생성한다. 같은 버전의 미게시 태그가 이미 있으면 잘못된 커밋 배포를 막기 위해 실패 처리한다. API·태그 조회 실패도 배포 생략으로 숨기지 않고 실패로 표시한다.

develop·기능 브랜치 갱신이나 수동 태그 푸시는 정식 배포를 실행하지 않는다. 버전 변경 명령 자체는 커밋·병합·게시를 수행하지 않는다. 진행 상태는 저장소 Actions에서 확인한다. 게시한 태그·설치 파일은 덮어쓰지 않고 새 버전으로 수정 배포한다. 앱 내부 자동 업데이트는 별도 기능이다.
