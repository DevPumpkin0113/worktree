---
schemaVersion: 1
id: "TASK030"
title: "새로고침과 앱 아이콘 위치 정리"
start: "2026-10-30"
end: "2026-10-30"
createdAt: "2026-10-29T19:27:51.384Z"
updatedAt: "2026-10-29T20:39:01.215Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS008"
effort: "-"
dependencies: []
priority: "-"
type: "improvement"
labels: ["Desktop"]
blockedReason: ""
references: []
---

목적: 타이틀바 도구와 프로젝트 식별 위치를 정리한다. 범위: 새로고침을 검색 입력 왼쪽으로, 앱 아이콘을 프로젝트명 왼쪽으로 이동한다. 완료 조건: 새로고침·검색·프로젝트 관리·사이드바 접힘·창 제어·빈 영역 드래그 유지, 버튼과 검색 입력에서 창 드래그가 시작되지 않는다. 검증: React DOM 통합 회귀, strict 타입·포맷 검사, Vite 빌드와 사용자 개발모드 배치 확인. UI 세부 보완은 이 이슈에 포함하며 사용자 확인 전 doing 유지.

추가 합의: 사이드바 프로젝트 영역을 빈 타이틀바 공간까지 올리고 하단 가로 구분선을 제거한다. 우측 콘텐츠 헤더와 높이를 맞추던 측정/동기화는 제거한다. 마일스톤 제목은 UI 개선으로 통일하며 기존 화면·드래그·사이드바 접힘 동작을 유지한다.
