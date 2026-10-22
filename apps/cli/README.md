# Worktree CLI

프로젝트의 작업·마일스톤·댓글을 터미널에서 관리합니다. Node.js 24 이상을 사용하는 Windows x64를 지원합니다.

## 시작하기

저장소 루트에서 실행합니다. 쓰기 기능을 사용하려면 Rust 저장 보조 실행 파일을 먼저 빌드합니다. 개발 빌드에는 Rust 툴체인이 필요합니다.

```powershell
npm run build:cli
npm run cli -- status
npm run cli -- task list --status doing
npm run cli -- task show TASK001 --json
npm run cli -- validate
```

다른 프로젝트는 `--project "C:\projects\example"`로 지정합니다. 프로젝트 폴더 또는 루트의 `worktree.json`을 받을 수 있으며, 기본값은 현재 작업 폴더입니다. 상위 폴더를 자동 탐색하지 않습니다. 새 폴더는 아래의 init 명령으로 초기화할 수 있습니다.

## 새 프로젝트 초기화

데스크톱 앱을 열지 않고 폴더 생성부터 시작할 수 있습니다. 기존 프로젝트·데이터 폴더는 덮어쓰지 않습니다.

```powershell
$projectPath = "C:\dev-workspace-vscode\playground\app\test-project"
npm run cli -- init --project "$projectPath" --name "CLI 테스트" --prefix TASK
npm run cli -- task add --project "$projectPath" --title "첫 작업"
npm run cli -- task list --project "$projectPath"
```

또는 빈 폴더의 세션에서 바로 시작합니다.

```powershell
npm run cli -- shell --project "C:\dev-workspace-vscode\playground\app\test-project"
```

```text
init --name "CLI 테스트" --prefix TASK
task add --title "첫 작업"
task list
```

기본값은 프로젝트 이름=폴더명, 접두어=`W`, 저장 위치=`docs/worktree`, 날짜=`yyyy-MM-dd`, 시간=`24h`, ID 구분자 없음, 예상 작업 시간 사용 안 함입니다. 기본 유형 7종·색상·우선순위는 데스크톱과 동일합니다. `--name`, `--prefix`, `--directory`, `--id-separator`, `--date-format`, `--time-format`, `--use-effort`로 변경합니다. 접두어의 ASCII 소문자는 대문자로 변환합니다.

`init --dry-run`은 폴더를 생성하지 않고 검사합니다. `--input` JSON에는 name·prefix·directory·useEffort·idSeparator·dateFormat·timeFormat·taskTypes·taskTypeColors·labels·priorities·assignees를 지정할 수 있습니다. 입력 옵션이 JSON보다 우선합니다.

## 작업과 마일스톤

```powershell
npm run cli -- task add --title "검색 기능 개선" --milestone MS001
npm run cli -- task edit TASK001 --status doing --owner "박대호"
npm run cli -- task edit TASK001 --input task.json
npm run cli -- milestone list
npm run cli -- milestone show MS001
npm run cli -- milestone add --title "첫 번째 목표" --start 2026-10-22 --end 2026-10-30
npm run cli -- milestone edit MS001 --title "수정한 목표"
```

작업의 수정 가능 항목은 제목·설명·담당자·상태·마일스톤·시작/종료일·예상 작업 시간·우선순위·유형·라벨·선행 작업·막힘 사유·참조입니다. 정확한 옵션은 `--help`로 확인합니다. 마일스톤은 제목과 선택 목표 기간을 지정합니다. ID와 생성 시각은 자동 배정하며 제목을 바꿔도 ID는 유지합니다.

`--input`은 다음과 같은 JSON 파일입니다. 명령 옵션이 파일 값보다 우선합니다. `labels`·`deps`는 문자열 배열 또는 쉼표 구분 문자열을 받으며, 다른 일반 항목은 문자열을 받습니다. 빈 라벨·선행 작업·참조는 빈 배열로 지울 수 있습니다. 일정·마일스톤·우선순위·예상 작업 시간의 미지정 값은 `-`입니다.

```json
{
  "title": "검색 기능 개선",
  "description": "담당자와 제목으로 작업을 찾습니다.",
  "owner": "박대호",
  "status": "doing",
  "milestone": "MS001",
  "priority": "high",
  "type": "improvement",
  "labels": ["Front-End"],
  "deps": [],
  "references": [{ "type": "text", "value": "관련 요구사항" }]
}
```

참조 파일 경로는 프로젝트 기준 상대 경로이며 파일을 복사하거나 실행하지 않습니다. 날짜는 `YYYY-MM-DD`, 예상 작업 시간은 시간 단위 문자열입니다. 우선순위는 프로젝트에 정의된 원본 ID를 사용합니다.

## 삭제와 미리보기

```powershell
npm run cli -- task delete TASK001 --dry-run --json
npm run cli -- task delete TASK001 --yes --detach
npm run cli -- milestone delete MS001 --yes --children keep
npm run cli -- milestone delete MS001 --yes --children delete --detach
```

삭제에는 `--yes`가 필요합니다. 마일스톤에 하위 작업이 있으면 유지/삭제를 `--children keep|delete`로 명시합니다. 외부 작업의 선행 참조를 해제해야 하면 `--detach` 동의가 필요합니다. 미리보기는 삭제 대상·유지할 하위 작업·참조 해제 대상·댓글 수와 변경 파일을 반환합니다.

모든 쓰기 명령에 `--dry-run`을 붙여 파일을 바꾸지 않고 검사할 수 있습니다. 실제 삭제에는 앱과 같은 정책을 적용하며 실행 취소 기능은 제공하지 않습니다.

## 댓글과 답글

```powershell
npm run cli -- comment list TASK001
npm run cli -- comment add TASK001 --text "확인 부탁드립니다." --author "박대호"
npm run cli -- comment add TASK001 --text "확인했습니다." --author "CODEX" --reply-to '#001'
npm run cli -- comment edit TASK001 '#002' --text "수정한 의견"
npm run cli -- comment delete TASK001 '#001' --yes
```

댓글 작성자는 `--author` 또는 앱 설정의 표시 이름을 사용합니다. Git 사용자 이름은 사용하지 않습니다. 댓글은 작업별 `#001` 번호 또는 UUID로 지정하며, 셸에서 `#`가 주석으로 해석되지 않도록 따옴표로 감쌉니다.

답글은 한 단계를 유지하고 직접 답글 대상을 보존합니다. 답글이 달린 댓글은 수정할 수 없습니다. 삭제 시 원댓글은 삭제 표식으로 남기고 답글을 유지합니다. 작업을 삭제하면 해당 댓글 파일도 삭제합니다.

## 대화형 세션

```powershell
npm run cli -- shell
```

DB 콘솔처럼 명령을 반복 입력하고 조회 결과를 문자 표로 확인합니다. 프로젝트·언어·표시 방식·작성자·명령 이력은 현재 세션의 메모리에만 유지하며 재시작 시 복원하지 않습니다. 명령 오류가 발생해도 세션은 계속됩니다.

```text
worktree [worktree]> task list
worktree [worktree]> task show TASK001
worktree [worktree]> author "박대호"
worktree [worktree]> comment add TASK001 --text "세션에서 작성한 댓글"
worktree [worktree]> language en
worktree [worktree]> format json
worktree [worktree]> use "C:\projects\other-project"
worktree [other-project]> exit
```

`format table`로 표 출력으로 돌아옵니다. 경로의 역슬래시는 그대로 사용하며, 따옴표 안에서 같은 따옴표를 입력하려면 두 번 연속 작성합니다(SQL 문자열 방식). `exit`·`quit`·입력 종료로 세션을 닫습니다. Ctrl+C는 현재 입력을 취소하고 프롬프트로 돌아옵니다. 명령 기록은 파일로 저장하지 않으며 방향키로 탐색하는 전체 화면 UI는 제공하지 않습니다.

## 에이전트와 자동화

- 개별 명령의 `--json`은 성공 결과를 stdout, 오류를 stderr에 출력합니다. npm의 안내 출력을 숨기려면 `npm run --silent cli -- ... --json`을 사용합니다.
- 조회 결과의 `revision`을 쓰기 명령의 `--expect HASH`에 전달하면 이전 조회 이후의 변경을 감지합니다. 결과를 받지 못했을 때도 오래된 revision을 사용하면 중복 생성을 막을 수 있습니다. `--expect` 없는 생성 명령은 반복 실행 시 별도 항목을 생성합니다.
- 저장 직전에 네이티브 저장기가 전체 스냅샷을 다시 비교합니다. 충돌하면 초안을 덮어쓰지 않고 `CONFLICT`로 중단합니다. 임시 파일 교체·실패 복구는 데스크톱과 같은 Rust 저장 패키지를 사용합니다.
- 동일 공용 저장 모듈을 사용하는 데스크톱과 CLI 저장은 같은 사용자·임시 폴더 환경에서 OS 파일 잠금으로 조정합니다. 다른 프로젝트도 함께 직렬화하며 저장 잠금을 얻지 못하면 `STORAGE_LOCK_FAILED`로 중단합니다. 외부 편집기까지 잠그는 CAS를 보장하지 않습니다.
- 읽기에서 미완료 저장·초기화 기록을 발견하면 `RECOVERY_REQUIRED`로 중단합니다. `recover --dry-run`으로 검사 후 `recover --yes`로 복구합니다. 읽기 명령과 dry-run은 프로젝트 파일을 수정하지 않습니다. 정상 쓰기의 중간 실패는 공용 저장기가 복구합니다.
- 원본 작업 ID는 `TASK001`처럼 표시용 하이픈을 제외합니다. 상태 값은 `todo`·`doing`·`blocked`·`done`입니다. 담당자 필터는 정확히 일치하는 이름을 사용합니다.
- 종료 코드: 성공 `0`, 읽기·검증·쓰기 실패 `1`, 잘못된 명령·옵션 `2`. 문서 오류는 `file`·`field`·`line`·`value`·`reason`을 제공합니다. 첫 오류를 보고합니다.
- 파일 2,000개·합계 16MiB 제한과 경로 이탈·symlink/junction 거부를 적용합니다. 조회 전체가 외부 동시 변경에 대해 원자적인 스냅샷을 보장하지는 않습니다.

## 배포 구성

`npm run build:cli`는 `dist/main.js`와 현재 플랫폼의 `dist/worktree-store.exe`를 생성합니다. 두 파일을 함께 배치하면 저장소 소스 없이 Node.js에서 실행할 수 있습니다.

```powershell
node apps/cli/dist/main.js shell --project .
```

npm 패키지는 `dist`와 이 문서만 포함하고 `worktree` 명령을 등록하도록 구성했습니다. 빌드에 필요한 core·esbuild는 개발 의존성으로만 둡니다. 현재 npm 이름은 `@worktree/cli`이며 실제 게시 전 소유한 배포 이름을 확정해야 합니다. npm 게시·단독 CLI EXE·MCP·에이전트 스킬 설치는 이번 작업에서 수행하지 않습니다.
## 프로젝트 설정·검색·규격 조회

```powershell
npm run cli -- project show --json
npm run cli -- project edit --input settings.json --dry-run --json
npm run cli -- project edit --input settings.json --expect "조회 결과의 revision"
npm run cli -- task list --search "검색" --milestone MS001 --type feature --priority high --label api
npm run cli -- schema --json
```

`project edit`은 일부 항목만 담은 JSON을 받습니다. 이름·예상 작업 시간 사용·날짜/시간·ID 표시·유형과 색상·공통 라벨·담당자·우선순위를 수정합니다. 루트·저장 위치·접두어·번호 시퀀스는 변경할 수 없습니다. 사용 중인 유형·우선순위 제거는 거부합니다. 배열은 추가가 아닌 전체 교체이며 우선순위 배열은 높은 순서입니다.

```json
{
  "name": "팀 프로젝트",
  "useEffort": true,
  "assignees": ["박대호", "CODEX"],
  "labels": ["frontend", "api"]
}
```

목록의 `--search`는 ID·제목의 대소문자를 구분하지 않는 부분 검색입니다. 다른 필터는 원본 값의 정확한 일치이며 여러 필터는 AND로 결합합니다. `--label`은 작업 라벨 한 개의 포함 여부를 검사합니다. 미지정 마일스톤·우선순위는 `-`로 지정합니다. 결과 순서는 기존 문서 순서를 유지합니다.

`schema --json`은 프로젝트가 있어야 실행할 수 있으며 JSON Schema 표준 대신 CLI 자체 규격 안내를 반환합니다. 작업·마일스톤 필드 형식, 생성 필수 항목, 상태·유형·우선순위·마일스톤 허용값, 담당자·라벨·선행 작업 제안과 설정의 수정 가능/고정 항목을 제공합니다. 수정은 필요한 항목만 전달합니다. 모든 명령은 shell 안에서도 동일하게 사용합니다.

## 버전 관리

앱과 CLI 버전은 독립적으로 관리합니다. 앱은 `apps/desktop/package.json`, CLI는 `apps/cli/package.json`이 기준입니다.

```powershell
npm run version:set -- app 0.33.3
npm run version:set -- cli 0.1.1
npm run version:check
```

각 명령은 해당 제품의 npm·Cargo·잠금 파일을 갱신하고 앱의 경우 Tauri도 갱신합니다. 공용 내부 패키지는 제품 버전에 동기화하지 않습니다. 변경 이력은 CHANGELOG의 App/CLI Unreleased로 구분합니다. 기존 `vX.Y.Z` GitHub 릴리즈와 업데이트는 앱 전용이며 CLI의 npm 배포는 독립적으로 승인 후 진행합니다.
## 명령별 도움말

```powershell
npm run cli -- --help
npm run cli -- task --help
npm run cli -- task add --help
npm run cli -- help task add
npm run cli -- milestone delete --help --lang en
npm run cli -- project edit --help --json
```

전체 명령 → 명령 그룹 → 개별 명령으로 안내를 나눕니다. 개별 도움말에는 사용법·위치 인수·필수/선택 옵션·허용값·기본값·저장 조건·예시와 종료 코드를 표시합니다. `--help`와 `help 명령`은 프로젝트 없이 실행할 수 있고 파일을 만들거나 수정하지 않습니다. `--json`은 `{ "help": "..." }`로 반환합니다. shell 안에서도 `help task add` 또는 `task add --help`를 사용합니다. 도움말은 한국어·영어를 지원합니다. 오류 코드·필드 키는 언어에 따라 바뀌지 않으며, 운영체제·JSON/Rust 파서가 반환하는 원인 상세는 원문을 보존합니다.

기본 언어는 영어(`en`)입니다. 한국어는 `--lang ko`, shell 안에서는 `language ko`로 선택합니다. CLI 초기화 시 기본 우선순위 이름도 선택 언어를 따르며 기존 프로젝트 값과 데스크톱 앱의 언어 설정은 변경하지 않습니다. 세션에서 `help`를 입력하면 `exit / quit`을 포함한 세션 명령도 표시합니다. `exit` 또는 `quit`을 단독 입력하면 종료합니다.

## 긴 본문과 표준입력

설명은 `--description-file`, 댓글은 `--text-file`로 UTF-8 파일을 읽습니다. 같은 본문에 직접 텍스트 옵션과 파일 옵션을 함께 사용할 수 없습니다. BOM을 허용하고 입력은 16MiB까지 받으며 최종 프로젝트 용량도 검사합니다.

```powershell
worktree task edit W001 --description-file description.md
worktree comment add W001 --author Alice --text-file review.md
Get-Content -LiteralPath review.md -Raw -Encoding utf8 | worktree comment add W001 --author Alice --text-file -
Get-Content -LiteralPath task.json -Raw -Encoding utf8 | worktree task edit W001 --input -
```

`-`는 파이프에서 전달받는 표준입력입니다. `--input -`는 init·작업·마일스톤·설정·batch의 JSON 입력에서도 지원합니다. 같은 명령에서 표준입력을 두 번 읽을 수 없습니다. shell은 명령 줄 자체가 표준입력을 사용하므로 본문·JSON은 실제 파일로 지정해야 합니다. PowerShell에서 한글 파이프가 깨지면 `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`로 UTF-8 출력을 설정하세요.

## 일괄 변경

```powershell
worktree batch --input batch.json --dry-run --json
worktree batch --input batch.json --expect "이전 조회의 revision" --yes --json
```

```json
{
  "commands": [
    ["milestone", "add", "--title", "첫 목표"],
    ["task", "add", "--title", "첫 작업", "--milestone", "MS001"],
    ["task", "edit", "W001", "--status", "doing"],
    ["comment", "add", "W001", "--author", "Alice", "--text", "작업 시작"]
  ]
}
```

위 예시의 ID는 W 접두어로 초기화한 빈 프로젝트 기준입니다. 실제 ID 시퀀스는 `project show`로 확인하세요. 명령 1~100개를 순서대로 검증하며 각 단계가 유효해야 합니다. 중간 실패 시 아무 변경도 저장하지 않습니다. 실제 파일 반영은 한 번의 기존 공용 저장 트랜잭션으로 처리하며 영구 백업·전역 파일 잠금·외부 편집기에 대한 CAS는 보장하지 않습니다.

task/milestone/comment의 add/edit/delete를 지원합니다. 내부 명령은 프로젝트·언어·revision·입력 파일·본문 파일·help/버전·dry-run을 덮어쓸 수 없습니다. JSON 자체에 본문과 줄바꿈을 담으세요. 프로젝트 설정 변경과 초기화·복구는 batch 밖에서 실행합니다. 삭제는 개별 명령의 `--yes` 또는 바깥 `batch --yes`가 필요하며 선행 참조 해제·하위 처리 정책도 기존과 같습니다. 결과의 `results`에 생성 ID와 삭제 영향을 반환하고, 계획 중 실패는 JSON 오류의 0부터 시작하는 `batchIndex`로 위치를 알려줍니다.

## 중단 복구

```powershell
worktree recover --dry-run --json
worktree recover --yes --json
```

검사는 기록 유무를 보고하며 복구 성공 가능성 전체를 보장하는 미리보기는 아닙니다. 실제 복구는 `--yes`로 동의해야 합니다. 중단된 저장은 원래 스냅샷으로 되돌리며, 중단 이후 외부 변경이 있으면 내용을 보존하고 충돌로 멈춥니다. 초기화 삭제의 pending 단계는 이동한 폴더·마커를 복원하고 deleting 단계는 이미 확정한 삭제의 잔여 폴더를 제거합니다. 따라서 deleting 복구는 데이터를 되살리는 명령이 아닙니다. 링크·변조된 기록은 거부하며 임의로 삭제하지 않습니다. 복구 기록이 없는 경우에는 변경 없이 종료합니다. 버려진 기록 없는 임시 폴더를 추측해 삭제하거나 복구하지 않습니다.

## 오류 언어와 콘솔 확인

CLI 소유 오류 안내는 ko/en 리소스로 분리하고 명령 해석 전부터 언어를 적용합니다. 기계용 코드·JSON 키는 번역하지 않습니다. 운영체제/파서의 원래 오류 상세는 원문으로 유지하고 로컬 언어의 오류 안내와 함께 제공합니다. 잘못된 JSON 입력은 종료 코드 2로 분류합니다.

실제 Windows 터미널에서 프롬프트·언어 전환·도움말 줄바꿈·Ctrl+C·종료를 기술 확인합니다. 글꼴·창 너비에 따른 최종 사용감은 사용자 인수 대상입니다. 긴 명령 입력 중 Ctrl+C는 입력을 완전히 비운 뒤 프롬프트로 돌아갑니다.

### help-only 검증 후 보완 (CLI 0.3.1)

`batch --help`에 바로 파일로 저장해 실행할 수 있는 JSON 예제를 제공합니다. 조회 결과의 `revision`은 전체 프로젝트 상태를 가리키며 `--json`으로 읽은 값을 쓰기의 `--expect`에 전달합니다. 항목의 파싱·검증·계획 중 발생한 오류에는 `batchIndex`(0부터)와 `batchCommand`(1부터)를 반환하고, 일반 오류에는 `Batch command #2`처럼 표시합니다. 전체 입력 JSON이나 최종 저장 실패는 특정 항목에 귀속되지 않으므로 번호를 붙이지 않습니다.

`shell --json`에서 세션 명령 응답은 `{"ok":true,"command":"author","value":"Alice"}` 형태입니다. use의 value는 실제 대상 경로이며 exit/quit은 value 없이 응답 후 종료합니다. format 전환 응답은 전환 전 또는 전환 후가 JSON이면 JSON으로 출력합니다. 이후 출력은 선택한 형식을 따릅니다. 일반 조회 결과는 기존 JSON 형식을 유지합니다.
## 대화형 프로젝트 초기화 (CLI 0.4.0)

일반 터미널에서 아래처럼 실행하면 질문에 답하면서 설정합니다. shell 안에서는 `init`만 입력합니다.

```powershell
worktree init --project "C:\projects\new-project"
```

1. 프로젝트 이름·루트 내부 저장 위치·작업 ID 접두어 입력
2. 기본 작업 규칙 사용 또는 직접 설정 선택
3. 직접 설정 시 ID 표시, 날짜 순서·구분자, 시간 형식, 예상 시간 사용, 담당자·라벨·유형·우선순위 지정
4. 최종 경로·규칙 확인 후 생성

선택지는 번호로 고르고 Enter로 기본값을 사용합니다. Ctrl+C 또는 최종 취소를 선택하면 파일을 생성하지 않습니다. 입력 검사는 잘못된 값에서 재입력을 안내하며 최종 저장 검증과 기존 프로젝트·데이터 폴더 덮어쓰기 금지도 그대로 적용합니다. 색상은 기본 유형 팔레트를 사용하며 사용자 색상은 기존 JSON 입력으로 지정합니다.

자동화는 `--yes` 또는 `--no-interactive`로 질문을 생략합니다. `--json`, `--input FILE.json`, 비TTY 파이프 환경도 기존처럼 질문 없이 옵션·기본값을 사용합니다. `--dry-run`은 실제 생성 없이 결과를 표시합니다. CLI 언어는 기본 영어이며 `--lang ko`로 한국어 질문을 사용합니다.

```powershell
worktree init --project "C:\projects\new-project" --yes --name "New project" --prefix W
worktree init --project "C:\projects\new-project" --no-interactive --json
```
