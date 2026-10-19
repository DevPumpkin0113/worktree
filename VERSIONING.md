# 버전 관리

현재 버전: **0.3.5**

## 규칙

- MAJOR.MINOR.PATCH 형식을 사용합니다.
- 0.x 개발 단계에서 새 기능이나 사용자 흐름 변경은 MINOR를 올립니다.
- 기존 동작을 유지하는 오류 수정과 작은 시각 조정은 PATCH를 올립니다.
- 안정적인 문서 규격과 배포 기준을 확정하면 1.0.0을 검토합니다.
- 앱 버전과 WBS 문서의 schema_version은 별개입니다. 문서 호환성이 바뀌면 변경 이력에 영향과 이전 방법을 명시합니다.
- 개발 중 변경은 CHANGELOG.md의 Unreleased에 기록하고, 버전을 올릴 때 날짜와 함께 해당 버전으로 옮깁니다.

## 버전 올리기

1. CHANGELOG.md를 갱신합니다.
2. 다음 명령으로 package.json, package-lock.json, Tauri 설정, Cargo.toml과 Cargo.lock의 앱 버전을 함께 변경합니다.

```powershell
npm run version:set -- 0.2.1
npm run version:check
npm test
npm run tauri build
```

3. 이 문서의 현재 버전을 갱신합니다.
4. exe 실행 및 파일 열기·문서 전환·자동 갱신·창 제어를 확인합니다. 설치 프로그램으로 파일 연결도 확인합니다.
5. 검증이 끝나면 Git 저장소 정책에 따라 커밋과 v0.2.1 형식의 태그를 생성합니다. 버전 변경 명령은 커밋·태그·설치·공개 배포를 수행하지 않습니다.

버전의 기준은 package.json입니다. 다른 버전 필드를 개별 수정하지 말고 동기화 명령을 사용합니다.
