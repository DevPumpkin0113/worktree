---
schemaVersion: 1
id: "TASK025"
title: "CLI npm 패키징과 OIDC 게시"
start: "2026-10-23"
end: "2026-10-23"
createdAt: "2026-10-29T15:56:54.653Z"
updatedAt: "2026-10-30T09:58:51.146Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS006"
effort: "-"
dependencies: []
priority: "normal"
type: "chore"
labels: ["CLI","Build","Release"]
blockedReason: ""
references: []
---

## 목적
제품 배포와 사용 안내을 사용할 수 있도록 CLI npm 패키징과 OIDC 게시 기능/산출물을 제공한다.

## 범위
Windows x64·Node.js 24용 JS/helper 패키징과 별도 설치 검증, 수동 게시 CI·Trusted Publisher·provenance를 구성한다.

## 완료 조건
CLI 0.5.0 공개 게시·아카이브 SHA512 일치·공개 패키지 별도 설치/재초기화 검증 기록이 있다. 게시 버전은 덮어쓰지 않는다.

## 검증 방법과 근거
관련 커밋의 구현·검증 기록과 현재 제품 경계를 대조한다. 공용 core/CLI는 관련 Node 테스트·타입 검사를, 저장은 Rust 테스트를, 화면은 관련 통합 테스트와 실제 동작 확인을 사용한다. 이번 등록에서는 전체 테스트나 실제 설치 인수를 새로 실행하지 않았다.

### 관련 커밋
- f1c6320 chore: CLI npm 패키지와 검증 및 게시 CI 구성
- 9a37ea0 docs: CLI 최초 npm 게시와 원격 검증 결과 기록
- 0095d99 docs: CLI 0.5.0 OIDC 게시와 공개 설치 검증 기록

## 완료 처리 근거
2026-10-30 사용자 요청에 따라 기존 구현을 기능 단위로 회고 등록하고 done으로 처리했다. 개별 실제 착수·완료 날짜는 추정하지 않았으며 일정·공수는 비워 둔다. 과거 작성자나 사용자 인수 이력을 새로 만들어 기록하지 않는다. 담당자는 현재 책임 주체이며 과거 커밋 작성자를 의미하지 않는다. 제품 기준은 앱 0.33.2·CLI 0.5.0이다.
