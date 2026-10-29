---
schemaVersion: 1
id: "TASK024"
title: "Windows 앱 배포와 서명 업데이트"
start: "-"
end: "-"
createdAt: "2026-10-29T15:56:54.650Z"
updatedAt: "2026-10-29T15:56:54.650Z"
status: "done"
owner: "Codex:Dev"
milestone: "MS006"
effort: "-"
dependencies: []
priority: "-"
type: "feature"
labels: ["Desktop","Build","Release"]
blockedReason: ""
references: []
---

## 목적
제품 배포와 사용 안내을 사용할 수 있도록 Windows 앱 배포와 서명 업데이트 기능/산출물을 제공한다.

## 범위
Windows 설치 릴리즈·앱 빌드 정보·서명 검증 업데이트·알림·문제 제보 진입을 제공한다. Beta/Release 표시와 앱 식별자를 유지한다.

## 완료 조건
0.33.2 릴리즈 및 서명/변조 검증 기록이 있다. 다운로드·설치는 사용자 확인 후 실행한다. 실제 설치 종합 인수 완료를 의미하지 않는다.

## 검증 방법과 근거
관련 커밋의 구현·검증 기록과 현재 제품 경계를 대조한다. 공용 core/CLI는 관련 Node 테스트·타입 검사를, 저장은 Rust 테스트를, 화면은 관련 통합 테스트와 실제 동작 확인을 사용한다. 이번 등록에서는 전체 테스트나 실제 설치 인수를 새로 실행하지 않았다.

### 관련 커밋
- e756e2d chore: automate Windows GitHub releases
- 5b0dcc0 feat: implement signed app updates and build information for 0.5.0
- 65589e1 fix: clean previous updater installers on startup for 0.5.2
- 49d2e2d feat: 업데이트 안내 팝오버와 설정 알림 표시
- 09c9823 feat: Beta 및 Release 제품 버전 표기 구분
- 04cee13 docs: Beta Worktree 0.33.2 배포 검증 결과 기록

## 완료 처리 근거
2026-10-30 사용자 요청에 따라 기존 구현을 기능 단위로 회고 등록하고 done으로 처리했다. 개별 실제 착수·완료 날짜는 추정하지 않았으며 일정·공수는 비워 둔다. 과거 작성자나 사용자 인수 이력을 새로 만들어 기록하지 않는다. 담당자는 현재 책임 주체이며 과거 커밋 작성자를 의미하지 않는다. 제품 기준은 앱 0.33.2·CLI 0.5.0이다.
