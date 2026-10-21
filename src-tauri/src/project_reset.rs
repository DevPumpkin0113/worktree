use crate::{project_files as files, project_files::ProjectSource, project_write};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

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
    let text = files::read_text(&path)?;
    serde_json::from_str(&text)
        .map(Some)
        .map_err(|e| e.to_string())
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
    let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if files::is_link(&meta) {
        return Err(files::invalid());
    }
    if meta.is_dir() {
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            data_tree(&entry.map_err(|e| e.to_string())?.path(), remove)?;
        }
        if remove {
            fs::remove_dir(path).map_err(|e| e.to_string())?;
        }
    } else if meta.is_file() && !meta.permissions().readonly() {
        if remove {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    } else {
        return Err(files::invalid());
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
        fs::remove_dir(container).map_err(|e| e.to_string())?;
    }
    fs::remove_file(files::safe_join(root, JOURNAL)?).map_err(|e| e.to_string())
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
            if marker_path.exists() && files::read_text(&marker_path)? != marker {
                return Err(conflict());
            }
            if staged.exists() {
                if data.exists() {
                    return Err(conflict());
                }
                fs::create_dir_all(data.parent().ok_or_else(files::invalid)?)
                    .map_err(|e| e.to_string())?;
                fs::rename(staged, &data).map_err(|e| e.to_string())?;
            } else if !data.is_dir() {
                return Err(conflict());
            }
            if !marker_path.exists() {
                project_write::atomic(&marker_path, &marker, true)?;
            }
            if container.exists() {
                fs::remove_dir(container).map_err(|e| e.to_string())?;
            }
            fs::remove_file(files::safe_join(root, JOURNAL)?).map_err(|e| e.to_string())
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
    project_write::recover(root, &files::data_directory(root)?)?;
    if files::read(root)? != before {
        return Ok("conflict");
    }
    let data = files::safe_join(root, &before.data_directory)?;
    let marker = files::read_text(&marker_path)?;
    let value: serde_json::Value = serde_json::from_str(&marker).map_err(|e| e.to_string())?;
    if value["dataDirectory"].as_str() != Some(&before.data_directory) {
        return Ok("conflict");
    }
    if fs::metadata(&marker_path)
        .map_err(|e| e.to_string())?
        .permissions()
        .readonly()
    {
        return Err(files::invalid());
    }
    data_tree(&data, false)?;
    if files::read(root)? != before || files::read_text(&marker_path)? != marker {
        return Ok("conflict");
    }
    let temporary = tempfile::Builder::new()
        .prefix(STAGE_PREFIX)
        .tempdir_in(root)
        .map_err(|e| e.to_string())?;
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
    project_write::atomic(
        &journal_path,
        &serde_json::to_string(&pending).map_err(|e| e.to_string())?,
        true,
    )?;
    let _container = temporary.keep();
    let result = (|| {
        if files::read(root)? != before || files::read_text(&marker_path)? != marker {
            return Err(conflict());
        }
        fs::rename(
            files::safe_join(root, &before.data_directory)?,
            files::safe_join(&container, "data")?,
        )
        .map_err(|e| e.to_string())?;
        if files::read_text(&marker_path)? != marker {
            return Err(conflict());
        }
        fs::remove_file(&marker_path).map_err(|e| e.to_string())?;
        let deleting = Journal::Deleting {
            directory: before.data_directory.clone(),
            stage: stage.clone(),
        };
        project_write::atomic(
            &journal_path,
            &serde_json::to_string(&deleting).map_err(|e| e.to_string())?,
            false,
        )
    })();
    if let Err(error) = result {
        recover(root).map_err(|recovery| format!("{error}; {recovery}"))?;
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
        reset(&files::root(Path::new(&path))?, &expected, &confirmation).map(String::from)
    })
    .await
    .map_err(|e| e.to_string())?
}
