use std::sync::atomic::{AtomicBool, Ordering};
static ENGLISH: AtomicBool = AtomicBool::new(false);
pub fn set_language(language: &str) {
    ENGLISH.store(language == "en", Ordering::Relaxed);
}
pub fn invalid_project() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        "Check the project configuration, paths, and document format."
    } else {
        "프로젝트 설정·경로 또는 문서 규격을 확인해 주세요."
    }
}
pub fn project_recovery_conflict() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        "Recovery stopped because files were edited after an interrupted save. Resolve the conflict before continuing."
    } else {
        "중단된 저장 이후 외부 변경이 발견되어 복구를 중단했습니다. 데이터를 보존하고 충돌을 확인하세요."
    }
}

mod en {
    pub const RESET_NAME_MISMATCH: &str = "The project name does not match.";

    pub const RESET_OPERATIONS: [&str; 9] = [
        "Failed to read reset file",
        "Failed to inspect reset target",
        "Failed to create reset staging directory",
        "Failed to move reset data directory",
        "Failed to delete reset file",
        "Failed to delete reset directory",
        "Failed to save reset journal",
        "Failed to restore reset data",
        "Failed to check reset project snapshot",
    ];
}

mod ko {
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
}

pub fn reset_name_mismatch() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::RESET_NAME_MISMATCH
    } else {
        ko::RESET_NAME_MISMATCH
    }
}

#[derive(Clone, Copy)]
pub enum ResetOperation {
    Read,
    Inspect,
    Create,
    Move,
    DeleteFile,
    DeleteDirectory,
    SaveJournal,
    Restore,
    Snapshot,
}
pub fn reset_failure(
    operation: ResetOperation,
    path: &std::path::Path,
    error: impl std::fmt::Display,
) -> String {
    let index = operation as usize;
    if ENGLISH.load(Ordering::Relaxed) {
        format!(
            "{}\nPath: {}\nCause: {error}",
            en::RESET_OPERATIONS[index],
            path.display()
        )
    } else {
        format!(
            "{}\n경로: {}\n원인: {error}",
            ko::RESET_OPERATIONS[index],
            path.display()
        )
    }
}
pub fn reset_recovery_failure(error: &str, recovery: &str) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        format!("{error}\n\nRecovery also failed:\n{recovery}")
    } else {
        format!("{error}\n\n복구 중에도 오류가 발생했습니다:\n{recovery}")
    }
}
