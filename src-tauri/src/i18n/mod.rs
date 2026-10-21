mod en;
mod ko;
use std::sync::atomic::{AtomicBool, Ordering};
static ENGLISH: AtomicBool = AtomicBool::new(false);
pub fn set_language(language: &str) {
    ENGLISH.store(language == "en", Ordering::Relaxed);
}
pub fn browser_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::BROWSER_FAILED
    } else {
        ko::BROWSER_FAILED
    }
}
pub fn check_update_first() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::CHECK_UPDATE_FIRST
    } else {
        ko::CHECK_UPDATE_FIRST
    }
}
pub fn installer_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::INSTALLER_FAILED
    } else {
        ko::INSTALLER_FAILED
    }
}
pub fn invalid_app_version() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::INVALID_APP_VERSION
    } else {
        ko::INVALID_APP_VERSION
    }
}
pub fn invalid_release_version() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::INVALID_RELEASE_VERSION
    } else {
        ko::INVALID_RELEASE_VERSION
    }
}
pub fn invalid_session() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::INVALID_SESSION
    } else {
        ko::INVALID_SESSION
    }
}
pub fn invalid_settings() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::INVALID_SETTINGS
    } else {
        ko::INVALID_SETTINGS
    }
}
pub fn network_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::NETWORK_FAILED
    } else {
        ko::NETWORK_FAILED
    }
}
pub fn rate_limited() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::RATE_LIMITED
    } else {
        ko::RATE_LIMITED
    }
}
pub fn release_changed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::RELEASE_CHANGED
    } else {
        ko::RELEASE_CHANGED
    }
}
pub fn release_mismatch() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::RELEASE_MISMATCH
    } else {
        ko::RELEASE_MISMATCH
    }
}
pub fn release_read_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::RELEASE_READ_FAILED
    } else {
        ko::RELEASE_READ_FAILED
    }
}
pub fn release_version_missing() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::RELEASE_VERSION_MISSING
    } else {
        ko::RELEASE_VERSION_MISSING
    }
}
pub fn session_folder_missing() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::SESSION_FOLDER_MISSING
    } else {
        ko::SESSION_FOLDER_MISSING
    }
}
pub fn session_save_too_large() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::SESSION_SAVE_TOO_LARGE
    } else {
        ko::SESSION_SAVE_TOO_LARGE
    }
}
pub fn session_too_large() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::SESSION_TOO_LARGE
    } else {
        ko::SESSION_TOO_LARGE
    }
}
pub fn settings_folder_missing() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::SETTINGS_FOLDER_MISSING
    } else {
        ko::SETTINGS_FOLDER_MISSING
    }
}
pub fn signed_update_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::SIGNED_UPDATE_FAILED
    } else {
        ko::SIGNED_UPDATE_FAILED
    }
}
pub fn startup_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::STARTUP_FAILED
    } else {
        ko::STARTUP_FAILED
    }
}
pub fn unsupported_session() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::UNSUPPORTED_SESSION
    } else {
        ko::UNSUPPORTED_SESSION
    }
}
pub fn unsupported_settings() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::UNSUPPORTED_SETTINGS
    } else {
        ko::UNSUPPORTED_SETTINGS
    }
}
pub fn update_busy() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::UPDATE_BUSY
    } else {
        ko::UPDATE_BUSY
    }
}
pub fn update_state_read_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::UPDATE_STATE_READ_FAILED
    } else {
        ko::UPDATE_STATE_READ_FAILED
    }
}
pub fn update_state_save_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::UPDATE_STATE_SAVE_FAILED
    } else {
        ko::UPDATE_STATE_SAVE_FAILED
    }
}
pub fn update_title() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::UPDATE_TITLE
    } else {
        ko::UPDATE_TITLE
    }
}
pub fn verification_failed() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::VERIFICATION_FAILED
    } else {
        ko::VERIFICATION_FAILED
    }
}
pub fn cleanup_failed(error: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::cleanup_failed(error)
    } else {
        ko::cleanup_failed(error)
    }
}
pub fn install_confirm(version: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::install_confirm(version)
    } else {
        ko::install_confirm(version)
    }
}
pub fn issue_body(
    version: impl std::fmt::Display,
    channel: impl std::fmt::Display,
    commit: impl std::fmt::Display,
    built_at: impl std::fmt::Display,
    platform: impl std::fmt::Display,
) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::issue_body(version, channel, commit, built_at, platform)
    } else {
        ko::issue_body(version, channel, commit, built_at, platform)
    }
}
pub fn session_read_failed(error: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::session_read_failed(error)
    } else {
        ko::session_read_failed(error)
    }
}
pub fn settings_read_failed(error: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::settings_read_failed(error)
    } else {
        ko::settings_read_failed(error)
    }
}
pub fn settings_recovered(backup_path: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::settings_recovered(backup_path)
    } else {
        ko::settings_recovered(backup_path)
    }
}
pub fn settings_save_failed(error: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::settings_save_failed(error)
    } else {
        ko::settings_save_failed(error)
    }
}
pub fn update_server_failed(status: impl std::fmt::Display) -> String {
    if ENGLISH.load(Ordering::Relaxed) {
        en::update_server_failed(status)
    } else {
        ko::update_server_failed(status)
    }
}

#[cfg(test)]
mod tests {
    use super::{en, ko};
    #[test]
    fn selected_language_controls_native_messages() {
        super::set_language("en");
        assert_eq!(super::update_title(), en::UPDATE_TITLE);
        assert_eq!(
            super::install_confirm("1.2.3"),
            en::install_confirm("1.2.3")
        );
        super::set_language("ko");
        assert_eq!(super::update_title(), ko::UPDATE_TITLE);
    }
    #[test]
    fn english_native_resources_preserve_metadata_and_error_details() {
        assert!(!en::BROWSER_FAILED.is_empty());
        assert_ne!(en::BROWSER_FAILED, ko::BROWSER_FAILED);
        assert!(!en::CHECK_UPDATE_FIRST.is_empty());
        assert_ne!(en::CHECK_UPDATE_FIRST, ko::CHECK_UPDATE_FIRST);
        assert!(!en::INVALID_PROJECT.is_empty());
        assert_ne!(en::INVALID_PROJECT, ko::INVALID_PROJECT);
        assert!(!en::INSTALLER_FAILED.is_empty());
        assert_ne!(en::INSTALLER_FAILED, ko::INSTALLER_FAILED);
        assert!(!en::INVALID_APP_VERSION.is_empty());
        assert_ne!(en::INVALID_APP_VERSION, ko::INVALID_APP_VERSION);
        assert!(!en::INVALID_RELEASE_VERSION.is_empty());
        assert_ne!(en::INVALID_RELEASE_VERSION, ko::INVALID_RELEASE_VERSION);
        assert!(!en::INVALID_SESSION.is_empty());
        assert_ne!(en::INVALID_SESSION, ko::INVALID_SESSION);
        assert!(!en::INVALID_SETTINGS.is_empty());
        assert_ne!(en::INVALID_SETTINGS, ko::INVALID_SETTINGS);
        assert!(!en::NETWORK_FAILED.is_empty());
        assert_ne!(en::NETWORK_FAILED, ko::NETWORK_FAILED);
        assert!(!en::RATE_LIMITED.is_empty());
        assert_ne!(en::RATE_LIMITED, ko::RATE_LIMITED);
        assert!(!en::RELEASE_CHANGED.is_empty());
        assert_ne!(en::RELEASE_CHANGED, ko::RELEASE_CHANGED);
        assert!(!en::RELEASE_MISMATCH.is_empty());
        assert_ne!(en::RELEASE_MISMATCH, ko::RELEASE_MISMATCH);
        assert!(!en::RELEASE_READ_FAILED.is_empty());
        assert_ne!(en::RELEASE_READ_FAILED, ko::RELEASE_READ_FAILED);
        assert!(!en::RELEASE_VERSION_MISSING.is_empty());
        assert_ne!(en::RELEASE_VERSION_MISSING, ko::RELEASE_VERSION_MISSING);
        assert!(!en::PROJECT_RECOVERY_CONFLICT.is_empty());
        assert_ne!(en::PROJECT_RECOVERY_CONFLICT, ko::PROJECT_RECOVERY_CONFLICT);
        assert!(!en::SESSION_FOLDER_MISSING.is_empty());
        assert_ne!(en::SESSION_FOLDER_MISSING, ko::SESSION_FOLDER_MISSING);
        assert!(!en::SESSION_SAVE_TOO_LARGE.is_empty());
        assert_ne!(en::SESSION_SAVE_TOO_LARGE, ko::SESSION_SAVE_TOO_LARGE);
        assert!(!en::SESSION_TOO_LARGE.is_empty());
        assert_ne!(en::SESSION_TOO_LARGE, ko::SESSION_TOO_LARGE);
        assert!(!en::SETTINGS_FOLDER_MISSING.is_empty());
        assert_ne!(en::SETTINGS_FOLDER_MISSING, ko::SETTINGS_FOLDER_MISSING);
        assert!(!en::SIGNED_UPDATE_FAILED.is_empty());
        assert_ne!(en::SIGNED_UPDATE_FAILED, ko::SIGNED_UPDATE_FAILED);
        assert!(!en::STARTUP_FAILED.is_empty());
        assert_ne!(en::STARTUP_FAILED, ko::STARTUP_FAILED);
        assert!(!en::UNSUPPORTED_SESSION.is_empty());
        assert_ne!(en::UNSUPPORTED_SESSION, ko::UNSUPPORTED_SESSION);
        assert!(!en::UNSUPPORTED_SETTINGS.is_empty());
        assert_ne!(en::UNSUPPORTED_SETTINGS, ko::UNSUPPORTED_SETTINGS);
        assert!(!en::UPDATE_BUSY.is_empty());
        assert_ne!(en::UPDATE_BUSY, ko::UPDATE_BUSY);
        assert!(!en::UPDATE_STATE_READ_FAILED.is_empty());
        assert_ne!(en::UPDATE_STATE_READ_FAILED, ko::UPDATE_STATE_READ_FAILED);
        assert!(!en::UPDATE_STATE_SAVE_FAILED.is_empty());
        assert_ne!(en::UPDATE_STATE_SAVE_FAILED, ko::UPDATE_STATE_SAVE_FAILED);
        assert!(!en::UPDATE_TITLE.is_empty());
        assert_ne!(en::UPDATE_TITLE, ko::UPDATE_TITLE);
        assert!(!en::VERIFICATION_FAILED.is_empty());
        assert_ne!(en::VERIFICATION_FAILED, ko::VERIFICATION_FAILED);
        for text in [
            en::cleanup_failed("ERROR_TOKEN"),
            en::session_read_failed("ERROR_TOKEN"),
            en::settings_read_failed("ERROR_TOKEN"),
            en::settings_save_failed("ERROR_TOKEN"),
        ] {
            assert!(text.contains("ERROR_TOKEN"));
        }
        assert!(en::install_confirm("1.2.3").contains("1.2.3"));
        assert!(en::settings_recovered("BACKUP_TOKEN").contains("BACKUP_TOKEN"));
        assert!(en::update_server_failed(503).contains("503"));
        let report = en::issue_body(
            "VERSION_TOKEN",
            "CHANNEL_TOKEN",
            "COMMIT_TOKEN",
            "TIME_TOKEN",
            "PLATFORM_TOKEN",
        );
        for token in [
            "VERSION_TOKEN",
            "CHANNEL_TOKEN",
            "COMMIT_TOKEN",
            "TIME_TOKEN",
            "PLATFORM_TOKEN",
        ] {
            assert!(report.contains(token));
        }
        assert!(report.contains("## Steps to reproduce"));
    }
}

pub fn open_project() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::OPEN_PROJECT
    } else {
        ko::OPEN_PROJECT
    }
}

pub fn invalid_project() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::INVALID_PROJECT
    } else {
        ko::INVALID_PROJECT
    }
}
pub fn project_recovery_conflict() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::PROJECT_RECOVERY_CONFLICT
    } else {
        ko::PROJECT_RECOVERY_CONFLICT
    }
}

pub fn select_project_parent() -> &'static str {
    if ENGLISH.load(Ordering::Relaxed) {
        en::SELECT_PROJECT_PARENT
    } else {
        ko::SELECT_PROJECT_PARENT
    }
}
