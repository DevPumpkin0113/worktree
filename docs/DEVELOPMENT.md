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

## 버전 변경과 자동 배포

버전 결정 기준과 변경 이력 운영 규칙은 [AGENTS의 버전과 릴리즈 운영](../AGENTS.md#버전과-릴리즈-운영)을 따른다. package.json을 기준으로 동기화 명령을 사용하며 앱 버전과 WBS schema_version은 별개다.

1. CHANGELOG.md의 Unreleased 내용을 새 버전과 날짜 아래로 옮긴다.
2. 버전을 동기화하고 검사·테스트·빌드 및 필요한 실제 동작 검증을 수행한다.
3. 프로젝트 커밋 정책과 사용자의 게시 지시에 따라 커밋·푸시한다.
4. 해당 커밋에 앱 버전과 같은 vX.Y.Z 태그를 만들어 푸시한다.

```powershell
npm run version:set -- 0.4.1
npm run version:check
npm test
npm run tauri build
# 변경 이력과 문서를 갱신하고 검증 결과를 확인한 뒤 커밋한다.
git push origin main
git tag -a v0.4.1 -m "Worktree 0.4.1"
git push origin v0.4.1
```

버전 변경 명령 자체는 커밋·태그·게시를 수행하지 않는다. 태그 푸시는 .github/workflows/release.yml을 실행하며 테스트·버전 및 태그 검사·Windows x64 NSIS 빌드가 모두 성공하면 설치 파일을 GitHub Release에 게시한다. 태그와 앱 버전이 다르면 중단된다.

진행 상태는 저장소 Actions에서 확인한다. 배포한 태그·설치 파일을 덮어쓰지 않고 새 버전으로 수정 배포한다. 앱 내부 자동 업데이트는 별도 기능이다.
