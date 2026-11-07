---
schemaVersion: 1
id: "TASK061"
title: "Defender 분석 제출용 암호화 아카이브"
start: "2026-11-07"
end: "2026-11-07"
createdAt: "2026-11-07T12:06:13.443Z"
updatedAt: "2026-11-07T12:06:13.443Z"
epic: "EP004"
status: "doing"
owner: "Codex:Main"
milestone: "-"
effort: "-"
dependencies: []
priority: "-"
type: "chore"
labels: ["Release"]
blockedReason: ""
references: []
---

기존 0.36.0 설치 파일을 재빌드하거나 실행하지 않고 GitHub Actions Linux 러너에서 다운로드하여 릴리즈 SHA256과 대조한다. Microsoft 안내에 맞춰 암호 infected의 ZIP을 생성하고 암호화 및 내부 바이트 일치를 검사한 뒤 제출용 아티팩트를 제공한다. 실제 Microsoft 제출·오탐 판정 및 Authenticode 도입은 범위 밖이다.
