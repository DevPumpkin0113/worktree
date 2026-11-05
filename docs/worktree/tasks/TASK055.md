---
schemaVersion: 1
id: "TASK055"
title: "이름 있는 참조 공통 규격과 CLI 호환"
start: "2026-11-05"
end: "2026-11-05"
createdAt: "2026-11-04T18:20:06.078Z"
updatedAt: "2026-11-04T18:40:06.565Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS011"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["Core","CLI"]
blockedReason: ""
references: []
completedAt: "2026-11-04T18:40:06.565Z"
---

목적: 참조를 표시 이름과 대상 경로로 저장할 수 있게 한다. 범위: 공통 참조 타입·검증·직렬화·네이티브 저장 및 CLI schema/JSON 입력/조회 호환을 검토하고 필요한 부분 반영. 기존 type/value 참조를 계속 읽고 이름 없는 참조를 보존하며 미입력 이름의 표시 기본값은 파일명·도메인을 사용한다. 완료 조건: 기존 프로젝트 수정 없이 읽기, 앱과 CLI 왕복 저장에서 이름·대상 보존, 지원하는 웹·파일·폴더 대상 규칙 일치. 검증: 레거시 문서·CLI 부분 수정·라운드트립·잘못된 대상 검사. 참조 설명과 관련 이슈 연결은 제외한다.
