---
schemaVersion: 1
id: "TASK005"
title: "앱 설정과 프로젝트 세션 보존"
start: "2026-10-20"
end: "2026-10-22"
createdAt: "2026-10-29T15:56:54.613Z"
updatedAt: "2026-10-31T05:54:28.073Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS001"
effort: "-"
dependencies: []
priority: "normal"
type: "feature"
labels: ["Desktop"]
blockedReason: ""
references: []
completedAt: "2026-10-21T15:00:00.000Z"
---

## 목적
로컬 프로젝트 운영을 사용할 수 있도록 앱 설정과 프로젝트 세션 보존 기능/산출물을 제공한다.

## 범위
JSON 앱 설정·최근 프로젝트·열린 프로젝트·보기·간트 단위·작업 탭을 저장·복원한다. 탭 포인터/키보드 정렬을 지원한다.

## 완료 조건
재시작 시 유효한 세션만 복원하고 손상·미지원 세션을 덮어쓰지 않는다. 작업 본문·편집 초안은 세션에 저장하지 않는다.

## 검증 방법과 근거
관련 커밋의 구현·검증 기록과 현재 제품 경계를 대조한다. 공용 core/CLI는 관련 Node 테스트·타입 검사를, 저장은 Rust 테스트를, 화면은 관련 통합 테스트와 실제 동작 확인을 사용한다. 이번 등록에서는 전체 테스트나 실제 설치 인수를 새로 실행하지 않았다.

### 관련 커밋
- 1be8da1 fix: migrate settings to JSON and personal app identifier for 0.5.1
- 2a0ef8c feat: 최근 파일과 열린 문서 세션 복원
- 6e48cbb feat: 문서 탭 순서 변경과 세션 순서 유지
- ef3bcc7 feat: 작업 상세 탭 보기와 세션 복원 지원

## 완료 처리 근거
2026-10-30 사용자 요청에 따라 기존 구현을 기능 단위로 회고 등록하고 done으로 처리했다. 개별 실제 착수·완료 날짜는 추정하지 않았으며 일정·공수는 비워 둔다. 과거 작성자나 사용자 인수 이력을 새로 만들어 기록하지 않는다. 담당자는 현재 책임 주체이며 과거 커밋 작성자를 의미하지 않는다. 제품 기준은 앱 0.33.2·CLI 0.5.0이다.
