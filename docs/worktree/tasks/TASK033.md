---
schemaVersion: 1
id: "TASK033"
title: "Tree 보기 UI 개선"
start: "2026-10-30"
end: "2026-10-30"
createdAt: "2026-10-30T04:34:57.017Z"
updatedAt: "2026-10-30T10:46:46.378Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS009"
effort: "-"
dependencies: ["TASK008"]
priority: "high"
type: "improvement"
labels: ["Desktop"]
blockedReason: ""
references: []
---

목적: Tree 보기의 과도한 여백과 중첩 프레임을 줄여 계층과 이슈를 빠르게 읽도록 개선한다. 범위: 에픽·마일스톤 헤더를 한 줄 요약으로 구성하고 중첩 테두리 대신 들여쓰기·가이드 선을 사용한다. 이슈는 ID·우선순위·제목·유형·담당자·상태를 한 줄 중심으로 표시하고 좁은 영역에서 반응형 배치한다. 다른 보기·저장 규격은 유지한다. 완료 조건: 계층·접기/펼치기·상세 열기·필터·스크롤과 키보드 동작 유지, 사용자 화면 확인. 검증: React 통합·타입·포맷 검사·Vite 빌드. 사용자 승인 전 doing 유지.
