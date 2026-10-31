---
schemaVersion: 1
id: "TASK043"
title: "이슈 ID 접두어 예약어 검증 통일"
start: "2026-10-31"
end: "2026-10-31"
createdAt: "2026-10-30T17:31:53.661Z"
updatedAt: "2026-10-31T05:54:28.555Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS004"
effort: "-"
dependencies: []
priority: "normal"
type: "improvement"
labels: ["Core","CLI","Desktop"]
blockedReason: ""
references: []
completedAt: "2026-10-30T15:00:00.000Z"
---

목적: 에픽·마일스톤 ID와 이슈 ID 접두어의 혼동을 방지한다. 범위: 신규 초기화에서 EP·MS 예약어 제한을 core·앱·CLI·네이티브 경계에 적용하고 한영 안내와 CLI 도움말을 통일한다. 기존 EP 프로젝트의 읽기·번호 충돌 방지 동작은 유지한다. 검증: 타입 검사, 초기화/에픽 도메인 7개(기존 EP 호환 포함), 관련 UI 5개, CLI 초기화 7개 통과. 사용자 요청으로 TASK042에서 공통 변경을 분리하고 완료 처리한다.
