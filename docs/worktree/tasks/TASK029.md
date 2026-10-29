---
schemaVersion: 1
id: "TASK029"
title: "이슈 명칭과 에픽 직속 소속 지원"
start: "2026-10-30"
end: "2026-10-30"
createdAt: "2026-10-29T18:56:54.271Z"
updatedAt: "2026-10-29T19:23:59.785Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS007"
effort: "-"
dependencies: []
priority: "-"
type: "feature"
labels: ["Desktop","CLI","Core","Docs"]
blockedReason: ""
references: []
---

목적: Epic→Milestone→Issue 명칭을 통일하고 마일스톤 없이 에픽에 이슈를 직접 관리한다. 범위: 한글 이슈/영문 Issue 표시, 직속 에픽 소속 저장·읽기·검증·집계·앱 선택/트리/상세·CLI 연결. 완료 조건: 에픽 바로 아래 이슈 표시(가상 미지정 묶음 없음), 기존 ID·파일·참조 유지, 마일스톤 소속과 직속 에픽의 모순 방지, 삭제·이동·댓글·진행률 회귀 보존. 검증: domain/CLI/React 통합과 타입·포맷·앱/CLI 빌드. 저장의 task 명령·TASK ID·tasks 폴더·type task는 호환 유지. TASK028은 todo 대기 상태 그대로 두고 본 요청만 진행한다. 사용자 확인 후 완료 처리한다.
