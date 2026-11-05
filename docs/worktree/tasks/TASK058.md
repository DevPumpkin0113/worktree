---
schemaVersion: 1
id: "TASK058"
title: "상세 설명 편집 영역 너비 수정"
start: "2026-11-05"
end: "2026-11-05"
createdAt: "2026-11-04T19:06:16.323Z"
updatedAt: "2026-11-04T19:09:53.527Z"
status: "done"
owner: "Codex:Main"
milestone: "MS011"
effort: "-"
dependencies: []
priority: "-"
type: "bug"
labels: ["Desktop"]
blockedReason: ""
references: []
completedAt: "2026-11-04T19:09:53.527Z"
---

TASK054 완료 후 발견된 상세 설명 너비 오류 보완. Markdown 편집기의 바깥 래퍼가 2열 그리드의 전체 열 설정을 받지 않아 본문 한 열만 차지했다. 바깥 요소에 기존 task-editor-field/task-field-description 클래스를 적용해 min-width와 grid-column 전체 폭을 복원했다. 포맷 검사 및 관련 Markdown 테스트 3개 통과. 기존 일반 텍스트·미리보기·입력 동작 유지. 사용자 확인 대기.
