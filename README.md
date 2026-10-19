# Worktree

Markdown 기반 WBS를 시각화하는 Windows Tauri 앱입니다. 로컬 서버 없이 exe에서 문서를 읽습니다.

## WBS 문서 작성

작성 규칙은 [templates/README.md](templates/README.md), 복사용 양식은 [templates/template.wbs](templates/template.wbs)입니다. **`.wbs` 파일의 내부 내용은 `.md`와 같은 Markdown 형식**이며 일반 텍스트 편집기로 작성할 수 있습니다. 실제 작업 문서는 반드시 **프로젝트명.wbs**로 저장합니다.

1. 템플릿을 프로젝트 기획 폴더로 복사합니다. 예: `planning/MyProject.wbs`.
2. 메타데이터의 `title`, `project_id`, `updated`와 문서 제목을 수정합니다. `id_prefix`는 선택 항목이며 생략하면 `W`입니다.
3. 예시 행을 실제 작업으로 교체합니다. 표의 열 이름·순서는 유지하고 ID는 문서 안에서 고유하게 지정합니다.
4. `상위 ID`로 계층을, `선행 작업`으로 의존 관계를 연결합니다. 미정인 일정·공수는 `-`로 둡니다.
5. Worktree 우측 하단 `+` 또는 드래그 앤 드롭으로 문서를 엽니다. 파일 연결이 설정됐다면 더블클릭으로 열 수 있습니다.

```powershell
Copy-Item templates/template.wbs planning/MyProject.wbs
```

복사 대상 폴더는 먼저 만들어 주세요. 내부 내용은 Markdown이며 원본 저장 시 활성 문서가 자동 갱신됩니다.

이 템플릿은 공용 `resources/templates/wbs/template.wbs`의 프로젝트 배포용 사본입니다. 규격을 변경하면 공용 양식과 이 사본을 함께 갱신합니다. 현재 개발 계획은 [planning/Worktree.wbs](planning/Worktree.wbs)를 참고하세요.

## 개발

Node.js 20.19+ 또는 22.12+, Rust, Visual Studio C++ 빌드 도구와 WebView2가 필요합니다.

```powershell
npm install
npm run tauri dev
```

## 검증 및 배포 빌드

```powershell
npm test
npm run build
npm run tauri build
```

exe: `src-tauri/target/release/worktree.exe`

설치 프로그램: `src-tauri/target/release/bundle/nsis/`

설치 프로그램은 .wbs 파일 연결을 등록합니다. 기본 앱 선택은 Windows의 연결 프로그램 설정을 따릅니다. 개발 모드나 단독 exe 실행은 파일 연결을 등록하지 않습니다.

## 사용

- 파일 열기, 창으로 드래그 앤 드롭, exe 실행 인자로 경로 전달을 지원합니다.
- 여러 파일은 탭으로 열며 같은 경로는 기존 탭을 선택합니다. 실행 중 다시 파일을 열면 기존 창으로 전달합니다.
- 활성 문서의 변경을 1.5초 간격으로 확인합니다. 다른 탭은 선택 후 갱신하며 수동 새로고침도 가능합니다.
- .wbs의 내부 내용은 공통 양식 Markdown입니다. 기존 .md도 지원하며 .md 파일 연결은 등록하지 않습니다.
- 읽기 전용이며 원본 저장 기능은 없습니다. UTF-8, 최대 5MB 문서를 지원합니다.
- 트리·칸반·선행 관계·일정 및 상세 조회를 제공합니다. 공수와 일정 미정은 추정하지 않습니다.
- 실제 테스트 원본: C:/dev-workspace-vscode/projects/apps/obs-observe/planning/WBS.md
- 기존 실험의 파서와 화면을 이전했으며, 디자인과 자동화는 후속 개선 대상으로 둡니다.

## 창과 문서 탐색

- 기본 프레임 대신 문서 제목을 표시하는 38px 커스텀 타이틀바를 사용합니다.
- 타이틀바 드래그로 창 이동, 더블클릭으로 최대화·복원하며 오른쪽 버튼으로 최소화·최대화·닫기를 실행합니다.
- 문서 목록은 하단 36px 탭으로 표시하며 탭마다 제목과 닫기 버튼을 제공합니다. 경로는 마우스를 올려 확인할 수 있습니다.

## 버전과 변경 이력

현재 버전과 버전 올리는 절차는 [VERSIONING.md](VERSIONING.md), 변경 내역은 [CHANGELOG.md](CHANGELOG.md)를 참고하세요. `npm run version:check`로 버전 일치 여부를 검사합니다.

## ID 접두어와 표시 설정 (0.3.0)

문서 첫 YAML 블록에 선택 항목 id_prefix: OBS를 추가하면 OBS를 표시 접두어로 사용합니다. 생략 시 W입니다. 접두어는 영문 대문자만 사용합니다.

- 설정 → ID 구분자에서 없음 또는 하이픈을 선택합니다. 기본은 없음이며 모든 문서에 적용하고 localStorage에 저장합니다.
- OBS001 ↔ OBS-001처럼 표시만 바뀝니다. 원본 ID·상위 ID·선행 작업은 변경하지 않습니다.
- 문서 접두어와 같은 ID 및 기존 W ID를 읽습니다. 예: id_prefix: OBS 문서에서 OBS001, OBS-001, W001, W-001을 허용합니다.
- 다른 접두어의 ID는 오류로 안내합니다. OBS ID 문서는 id_prefix: OBS를 명시해야 합니다.
- 표시 ID가 겹치면 원본 ID를 대괄호에 병기합니다. 원본 ID가 다른 작업을 자동으로 합치지 않습니다.
- 검색은 원본·표시 ID를 모두 지원하며, 작업 상세에는 원본 ID가 표시됩니다.
- 번호를 새로 발급하거나 문서를 편집하는 기능은 포함하지 않습니다.

작업 상세와 설정 모달은 바깥 회색 배경을 클릭해 닫을 수 있습니다. 설정은 변경 즉시 적용·저장됩니다.

파일은 우측 하단 + 버튼으로 엽니다. 원본 새로고침과 설정은 타이틀바 오른쪽의 아이콘 버튼에서 실행합니다.

보기 전환·검색·상태 필터는 한 줄에 배치하고, 설정은 변경 즉시 적용·저장하며 제목행 우측 X로 닫습니다. 사용자 안내와 파일 선택 필터에는 .wbs만 표시하며 기존 .md 읽기 호환은 유지합니다.

현재 실행 중인 앱 버전은 설정 모달 하단에서 확인할 수 있습니다.
