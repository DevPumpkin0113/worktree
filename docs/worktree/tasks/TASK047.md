---
schemaVersion: 1
id: "TASK047"
title: "에픽 현황 페이지 추가"
start: "2026-11-05"
end: "2026-11-05"
createdAt: "2026-10-31T05:29:27.279Z"
updatedAt: "2026-11-04T19:31:44.213Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS002"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["Desktop","Core","CLI"]
blockedReason: ""
references: []
completedAt: "2026-11-04T19:31:44.213Z"
---

목적: 에픽별 진행 상황을 전체 폭 목록에서 비교하고 기존 상세로 연결한다. 범위: Views→Epics→Issues→Insights 메뉴, 에픽 아이콘·이름·완료/전체·진행률·목표/하위 집계 일정·차단 수 비교. 상시 우측 상세는 두지 않으며 에픽 이름 클릭 시 기존 View 상세에서 목표·마일스톤·직속 이슈를 확인한다. 에픽 목표는 문서 Markdown 본문을 사용하고 앱·CLI 수정 시 보존한다. 완료 조건: 직속/마일스톤 이슈 중복 없는 집계, 빈 에픽·일정 미정·외부 갱신 대응, 기존 상세/작성 연결, 한영 및 좁은 폭 표시. 새 계층·자동 Health 평가는 제외한다. 검증: 집계·목표 저장·페이지 상호작용 테스트와 타입/포맷/빌드.
