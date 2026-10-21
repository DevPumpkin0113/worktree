use serde::Serialize;
use std::{fs, io::Write, path::Path, sync::Mutex};
const MAX_BYTES: usize = 5 * 1024 * 1024;
static WRITE_LOCK: Mutex<()> = Mutex::new(());
#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum SaveResult {
    Saved,
    Conflict,
}
fn save(path: &Path, expected: &str, text: &str) -> Result<SaveResult, String> {
    let _guard = WRITE_LOCK.lock().map_err(|e| e.to_string())?;
    let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
    if !path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ["wbs", "md", "markdown"].contains(&ext.to_lowercase().as_str()))
    {
        return Err(crate::i18n::select_wbs().into());
    }
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if !metadata.is_file()
        || metadata.len() > MAX_BYTES as u64
        || expected.len() > MAX_BYTES
        || text.len() > MAX_BYTES
    {
        return Err(crate::i18n::document_too_large().into());
    }
    if metadata.permissions().readonly() {
        return Err(crate::i18n::document_readonly().into());
    }
    if fs::read(&path).map_err(|e| e.to_string())? != expected.as_bytes() {
        return Ok(SaveResult::Conflict);
    }
    let parent = path
        .parent()
        .ok_or_else(|| crate::i18n::project_folder_required().to_string())?;
    let mut temporary = tempfile::Builder::new()
        .prefix(".worktree-save-")
        .suffix(".tmp")
        .tempfile_in(parent)
        .map_err(|e| e.to_string())?;
    temporary
        .write_all(text.as_bytes())
        .map_err(|e| e.to_string())?;
    temporary
        .as_file()
        .set_permissions(metadata.permissions())
        .map_err(|e| e.to_string())?;
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    // Check again immediately before replacement; serialize this app's concurrent saves.
    if fs::read(&path).map_err(|e| e.to_string())? != expected.as_bytes() {
        return Ok(SaveResult::Conflict);
    }
    temporary.persist(&path).map_err(|e| e.to_string())?;
    Ok(SaveResult::Saved)
}
#[tauri::command]
pub async fn save_document(
    path: String,
    expected: String,
    text: String,
) -> Result<SaveResult, String> {
    tauri::async_runtime::spawn_blocking(move || save(Path::new(&path), &expected, &text))
        .await
        .map_err(|e| e.to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_save_and_conflict_preserve_the_other_version() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("plan.wbs");
        fs::write(&path, "\u{feff}original\r\n").unwrap();
        assert_eq!(
            save(&path, "\u{feff}original\r\n", "changed\r\n").unwrap(),
            SaveResult::Saved
        );
        assert_eq!(fs::read_to_string(&path).unwrap(), "changed\r\n");
        assert_eq!(
            save(&path, "original", "stale").unwrap(),
            SaveResult::Conflict
        );
        assert_eq!(fs::read_to_string(&path).unwrap(), "changed\r\n");
        assert_eq!(fs::read_dir(folder.path()).unwrap().count(), 1);
        assert!(save(&folder.path().join("missing.wbs"), "", "new").is_err());
    }
    #[test]
    fn readonly_and_oversize_documents_are_preserved() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("plan.wbs");
        fs::write(&path, "original").unwrap();
        let original_permissions = fs::metadata(&path).unwrap().permissions();
        let mut readonly = original_permissions.clone();
        readonly.set_readonly(true);
        fs::set_permissions(&path, readonly).unwrap();
        let result = save(&path, "original", "changed");
        fs::set_permissions(&path, original_permissions).unwrap();
        assert!(result.is_err());
        assert!(save(&path, "original", &"x".repeat(MAX_BYTES + 1)).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "original");
    }
    #[cfg(windows)]
    #[test]
    fn failed_replacement_preserves_original_and_cleans_temporary_file() {
        use std::os::windows::fs::OpenOptionsExt;
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("plan.wbs");
        fs::write(&path, "original").unwrap();
        let locked = fs::OpenOptions::new()
            .read(true)
            .share_mode(1)
            .open(&path)
            .unwrap();
        assert!(save(&path, "original", "changed").is_err());
        drop(locked);
        assert_eq!(fs::read_to_string(&path).unwrap(), "original");
        assert_eq!(fs::read_dir(folder.path()).unwrap().count(), 1);
    }
}
