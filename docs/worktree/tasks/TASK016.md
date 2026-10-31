---
schemaVersion: 1
id: "TASK016"
title: "독립 workspace와 공통 도메인 분리"
start: "2026-10-22"
end: "2026-10-23"
createdAt: "2026-10-29T15:56:54.631Z"
updatedAt: "2026-10-31T05:54:28.215Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS004"
effort: "-"
dependencies: []
priority: "normal"
type: "chore"
labels: ["Desktop","CLI","Core","Build"]
blockedReason: ""
references: []
completedAt: "2026-10-22T15:00:00.000Z"
---

## 목적
앱 CLI 공용 개발 기반을 사용할 수 있도록 독립 workspace와 공통 도메인 분리 기능/산출물을 제공한다.

## 범위
apps/desktop·apps/cli·packages/core·packages/storage로 제품과 공통 책임을 분리하고 앱/CLI 독립 버전을 적용한다.

## 완료 조건
core는 React·Tauri·파일 I/O를 참조하지 않으며 루트 실행·타입·버전·빌드 명령이 workspace 경로를 사용한다.

## 검증 방법과 근거
관련 커밋의 구현·검증 기록과 현재 제품 경계를 대조한다. 공용 core/CLI는 관련 Node 테스트·타입 검사를, 저장은 Rust 테스트를, 화면은 관련 통합 테스트와 실제 동작 확인을 사용한다. 이번 등록에서는 전체 테스트나 실제 설치 인수를 새로 실행하지 않았다.

### 관련 커밋
- 4fa650b refactor: 데스크톱과 공통 코어를 workspace 패키지로 분리
- b37e7c5 chore: 앱과 CLI 버전 및 배포 검증 분리

## 완료 처리 근거
2026-10-30 사용자 요청에 따라 기존 구현을 기능 단위로 회고 등록하고 done으로 처리했다. 개별 실제 착수·완료 날짜는 추정하지 않았으며 일정·공수는 비워 둔다. 과거 작성자나 사용자 인수 이력을 새로 만들어 기록하지 않는다. 담당자는 현재 책임 주체이며 과거 커밋 작성자를 의미하지 않는다. 제품 기준은 앱 0.33.2·CLI 0.5.0이다.
