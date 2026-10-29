# Worktree CLI

[EN](https://github.com/DevPumpkin0113/worktree/blob/main/apps/cli/README.md) | [KO](https://github.com/DevPumpkin0113/worktree/blob/main/apps/cli/README.ko.md)

프로젝트의 작업과 일정을 관리하는 명령줄 도구입니다.

Windows x64와 Node.js 24 이상이 필요합니다.

## 데스크톱 앱

설치링크(깃허브) : [@DevPumpkin0113/worktree](https://github.com/DevPumpkin0113/worktree)

## CLI 설치

```powershell
npm install --global @devpumpkin0113/worktree-cli
```

## 시작 — `init`

프로젝트 폴더에서 실행하고 안내에 따라 입력합니다.

```powershell
cd C:\projects\example
worktree init
```

프로젝트 이름, 저장 위치, ID 접두어와 작업 규칙을 설정합니다. Enter는 기본값 선택, Ctrl+C는 취소입니다. 이미 초기화한 프로젝트는 생략합니다.

## 세션 — `shell`

현재 프로젝트를 유지하며 명령을 반복 실행합니다.

```powershell
worktree shell
```

세션 안에서는 `worktree`를 생략합니다.

```text
task list
task add --title "검색 개선"
exit
```

| 명령 | 용도 |
| --- | --- |
| `use "C:\projects\other"` | 프로젝트 전환 |
| `author "Alice"` | 댓글 작성자 설정 |
| `language ko` | 한국어 안내 |
| `format json` / `format table` | 출력 형식 변경 |
| `exit` / `quit` | 종료 |

Ctrl+C는 입력을 지웁니다. 세션 설정과 기록은 종료하면 사라집니다.

## 이슈 — `task`

화면 명칭은 이슈이며 기존 `task` 명령·작업 ID·저장 파일은 유지합니다. CLI 0.6.0 개발 버전에서는 `--epic EP001`로 마일스톤 없이 에픽에 직접 배정할 수 있습니다. `--milestone MS001`과 동시에 유효한 에픽을 지정하지 않습니다. `task edit ID --milestone -`는 현재 에픽을 유지하고 직속 이슈로 옮기며, `--epic -`는 소속을 해제합니다.

예시 ID는 기본 접두어 W 기준입니다. 실제 프로젝트의 ID로 바꿔 사용하세요.

```powershell
worktree task list
worktree task show W001
worktree task add --title "검색 개선"
worktree task edit W001 --status doing
worktree task delete W001 --yes
```

자주 사용하는 옵션:

| 항목 | 예시 |
| --- | --- |
| 제목 | `--title "검색 개선"` |
| 설명 | `--description-file description.md` |
| 상태 | `--status doing` |
| 담당자 | `--owner "Alice"` |
| 마일스톤 | `--milestone MS001` |
| 시작일 | `--start 2026-10-23` |
| 종료일 | `--end 2026-10-30` |
| 우선순위 | `--priority high` |
| 작업 유형 | `--type improvement` |
| 라벨 | `--labels "frontend,api"` |

상태는 `todo`, `doing`, `blocked`, `done`입니다. 우선순위와 작업 유형은 프로젝트 설정을 따릅니다. 전체 항목은 `worktree task add --help`에서 확인합니다.

### 검색·필터

필터는 함께 사용할 수 있습니다.

```powershell
worktree task list --search "검색"
worktree task list --owner "Alice"
worktree task list --status doing
worktree task list --milestone MS001
worktree task list --type feature
worktree task list --priority high
worktree task list --label frontend
```

## 마일스톤 — `milestone`

제목과 선택 일정으로 작업을 묶습니다.

```powershell
worktree milestone list
worktree milestone show MS001
worktree milestone add --title "첫 배포"
worktree milestone edit MS001 --end 2026-10-30
worktree milestone delete MS001 --yes --children keep
```

삭제 시 `--children keep`은 작업 유지, `--children delete`는 작업도 삭제합니다. 다른 작업의 선행 참조를 해제해야 하면 `--detach`를 추가합니다. 삭제는 되돌릴 수 없습니다.

## 에픽 — `epic` (CLI 0.6.0 개발 버전)

에픽은 마일스톤을 묶는 상위 단위입니다. 기존 프로젝트는 에픽 미지정으로 읽으며 자동 변경하지 않습니다.

```powershell
worktree epic add --title "CLI 제공"
worktree epic list
worktree epic show EP001
worktree epic edit EP001 --title "터미널 작업 관리"
worktree milestone edit MS001 --epic EP001
worktree task list --epic EP001
worktree milestone edit MS001 --epic -
worktree epic delete EP001 --yes --children keep
```

생성 결과의 실제 ID를 사용합니다. 소속 이동은 ID·파일명·댓글을 바꾸지 않습니다. `--children keep`은 하위 마일스톤·작업을 유지하고 소속만 해제하며, `delete`는 자손 작업·댓글까지 삭제합니다. 외부 선행 참조를 해제하려면 `--detach` 동의가 필요합니다. 에픽 데이터를 저장한 프로젝트는 앱 0.34.0 / CLI 0.6.0 이상에서 사용합니다.

## 댓글 — `comment`

```powershell
worktree comment list W001
worktree comment add W001 --author "Alice" --text "검토 부탁드립니다."
worktree comment add W001 --author "Alice" --text "확인했습니다." --reply-to '#001'
worktree comment edit W001 '#002' --text "검토 완료했습니다."
worktree comment delete W001 '#002' --yes
```

작성자는 `--author`, 세션 작성자, 앱 표시 이름 순으로 사용합니다. 댓글 번호는 따옴표로 감쌉니다. 답글이 있는 댓글은 수정할 수 없으며, 삭제해도 답글은 유지됩니다.

## 프로젝트 — `project`

```powershell
worktree project show
worktree project edit --input settings.json
```

변경할 항목만 JSON 파일에 작성합니다. 목록은 전체를 교체합니다.

```json
{
  "name": "팀 프로젝트",
  "assignees": [
    "Alice",
    "CODEX"
  ],
  "labels": [
    "frontend",
    "api"
  ]
}
```

저장 위치·접두어·ID 순번은 변경할 수 없습니다.

## 재초기화 — `project reset`

CLI 0.5.0부터 지원합니다. 프로젝트 설정과 일정 관리 데이터를 삭제한 뒤 새로 생성합니다.

```powershell
worktree project reset
worktree init
```

삭제 범위를 확인하고 기존 프로젝트명을 정확히 입력합니다. 취소하면 삭제하지 않습니다. 데이터 저장 폴더 전체와 `worktree.json`을 삭제하며, 상위 폴더와 저장 위치 밖의 작업물은 유지합니다. 되돌릴 수 없습니다.

자동화에서는 미리 확인한 프로젝트명과 revision을 지정합니다.

```powershell
worktree project reset --dry-run --json
worktree project reset --confirm-name "프로젝트명" --yes --expect "<revision>" --json
```

삭제 후 새 설정 입력은 `init`으로 진행합니다. 기존 `init`은 덮어쓰지 않습니다.

## 확인 — `status`, `validate`, `schema`

```powershell
worktree status
worktree validate
worktree schema --json
```

| 명령 | 용도 |
| --- | --- |
| `status` | 진행 현황 |
| `validate` | 문서 오류 검사 |
| `schema` | 작업 필드와 프로젝트별 선택 값 확인 |

## 일괄 변경 — `batch`

작업·마일스톤·댓글 명령을 순서대로 처리하고 한 번에 저장합니다. 하나라도 실패하면 저장하지 않습니다. 최대 100개입니다.

```powershell
worktree batch --input batch.json --dry-run --json
worktree batch --input batch.json
```

```json
{
  "commands": [
    ["task", "add", "--title", "검색 개선"],
    ["task", "edit", "W001", "--status", "doing"]
  ]
}
```

## 복구 — `recover`

중단된 저장·초기화 기록을 확인한 뒤 복구합니다. 초기화의 삭제 단계는 남은 데이터 삭제를 완료합니다.

```powershell
worktree recover --dry-run --json
worktree recover --yes
```

## 공통 옵션

| 옵션 | 용도 |
| --- | --- |
| `--project "C:\projects\example"` | 대상 폴더 지정. 기본은 현재 폴더 |
| `--lang ko` / `--lang en` | 안내 언어. 기본은 영어 |
| `--json` | 자동화용 JSON 출력 |
| `--dry-run` | 변경 사항 미리보기 |
| `--input data.json` | JSON 파일 입력 |
| `--expect HASH` | 조회한 revision과 일치할 때만 저장 |

AI는 `--help`와 `schema --json`으로 사용법·선택 값을 확인하고, `--json`과 `--expect`로 결과와 충돌을 처리할 수 있습니다.

설명은 `--description-file`, 댓글은 `--text-file`로 UTF-8 파일을 읽습니다. 파일명 대신 `-`를 넣으면 표준입력을 읽습니다. 세션 안에서는 파일을 사용하세요.

종료 코드: `0` 성공 · `1` 조회/검증/저장 실패 · `2` 명령/입력 오류.

## 도움말

```powershell
worktree --help
worktree task add --help
worktree help comment add
worktree --version
```

[문제 제보](https://github.com/DevPumpkin0113/worktree/issues) 시 버전, 명령어, 오류와 재현 방법을 알려주세요.

## 참고·유사 프로젝트

- [Backlog.md](https://github.com/MrLesk/Backlog.md) — 문서 기반 작업 관리와 사람·AI 협업 참고.
- [Linear](https://linear.app/features) — 이슈·프로젝트 관리 서비스 비교 대상.
