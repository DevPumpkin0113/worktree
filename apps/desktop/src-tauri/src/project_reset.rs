use crate::{project_files as files, project_write};
use std::path::Path;
pub use worktree_storage::project_reset::{recover, reset};
use worktree_storage::{reset_failure, ResetOperation as Op};
fn context<T, E: std::fmt::Display>(
    result: Result<T, E>,
    operation: Op,
    path: &Path,
) -> Result<T, String> {
    result.map_err(|error| reset_failure(operation, path, error))
}
#[tauri::command]
pub async fn reset_project(
    path: String,
    expected: String,
    confirmation: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = project_write::LOCK.lock().map_err(|e| e.to_string())?;
        let root = context(files::root(Path::new(&path)), Op::Inspect, Path::new(&path))?;
        reset(&root, &expected, &confirmation).map(String::from)
    })
    .await
    .map_err(|e| e.to_string())?
}
