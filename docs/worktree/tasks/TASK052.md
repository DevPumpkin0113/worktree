---
schemaVersion: 1
id: "TASK052"
title: "CLI 업데이트 확인 및 설치"
start: "2026-10-31"
end: "2026-10-31"
createdAt: "2026-10-31T09:38:54.908Z"
updatedAt: "2026-11-03T10:13:06.143Z"
epic: "EP002"
status: "done"
owner: "Codex:Main"
milestone: "-"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["CLI"]
blockedReason: ""
references: []
completedAt: "2026-11-03T10:13:06.143Z"
---

새 버전 자동 알림과 명시적인 update 설치 명령을 제공한다. 하루 단위 백그라운드 확인은 기존 명령과 JSON 출력을 방해하지 않으며 실패는 무시한다. update --check는 즉시 확인하고 update는 npm 전역 설치본을 갱신한다. 버전 비교·캐시·실패·명령 동작 테스트와 문서 갱신 후 사용자 확인을 받는다.
