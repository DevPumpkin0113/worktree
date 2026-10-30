---
schemaVersion: 1
id: "TASK044"
title: "우선순위 최대 5개 공통 제한"
start: "2026-10-31"
end: "2026-10-31"
createdAt: "2026-10-30T17:31:53.679Z"
updatedAt: "2026-10-30T17:31:53.679Z"
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
---

목적: 앱과 CLI에서 동일한 우선순위 개수 정책을 적용한다. 범위: 미지정 제외 최대 5개 제한을 core 설정·초기화·네이티브 검증에 적용하고 앱 추가 버튼을 비활성화한다. 공통 오류/제한 설명과 CLI 검증을 포함한다. 붉은 제한 안내 문구와 버튼 색상 등 화면 표현 보완은 TASK042에서 관리한다. 검증: 타입 검사, 도메인 5개·관련 UI 2개·CLI 초기화 7개·Rust 경계 테스트 1개 통과. 사용자 요청으로 TASK042에서 공통 변경을 분리하고 완료 처리한다.
