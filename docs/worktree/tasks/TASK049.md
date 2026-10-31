---
schemaVersion: 1
id: "TASK049"
title: "완료 시각 자동 기록과 예정 종료일 보존"
start: "2026-10-31"
end: "2026-10-31"
createdAt: "2026-10-31T05:43:04.906Z"
updatedAt: "2026-10-31T07:23:09.372Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS004"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["Core","CLI","Desktop"]
blockedReason: ""
references: []
completedAt: "2026-10-31T07:23:09.372Z"
---

목적: 계획 일정과 실제 완료 실적을 구분한다. 범위: done 전환 시 completedAt 자동 기록·재오픈 시 해제·재완료 시 새 시각 기록을 앱/CLI 공통 core에 적용한다. 종료일은 보존하고 기존 완료 이슈에 날짜를 추정해 채우지 않는다. 인사이트 기간별 완료 집계는 TASK048에 포함한다. 공용 WORKTREE 운영 규칙을 예정 종료일 보존으로 변경한다. 완료 조건: 상태 전환·기존 문서 호환·앱/CLI 검증 및 사용자 확인.
