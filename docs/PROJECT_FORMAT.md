# 프로젝트 문서 집합 v1

Worktree 0.24.0부터 프로젝트 하나는 하나의 문서 집합이다. 기존 WBS v2와 별개인 새 규격이며 WBS 입력·자동 이전은 지원하지 않는다. 이 저장소의 과거 작업 데이터만 개발 과정에서 새 규격으로 옮겼다. 배포 템플릿은 제공하지 않으며 앱의 프로젝트 초기화로 생성한다. CLI는 미구현이다.

## 파일 구조

```text
프로젝트 루트/
├─ worktree.json
└─ docs/
   └─ worktree/
      ├─ project.json
      ├─ milestones/
      │  └─ MS001.md
      └─ tasks/
         └─ W001.md
```

루트 `worktree.json`은 `{ "dataDirectory": "docs/worktree" }` 형식이다. 저장 위치는 사용자가 지정하는 루트 기준 상대 경로다. 경로 구분자는 `/`이며 절대 경로·상위 이동·symlink/junction을 통한 외부 접근은 허용하지 않는다. 기존 데이터 폴더를 덮어쓰지 않는다. 폴더 전체를 읽어 하나의 프로젝트로 조합하며 각 파일을 별도 문서 탭으로 열지 않는다.

`project.json`은 schemaVersion(1), name, taskPrefix, useEffort, taskTypes, labels, nextTaskNumber, nextMilestoneNumber를 갖는다. 작업 프리픽스는 영문 대문자 1~20자이고 마일스톤용 MS를 제외한다. 앱에서는 초기화 후 고정이다. 기본 유형은 feature·bug·improvement·task이고 라벨은 자유롭게 추가한다. 유형 목록은 설정 파일로 확장할 수 있으나 앱에서 목록을 관리하는 기능은 후속 범위다.

## 작업 파일

파일명은 작업 ID와 정확하게 일치한다. 프리픽스 뒤 최소 세 자리 양의 정수를 붙이며 작업과 마일스톤 번호는 독립적으로 증가한다. 삭제 후에도 설정의 발급 번호를 유지한다. 외부 파일이 발급 번호보다 크면 최대 번호 다음부터 발급한다.

Markdown 파일은 `---`로 둘러싼 속성 영역과 설명 본문이다. **각 속성 값은 JSON 문법**으로 작성한다. 문자열은 큰따옴표로 감싸고 배열·객체·숫자는 JSON으로 쓴다. 일반 YAML 전체 문법은 지원하지 않는다. 속성 키는 한 번씩 쓰고 값은 한 줄에 작성하며 설명은 본문에 여러 줄로 작성한다.

```markdown
---
schemaVersion: 1
id: "W001"
title: "검색 기능 개선"
status: "todo"
owner: "박대호"
milestone: "MS001"
start: "-"
end: "-"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["검색", "ui"]
blockedReason: ""
references: [{"type":"file","value":"docs/spec.md"}]
createdAt: "2026-10-21T00:00:00.000Z"
updatedAt: "2026-10-21T00:00:00.000Z"
---

사용자가 제목으로 작업을 찾을 수 있도록 개선한다.
```

- 필수 속성: schemaVersion·id·title·createdAt·updatedAt. 설명과 참조는 선택 항목이다. 완료 기준은 별도 항목으로 두지 않는다.
- 상태: todo·doing·blocked·done. 우선순위: urgent·high·normal·low.
- 일정은 YYYY-MM-DD 시작/종료 한 쌍 또는 모두 `-`다. 공수는 양수 문자열 또는 `-`다. useEffort가 false여도 값 검증은 유지하고 표시만 숨긴다.
- milestone은 실제 마일스톤 ID 또는 `-`다. dependencies는 정확한 일반 작업 ID 배열이다. 없는 참조·마일스톤 선행·순환을 거부한다. 선행 종료일이 정해졌으면 후행 시작은 그 다음 날 이후다.
- labels는 문자열 배열이다. 프로젝트 설정의 라벨 목록은 제안 목록이고 작업에 새 라벨을 기록할 수 있다.
- blockedReason은 선택 문자열이다. 상태가 바뀌어도 기존 사유를 자동 삭제하지 않는다.
- references는 `{type: "text" | "file", value: string}` 배열이다. file 경로는 프로젝트 루트 기준 상대 경로이며 파일 존재 여부를 강제하지 않는다. 외부 자료는 text로 URL을 적는다. 원본 파일 복사·실행·자동 다운로드는 하지 않는다.
- createdAt·updatedAt은 UTC ISO 8601 시각이다. 앱은 생성 시 둘을 기록하고 수정 시 updatedAt만 갱신한다. 외부 작성자가 시각을 함께 관리한다. 저장 시 미래의 기존 수정 시각을 과거로 되돌리지 않는다.
- 알 수 없는 메타데이터는 해당 작업 수정 시 보존한다. 편집 대상 파일은 속성/본문을 다시 직렬화하고 다른 작업 파일은 변경하지 않는다.

마일스톤 `milestones/MS001.md`는 schemaVersion·id·title·선택 start/end·createdAt·updatedAt을 사용한다. 별도 작업 번호를 배정하지 않으며 UI에서 MS 번호는 숨긴다. 상태·진척도는 하위 작업에서 집계한다. 내부 모델의 group은 집계를 위한 표현일 뿐 저장 유형이 아니다.

## 저장과 복구

프로젝트별 파일의 정확한 내용과 저장 위치를 읽기 스냅샷으로 사용한다. 쓰기 직전 전체 집합이 바뀌었으면 충돌로 중단한다. 새 파일은 기존 파일을 덮어쓰지 않는 방식으로 생성한다. 앱 안의 읽기·저장은 잠금으로 직렬화하며 파일별 임시 파일 동기화 후 교체한다.

여러 파일을 바꾸는 동안 데이터 폴더의 `.worktree-transaction.json`에 이전/이후 내용을 기록한다. 실패 시 이전 파일로 복구하고, 프로세스 중단 시 다음 읽기에서 미완료 저장을 되돌린다. 중단 후 외부 변경이 있으면 이를 덮어쓰지 않고 복구 기록과 파일을 보존한 채 오류를 표시한다. 복구 기록을 임의로 삭제하지 말고 이전/이후 데이터와 실제 파일을 비교해 충돌을 해결해야 한다. 성공하면 기록을 제거한다. 실행 취소·영구 백업 기능은 아니다.

다른 프로그램의 쓰기를 운영체제 수준에서 잠그지는 않는다. 마지막 비교와 교체 사이의 외부 변경 경합 가능성은 남는다. 초기화 도중 데이터 폴더 생성 후 루트 설정 게시가 실패하면 생성한 데이터를 보존하며 자동 삭제하지 않는다.

최대 관리 파일 수는 project.json을 포함해 2,000개, 문서 집합 내용은 합계 UTF-8 16MiB다. Git에서 빈 폴더가 생략된 경우 tasks·milestones는 빈 집합으로 읽고 첫 저장 시 필요한 폴더를 생성한다. tasks·milestones의 `.md`만 읽으며 하위 폴더는 순회하지 않는다. 기타 문서는 관리 대상에 포함하지 않는다. 설정·세션은 프로젝트 본문과 별도다.
