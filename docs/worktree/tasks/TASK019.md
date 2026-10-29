---
schemaVersion: 1
id: "TASK019"
title: "CLI 작업 마일스톤과 댓글 변경"
start: "-"
end: "-"
createdAt: "2026-10-29T15:56:54.638Z"
updatedAt: "2026-10-29T15:56:54.638Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS005"
effort: "-"
dependencies: []
priority: "-"
type: "feature"
labels: ["CLI","Core","Storage"]
blockedReason: ""
references: []
---

## 목적
터미널 작업 관리을 사용할 수 있도록 CLI 작업 마일스톤과 댓글 변경 기능/산출물을 제공한다.

## 범위
작업·마일스톤·댓글/답글 생성·수정·확인 삭제와 dry-run·revision/expect를 구현한다.

## 완료 조건
도메인 편집 제한과 삭제 동의를 적용하고 native helper로 저장한다. 오래된 revision은 충돌로 거부한다.

## 검증 방법과 근거
관련 커밋의 구현·검증 기록과 현재 제품 경계를 대조한다. 공용 core/CLI는 관련 Node 테스트·타입 검사를, 저장은 Rust 테스트를, 화면은 관련 통합 테스트와 실제 동작 확인을 사용한다. 이번 등록에서는 전체 테스트나 실제 설치 인수를 새로 실행하지 않았다.

### 관련 커밋
- 2600af6 feat: 작업 관리 CLI와 대화형 초기화 및 일괄 저장 구현

## 완료 처리 근거
2026-10-30 사용자 요청에 따라 기존 구현을 기능 단위로 회고 등록하고 done으로 처리했다. 개별 실제 착수·완료 날짜는 추정하지 않았으며 일정·공수는 비워 둔다. 과거 작성자나 사용자 인수 이력을 새로 만들어 기록하지 않는다. 담당자는 현재 책임 주체이며 과거 커밋 작성자를 의미하지 않는다. 제품 기준은 앱 0.33.2·CLI 0.5.0이다.
