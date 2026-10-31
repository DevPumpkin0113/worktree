---
schemaVersion: 1
id: "TASK028"
title: "에픽 계층과 기존 문서 호환 추가"
start: "2026-10-30"
end: "2026-10-30"
createdAt: "2026-10-29T17:27:21.443Z"
updatedAt: "2026-10-31T05:54:28.374Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS007"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["Desktop","CLI","Core","Storage","Docs"]
blockedReason: ""
references: []
completedAt: "2026-10-29T15:00:00.000Z"
---

목적: 에픽→마일스톤→작업으로 범위를 구분한다. 범위: EP 고정 ID와 에픽 저장·검증·집계·CLI·앱 생성/수정/배정/조회/삭제 연결. 완료 조건: 기존 에픽 없는 문서를 변경 없이 읽으며 원본 ID·파일명을 유지한다. 일반 작업 집계 중복과 참조 손상을 막는다. 검증: 도메인·CLI·React 통합·Rust 관련 테스트, 타입·포맷·버전·앱/CLI 빌드. UI는 기본 동작까지만 구현하고 상세 정리는 후속 피드백으로 보완한다. 결정: 소속 코드 기반 ID 변경은 채택하지 않는다. 기존 마일스톤/작업 ID를 유지하는 편이 외부 참조와 댓글·세션 호환을 보존하기 때문이다. 2026-10-30 사용자 승인으로 구현 착수, 자체 검증 후 사용자 확인 전 doing 유지.
