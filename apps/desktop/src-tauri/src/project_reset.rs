use crate::i18n::ResetOperation as Op;
use crate::{project_files as files, project_files::ProjectSource, project_write};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

fn context<T, E: std::fmt::Display>(
    result: Result<T, E>,
    operation: Op,
    path: &Path,
) -> Result<T, String> {
    result.map_err(|error| crate::i18n::reset_failure(operation, path, error))
}
fn read_marker(path: &Path) -> Result<String, String> {
    context(files::read_text(path), Op::Read, path)
}
fn snapshot(root: &Path) -> Result<ProjectSource, String> {
    context(files::read(root), Op::Snapshot, root)
}
fn remove_journal(root: &Path) -> Result<(), String> {
    let path = files::safe_join(root, JOURNAL)?;
    context(fs::remove_file(&path), Op::DeleteFile, &path)
}
const JOURNAL: &str = ".worktree-reset.json";
const STAGE_PREFIX: &str = ".worktree-reset-data-";
#[derive(Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "camelCase", deny_unknown_fields)]
enum Journal {
    Pending {
        directory: String,
        stage: String,
        marker: String,
    },
    Deleting {
        directory: String,
        stage: String,
    },
}
fn load(root: &Path) -> Result<Option<Journal>, String> {
    let path = files::safe_join(root, JOURNAL)?;
    if !path.exists() {
        return Ok(None);
    }
    let text = read_marker(&path)?;
    context(serde_json::from_str(&text).map(Some), Op::Read, &path)
}
fn conflict() -> String {
    crate::i18n::project_recovery_conflict().into()
}
fn stage_path(root: &Path, stage: &str) -> Result<PathBuf, String> {
    let suffix = stage
        .strip_prefix(STAGE_PREFIX)
        .ok_or_else(files::invalid)?;
    if suffix.is_empty() || !suffix.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err(files::invalid());
    }
    files::safe_join(root, stage)
}
// Inspect each entry without following links; deletion is restricted to the staged data tree.
fn data_tree(path: &Path, remove: bool) -> Result<(), String> {
    let meta = context(fs::symlink_metadata(path), Op::Inspect, path)?;
    if files::is_link(&meta) {
        return context(Err(files::invalid()), Op::Inspect, path);
    }
    if meta.is_dir() {
        for entry in context(fs::read_dir(path), Op::Inspect, path)? {
            data_tree(&context(entry, Op::Inspect, path)?.path(), remove)?;
        }
        if remove {
            context(fs::remove_dir(path), Op::DeleteDirectory, path)?;
        }
    } else if meta.is_file() && !meta.permissions().readonly() {
        if remove {
            context(fs::remove_file(path), Op::DeleteFile, path)?;
        }
    } else {
        return context(Err(files::invalid()), Op::Inspect, path);
    }
    Ok(())
}
fn finish_deletion(root: &Path, stage: &str) -> Result<(), String> {
    let container = stage_path(root, stage)?;
    let data = files::safe_join(&container, "data")?;
    if data.exists() {
        data_tree(&data, true)?;
    }
    if container.exists() {
        context(fs::remove_dir(&container), Op::DeleteDirectory, &container)?;
    }
    remove_journal(root)
}
pub fn recover(root: &Path) -> Result<(), String> {
    match load(root)? {
        None => Ok(()),
        Some(Journal::Deleting { directory, stage }) => {
            files::safe_join(root, &directory)?;
            finish_deletion(root, &stage)
        }
        Some(Journal::Pending {
            directory,
            stage,
            marker,
        }) => {
            let data = files::safe_join(root, &directory)?;
            let container = stage_path(root, &stage)?;
            let staged = files::safe_join(&container, "data")?;
            let marker_path = files::safe_join(root, "worktree.json")?;
            let value: serde_json::Value =
                serde_json::from_str(&marker).map_err(|e| e.to_string())?;
            if value["dataDirectory"].as_str() != Some(&directory) {
                return Err(files::invalid());
            }
            if marker_path.exists() && read_marker(&marker_path)? != marker {
                return Err(conflict());
            }
            if staged.exists() {
                if data.exists() {
                    return Err(conflict());
                }
                context(
                    fs::create_dir_all(data.parent().ok_or_else(files::invalid)?),
                    Op::Restore,
                    &data,
                )?;
                context(fs::rename(&staged, &data), Op::Restore, &data)?;
            } else if !data.is_dir() {
                return Err(conflict());
            }
            if !marker_path.exists() {
                context(
                    project_write::atomic(&marker_path, &marker, true),
                    Op::Restore,
                    &marker_path,
                )?;
            }
            if container.exists() {
                context(fs::remove_dir(&container), Op::DeleteDirectory, &container)?;
            }
            remove_journal(root)
        }
    }
}
pub fn reset(root: &Path, expected: &str, confirmation: &str) -> Result<&'static str, String> {
    let before: ProjectSource = serde_json::from_str(expected).map_err(|e| e.to_string())?;
    files::validate_source(&before)?;
    let config: serde_json::Value =
        serde_json::from_str(&before.files["project.json"]).map_err(|e| e.to_string())?;
    if confirmation.is_empty() || config["name"].as_str() != Some(confirmation) {
        return Err(crate::i18n::reset_name_mismatch().into());
    }
    // A failed committed deletion is retried, never reconstructed from a partial folder.
    let retry = matches!(load(root)?, Some(Journal::Deleting { directory, .. }) if directory == before.data_directory);
    recover(root)?;
    let marker_path = files::safe_join(root, "worktree.json")?;
    if retry {
        return Ok(if marker_path.exists() {
            "conflict"
        } else {
            "reset"
        });
    }
    context(
        project_write::recover(
            root,
            &context(files::data_directory(root), Op::Read, &marker_path)?,
        ),
        Op::Restore,
        root,
    )?;
    if snapshot(root)? != before {
        return Ok("conflict");
    }
    let data = files::safe_join(root, &before.data_directory)?;
    let marker = read_marker(&marker_path)?;
    let value: serde_json::Value = serde_json::from_str(&marker).map_err(|e| e.to_string())?;
    if value["dataDirectory"].as_str() != Some(&before.data_directory) {
        return Ok("conflict");
    }
    if context(fs::metadata(&marker_path), Op::Inspect, &marker_path)?
        .permissions()
        .readonly()
    {
        return context(Err(files::invalid()), Op::Inspect, &marker_path);
    }
    data_tree(&data, false)?;
    if snapshot(root)? != before || read_marker(&marker_path)? != marker {
        return Ok("conflict");
    }
    let temporary = context(
        tempfile::Builder::new()
            .prefix(STAGE_PREFIX)
            .tempdir_in(root),
        Op::Create,
        root,
    )?;
    let stage = temporary
        .path()
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(files::invalid)?
        .to_string();
    let container = stage_path(root, &stage)?;
    let journal_path = files::safe_join(root, JOURNAL)?;
    let pending = Journal::Pending {
        directory: before.data_directory.clone(),
        stage: stage.clone(),
        marker: marker.clone(),
    };
    context(
        project_write::atomic(
            &journal_path,
            &serde_json::to_string(&pending).map_err(|e| e.to_string())?,
            true,
        ),
        Op::SaveJournal,
        &journal_path,
    )?;
    let _container = temporary.keep();
    let result = (|| {
        if snapshot(root)? != before || read_marker(&marker_path)? != marker {
            return Err(conflict());
        }
        let staged_data = files::safe_join(&container, "data")?;
        context(fs::rename(&data, &staged_data), Op::Move, &data)?;
        if read_marker(&marker_path)? != marker {
            return Err(conflict());
        }
        context(fs::remove_file(&marker_path), Op::DeleteFile, &marker_path)?;
        let deleting = Journal::Deleting {
            directory: before.data_directory.clone(),
            stage: stage.clone(),
        };
        context(
            project_write::atomic(
                &journal_path,
                &serde_json::to_string(&deleting).map_err(|e| e.to_string())?,
                false,
            ),
            Op::SaveJournal,
            &journal_path,
        )
    })();
    if let Err(error) = result {
        recover(root).map_err(|recovery| crate::i18n::reset_recovery_failure(&error, &recovery))?;
        return Err(error);
    }
    finish_deletion(root, &stage)?;
    Ok("reset")
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inspection_failure_identifies_the_target_and_original_error() {
        let temporary = tempfile::tempdir().unwrap();
        let missing = temporary.path().join("missing.md");
        let cause = fs::symlink_metadata(&missing).unwrap_err().to_string();
        let error = data_tree(&missing, false).unwrap_err();
        assert_eq!(
            error,
            crate::i18n::reset_failure(Op::Inspect, &missing, cause)
        );
    }

    #[test]
    fn invalid_journal_identifies_its_path_and_preserves_content() {
        let temporary = tempfile::tempdir().unwrap();
        let path = temporary.path().join(JOURNAL);
        fs::write(&path, "invalid json").unwrap();
        let error = recover(temporary.path()).unwrap_err();
        assert!(error.contains(&path.display().to_string()));
        assert!(error.contains("expected value"));
        assert_eq!(fs::read_to_string(path).unwrap(), "invalid json");
    }

    #[cfg(windows)]
    #[test]
    fn locked_file_reports_deletion_path_and_keeps_journal_for_retry() {
        use std::os::windows::fs::OpenOptionsExt;
        let temporary = tempfile::tempdir().unwrap();
        let root = temporary.path();
        let stage = ".worktree-reset-data-test";
        let data = root.join(stage).join("data");
        fs::create_dir_all(&data).unwrap();
        let path = data.join("locked.md");
        fs::write(&path, "preserve until unlocked").unwrap();
        let journal = Journal::Deleting {
            directory: "docs/worktree".into(),
            stage: stage.into(),
        };
        fs::write(root.join(JOURNAL), serde_json::to_string(&journal).unwrap()).unwrap();
        let held = fs::OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(&path)
            .unwrap();
        let error = recover(root).unwrap_err();
        let cause = fs::remove_file(&path).unwrap_err().to_string();
        assert_eq!(
            error,
            crate::i18n::reset_failure(Op::DeleteFile, &path, cause)
        );
        assert!(root.join(JOURNAL).exists());
        assert!(path.exists());
        drop(held);
        assert_eq!(
            fs::read_to_string(&path).unwrap(),
            "preserve until unlocked"
        );
        recover(root).unwrap();
        assert!(!root.join(stage).exists());
        assert!(!root.join(JOURNAL).exists());
    }
}
