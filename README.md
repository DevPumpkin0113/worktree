# Worktree

WBS 문서를 트리·칸반·작업 네트워크·간트 차트로 확인하는 Windows 앱입니다.

## 설치 및 실행

1. [최신 릴리즈](https://github.com/DevPumpkin0113/worktree/releases/latest)에서 `Worktree_버전_x64-setup.exe`를 다운로드해 설치합니다.
2. Worktree를 실행하거나 연결된 `.wbs` 파일을 더블클릭합니다.

Windows x64와 WebView2 런타임이 필요합니다. 업데이트는 새 버전의 설치 프로그램으로 진행합니다.

## 사용 방법

- 우측 하단 **+** 버튼이나 드래그 앤 드롭으로 문서를 엽니다. 여러 문서는 하단 탭으로 전환합니다.
- 보기 아이콘으로 **트리·칸반·작업 네트워크·간트 차트**를 전환합니다.
- 검색과 상태 필터로 작업을 찾고, 작업을 선택해 상세 정보를 확인합니다.
- 작업 네트워크·간트 차트의 빈 공간을 마우스로 끌어 화면을 이동합니다.
- 우측 상단 설정에서 **상세 표시 방식**과 **ID 하이픈 표시**를 변경합니다. 변경 즉시 저장됩니다.

현재는 **읽기 전용**입니다. 외부 편집기에서 원본을 수정·저장하면 자동 갱신되며, 우측 상단 새로고침 버튼으로 다시 읽을 수도 있습니다.

## WBS 문서 준비

[템플릿](templates/template.wbs)을 복사해 **프로젝트명.wbs**로 저장하고 내용을 작성하세요. `.wbs`의 내부 내용은 `.md`와 같은 Markdown 형식이며, 정해진 WBS 양식을 따라야 합니다.

- [WBS 작성 가이드](templates/README.md)
- [예제 문서](examples/Visualization-demo.wbs)

## 변경 이력 및 문의

- [버전별 변경 이력](CHANGELOG.md)
- [오류 제보·개선 요청](https://github.com/DevPumpkin0113/worktree/issues)
