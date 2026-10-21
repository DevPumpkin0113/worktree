use std::fmt::Display;

pub const BROWSER_FAILED: &str =
    "Could not open the default browser. Report the issue through Issues in the GitHub repository.";
pub const CHECK_UPDATE_FIRST: &str = "Check for updates first.";
pub fn cleanup_failed(error: impl Display) -> String {
    format!("Could not clean up temporary update files: {error}")
}
pub const DOCUMENT_TOO_LARGE: &str = "Only document files up to 5 MB can be opened.";
pub fn install_confirm(version: impl Display) -> String {
    format!("Download and install Worktree {version}?\nThe app will close when installation starts. Restart Worktree after installation.")
}
pub const INSTALLER_FAILED: &str = "Could not start the installer. Try again.";
pub const INVALID_APP_VERSION: &str = "The current app version is invalid.";
pub const INVALID_RELEASE_VERSION: &str = "The release version is invalid.";
pub const INVALID_SESSION: &str =
    "The session file contains invalid paths, views, or tabs. The original file is preserved.";
pub const INVALID_SETTINGS: &str = "The settings file contains invalid values.";
pub fn issue_body(
    version: impl Display,
    channel: impl Display,
    commit: impl Display,
    built_at: impl Display,
    platform: impl Display,
) -> String {
    format!("## Problem\n\n\n## Steps to reproduce\n1. \n\n## Expected behavior\n\n\n## App information\n- Version: {version}\n- Build: {channel} / {commit}\n- Built at (Unix UTC): {built_at}\n- Platform: {platform}\n\nDocument contents and personal paths are not included. Check attachments for personal information before submitting.\n")
}
pub const NETWORK_FAILED: &str =
    "Could not connect to the server. Check your internet connection and try again.";
pub const RATE_LIMITED: &str = "The GitHub request limit has been reached. Try again later.";
pub const RELEASE_CHANGED: &str = "Release information has changed. Check for updates again.";
pub const RELEASE_MISMATCH: &str =
    "The release and installer information do not match. Check for updates again.";
pub const RELEASE_READ_FAILED: &str = "Could not read release information.";
pub const RELEASE_VERSION_MISSING: &str = "The release version is missing.";
pub const SELECT_WBS: &str = "Select a WBS document file.";
pub const SESSION_FOLDER_MISSING: &str = "Could not find the session folder.";
pub fn session_read_failed(error: impl Display) -> String {
    format!("Could not read the session file. The original file is preserved: {error}")
}
pub const SESSION_SAVE_TOO_LARGE: &str = "The session to save is too large.";
pub const SESSION_TOO_LARGE: &str =
    "The session file is too large. The original file is preserved.";
pub const SETTINGS_FOLDER_MISSING: &str = "Could not find the settings folder.";
pub fn settings_read_failed(error: impl Display) -> String {
    format!("Could not read the settings file: {error}")
}
pub fn settings_recovered(backup_path: impl Display) -> String {
    format!("Invalid settings were backed up to {backup_path} and defaults were restored.")
}
pub fn settings_save_failed(error: impl Display) -> String {
    format!("Could not save the settings file: {error}")
}
pub const SIGNED_UPDATE_FAILED: &str =
    "Could not check signed update information. Try again later.";
pub const STARTUP_FAILED: &str = "Could not start Worktree";
pub const UNSUPPORTED_SESSION: &str =
    "Unsupported session version. The original file is preserved.";
pub const UNSUPPORTED_SETTINGS: &str =
    "Unsupported settings file version. The file has not been changed.";
pub const UPDATE_BUSY: &str = "An update operation is already in progress.";
pub fn update_server_failed(status: impl Display) -> String {
    format!("Update server error: {status}")
}
pub const UPDATE_STATE_READ_FAILED: &str = "Could not read the update state.";
pub const UPDATE_STATE_SAVE_FAILED: &str = "Could not save the update state.";
pub const UPDATE_TITLE: &str = "Worktree update";
pub const VERIFICATION_FAILED: &str =
    "Download or signature verification failed. Nothing was installed. Try again.";

pub const PROJECT_FOLDER_REQUIRED: &str = "Select a project folder.";
pub const PROJECT_SCAN_LIMIT: &str =
    "The project scan limit was exceeded. Select a smaller folder.";
pub const OPEN_PROJECT: &str = "Open project folder";
