<div align="center">
  <img src="public/worktree-icon.png" width="100" alt="Worktree 아이콘" />
  <h1>Worktree</h1>
  <p>작업과 일정을 한눈에 정리하는 Windows 데스크톱 앱</p>
  <p><strong>Beta Worktree 0.33.1</strong></p>
  <a href="https://github.com/DevPumpkin0113/worktree/releases">
    <img src="https://img.shields.io/badge/Windows-다운로드-167582?style=for-the-badge&logo=windows&logoColor=white" alt="Windows 버전 다운로드" />
  </a>
</div>

---

## 기능

- **다양한 보기** — 트리, 칸반, 작업 네트워크, 간트 차트, 작업 목록을 제공합니다.
- **작업 관리** — 작업과 마일스톤을 추가·수정·삭제하고 진행률을 확인합니다.
- **일정과 작업 관계** — 시작일·종료일, 예상 작업 시간, 선행·후속 작업을 관리합니다.
- **분류와 검색** — 담당자, 상태, 우선순위, 작업 유형, 라벨로 작업을 정리하고 검색·필터로 찾습니다.
- **상세 보기** — 여러 작업을 탭으로 열거나 목록 옆의 분할 패널에서 확인합니다.
- **댓글과 답글** — 앱에 설정한 표시 이름으로 작업에 대한 의견을 남깁니다.
- **프로젝트 관리** — 여러 프로젝트를 탭으로 전환하고 프로젝트별 작업 규칙을 설정합니다.
- **로컬 저장** — 프로젝트 폴더에 데이터를 저장하고 외부 변경을 반영합니다.
- **언어 설정** — 한국어와 영어를 지원합니다.

## 프로젝트에 저장되는 파일

프로젝트를 초기화하면 루트에 `worktree.json`과 지정한 위치에 데이터 폴더를 생성합니다. 기본 저장 위치는 `docs/worktree`이며 초기화할 때 변경할 수 있습니다.

```text
프로젝트/
├─ worktree.json                 # 데이터 저장 위치
└─ docs/
   └─ worktree/
      ├─ project.json            # 프로젝트 정보와 작업 규칙
      ├─ tasks/
      │  └─ W001.md              # 작업별 파일
      ├─ milestones/
      │  └─ MS001.md             # 마일스톤별 파일
      └─ comments/
         └─ W001/
            └─ <UUID>.md         # 해당 작업의 댓글별 파일
```

작업 파일 이름의 `W`는 초기화할 때 지정하는 접두어입니다. 작업·마일스톤·댓글을 추가하면 각각의 파일이 생성되며, 제목을 바꿔도 ID와 파일 이름은 유지됩니다. 비어 있는 폴더는 첫 항목을 추가할 때 생성될 수 있습니다.

파일은 텍스트로 저장되어 직접 확인하거나 Git으로 함께 관리할 수 있습니다.

## 예시 화면

Worktree 개발 내용을 바탕으로 구성한 예시입니다. 표시된 상태와 일정은 시연용입니다.

### 프로젝트 관리

프로젝트 정보와 작업 규칙을 확인하고 수정합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%20%EA%B4%80%EB%A6%AC.png" width="1000" alt="Worktree 프로젝트 관리" />
</div>

### 작업 보드 · 트리

마일스톤별로 작업을 묶어 진행 상황을 확인합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%ED%8A%B8%EB%A6%AC%EB%B3%B4%EA%B8%B0.png" width="1000" alt="Worktree 작업 보드 · 트리" />
</div>

### 작업 보드 · 칸반

상태별로 작업을 나누어 진행 흐름을 확인합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EC%B9%B8%EB%B0%98%EB%B3%B4%EA%B8%B0.png" width="1000" alt="Worktree 작업 보드 · 칸반" />
</div>

### 작업 보드 · 작업 네트워크

작업 사이의 선행·후속 관계를 확인합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EC%9E%91%EC%97%85%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC.png" width="1000" alt="Worktree 작업 보드 · 작업 네트워크" />
</div>

### 작업 보드 · 간트 차트

날짜별 작업 일정과 기간을 확인합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EA%B0%84%ED%8A%B8%EC%B0%A8%ED%8A%B8.png" width="1000" alt="Worktree 작업 보드 · 간트 차트" />
</div>

### 작업 목록

전체 작업의 주요 정보를 표로 확인하고 검색·필터로 찾습니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EC%9E%91%EC%97%85%EB%AA%A9%EB%A1%9D.png" width="1000" alt="Worktree 작업 목록" />
</div>

### 작업 상세

일정과 설명, 담당자, 우선순위, 작업 관계를 확인하고 수정합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EC%9E%91%EC%97%85%EC%83%81%EC%84%B8.png" width="1000" alt="Worktree 작업 상세" />
</div>

### 댓글과 답글

작업별 의견을 남기고 댓글 번호로 답글 대상을 확인합니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EB%8C%93%EA%B8%80.png" width="1000" alt="Worktree 댓글과 답글" />
</div>

### 인사이트

**추가 개발 필요** — 프로젝트 분석 기능은 개발 중입니다.

<div align="center">
  <img src=".github/assets/%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC-%EC%9D%B8%EC%82%AC%EC%9D%B4%ED%8A%B8.png" width="1000" alt="Worktree 인사이트" />
</div>

## 시작하기

1. 프로젝트로 사용할 폴더를 엽니다.
2. 기본 정보와 작업 규칙을 설정합니다.
3. 마일스톤과 작업을 추가해 일정을 관리합니다.

다운로드 버튼에서 공개 배포된 설치 파일을 확인할 수 있습니다.

현재 계정 로그인이나 서버를 통한 실시간 협업은 제공하지 않습니다.

## 오류 제보

오류나 개선 의견은 [GitHub Issues](https://github.com/DevPumpkin0113/worktree/issues)에 남겨 주세요. 앱 설정의 **앱 정보**에서도 문제 제보 화면을 열 수 있습니다.

사용 중인 앱 버전, 오류가 발생한 상황, 오류 메시지를 함께 알려주시면 확인에 도움이 됩니다. 화면을 첨부할 때는 개인정보와 프로젝트의 민감한 내용을 가려 주세요.
