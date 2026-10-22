// Korean-only native messages. Keep behavior and file formats unchanged.
pub const BROWSER_FAILED: &str =
    "기본 브라우저를 열지 못했습니다. GitHub 저장소의 Issues에서 제보해 주세요.";

pub const CHECK_UPDATE_FIRST: &str = "업데이트를 먼저 확인하세요.";

pub fn cleanup_failed(error: impl std::fmt::Display) -> String {
    format!("이전 업데이트 임시 파일 정리 실패: {error}")
}

pub fn install_confirm(version: impl std::fmt::Display) -> String {
    format!("Worktree {version}을 다운로드하고 설치할까요?\n설치가 시작되면 앱이 종료됩니다. 설치 후 Worktree를 다시 실행해 주세요.")
}

pub const INSTALLER_FAILED: &str = "설치 프로그램을 실행하지 못했습니다. 다시 시도하세요.";

pub const INVALID_APP_VERSION: &str = "현재 앱 버전이 올바르지 않습니다.";

pub const INVALID_RELEASE_VERSION: &str = "릴리즈 버전이 올바르지 않습니다.";

pub const INVALID_SESSION: &str =
    "세션 파일의 경로·보기·탭 목록이 올바르지 않습니다. 원본은 보존합니다.";

pub const INVALID_SETTINGS: &str = "설정 파일의 값이 올바르지 않습니다.";

pub fn issue_body(
    version: impl std::fmt::Display,
    channel: impl std::fmt::Display,
    commit: impl std::fmt::Display,
    built_at: impl std::fmt::Display,
    platform: impl std::fmt::Display,
) -> String {
    format!("## 발생한 문제\n\n\n## 재현 방법\n1. \n\n## 기대한 동작\n\n\n## 앱 정보\n- 버전: {}\n- 빌드: {} / {}\n- 빌드 일시(Unix UTC): {}\n- 환경: {}\n\n문서 내용이나 개인 경로는 포함되지 않습니다. 첨부 자료의 개인정보를 확인해 주세요.\n", version, channel, commit, built_at, platform)
}

pub const NETWORK_FAILED: &str =
    "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요.";

pub const RATE_LIMITED: &str = "GitHub 조회 한도에 도달했습니다. 잠시 후 다시 시도하세요.";

pub const RELEASE_CHANGED: &str = "릴리즈 정보가 변경되었습니다. 다시 확인하세요.";

pub const RELEASE_MISMATCH: &str = "릴리즈와 설치 파일 정보가 일치하지 않습니다. 다시 확인하세요.";

pub const RELEASE_READ_FAILED: &str = "릴리즈 정보를 읽지 못했습니다.";

pub const RELEASE_VERSION_MISSING: &str = "릴리즈 버전이 없습니다.";

pub const SESSION_FOLDER_MISSING: &str = "세션 폴더를 찾지 못했습니다.";

pub fn session_read_failed(error: impl std::fmt::Display) -> String {
    format!("세션 파일을 읽지 못했습니다. 원본은 보존합니다: {error}")
}

pub const SESSION_SAVE_TOO_LARGE: &str = "저장할 세션이 너무 큽니다.";

pub const SESSION_TOO_LARGE: &str = "세션 파일이 너무 큽니다. 원본은 보존합니다.";

pub const SETTINGS_FOLDER_MISSING: &str = "설정 폴더를 찾지 못했습니다.";

pub fn settings_read_failed(error: impl std::fmt::Display) -> String {
    format!("설정 파일을 읽지 못했습니다: {error}")
}

pub fn settings_recovered(backup_path: impl std::fmt::Display) -> String {
    format!(
        "잘못된 설정을 {}에 보관하고 기본 설정으로 복구했습니다.",
        backup_path
    )
}

pub fn settings_save_failed(error: impl std::fmt::Display) -> String {
    format!("설정 파일을 저장하지 못했습니다: {}", error)
}

pub const SIGNED_UPDATE_FAILED: &str =
    "서명 업데이트 정보를 확인하지 못했습니다. 잠시 후 다시 시도하세요.";

pub const STARTUP_FAILED: &str = "Worktree 실행 실패";

pub const UNSUPPORTED_SESSION: &str = "지원하지 않는 세션 버전입니다. 원본은 보존합니다.";

pub const UNSUPPORTED_SETTINGS: &str =
    "지원하지 않는 설정 파일 버전입니다. 파일을 변경하지 않았습니다.";

pub const UPDATE_BUSY: &str = "업데이트 작업이 이미 진행 중입니다.";

pub fn update_server_failed(status: impl std::fmt::Display) -> String {
    format!("업데이트 서버 오류: {}", status)
}

pub const UPDATE_STATE_READ_FAILED: &str = "업데이트 상태를 읽지 못했습니다.";

pub const UPDATE_STATE_SAVE_FAILED: &str = "업데이트 상태를 저장하지 못했습니다.";

pub const UPDATE_TITLE: &str = "Worktree 업데이트";

pub const VERIFICATION_FAILED: &str =
    "다운로드 또는 서명 검증에 실패했습니다. 설치하지 않았습니다. 다시 시도하세요.";

pub const OPEN_PROJECT: &str = "프로젝트 폴더 열기";

pub const INVALID_PROJECT: &str = "프로젝트 설정·경로 또는 문서 규격을 확인해 주세요.";
pub const PROJECT_RECOVERY_CONFLICT: &str = "중단된 저장 이후 외부 변경이 발견되어 복구를 중단했습니다. 데이터를 보존하고 충돌을 확인하세요.";

pub const SELECT_PROJECT_PARENT: &str = "프로젝트 내부의 상위 폴더를 선택하세요.";

pub const RESET_NAME_MISMATCH: &str = "프로젝트 이름이 일치하지 않습니다.";

pub const RESET_OPERATIONS: [&str; 9] = [
    "초기화 파일 읽기 실패",
    "초기화 대상 검사 실패",
    "초기화 임시 폴더 생성 실패",
    "초기화 데이터 폴더 이동 실패",
    "초기화 파일 삭제 실패",
    "초기화 폴더 삭제 실패",
    "초기화 복구 기록 저장 실패",
    "초기화 데이터 복구 실패",
    "초기화 프로젝트 스냅샷 확인 실패",
];
