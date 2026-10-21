use crate::{project_files as files, project_write};
use serde::Serialize;
use std::{fs, path::Path};
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFiles {
    path: String,
    files: Vec<String>,
    selected_path: Option<String>,
}
fn scan(path: &Path) -> Result<ProjectFiles, String> {
    let root = files::root(path)?;
    let marker = files::safe_join(&root, "worktree.json")?;
    let selected = marker.exists().then(|| files::display(&marker));
    Ok(ProjectFiles {
        path: files::display(&root),
        files: selected.clone().into_iter().collect(),
        selected_path: selected,
    })
}
#[tauri::command]
pub async fn scan_project(path: String) -> Result<ProjectFiles, String> {
    tauri::async_runtime::spawn_blocking(move || scan(Path::new(&path)))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn read_project(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = project_write::LOCK.lock().map_err(|e| e.to_string())?;
        let root = files::root(Path::new(&path))?;
        project_write::recover(&root, &files::data_directory(&root)?)?;
        serde_json::to_string(&files::read(&root)?).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn save_project(path: String, expected: String, text: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = project_write::LOCK.lock().map_err(|e| e.to_string())?;
        project_write::save(&files::root(Path::new(&path))?, &expected, &text).map(String::from)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn initialize_project(
    path: String,
    name: String,
    data_directory: String,
    task_prefix: String,
    use_effort: bool,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        initialize(
            Path::new(&path),
            &name,
            &data_directory,
            &task_prefix,
            use_effort,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
fn initialize(
    root: &Path,
    name: &str,
    directory: &str,
    prefix: &str,
    use_effort: bool,
) -> Result<(), String> {
    let _guard = project_write::LOCK.lock().map_err(|e| e.to_string())?;
    let root = files::root(root)?;
    let marker = files::safe_join(&root, "worktree.json")?;
    let data = files::safe_join(&root, directory)?;
    if marker.exists()
        || data.exists()
        || name.trim().is_empty()
        || name.len() > 200
        || name.contains(['\r', '\n', '\0'])
        || prefix.is_empty()
        || prefix.len() > 20
        || prefix == "MS"
        || !prefix.chars().all(|c| c.is_ascii_uppercase())
    {
        return Err(files::invalid());
    }
    // Build a complete data directory beside its destination, publish the root marker last.
    let parent = data.parent().ok_or_else(files::invalid)?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let stage = tempfile::Builder::new()
        .prefix(".worktree-init-")
        .tempdir_in(parent)
        .map_err(|e| e.to_string())?;
    for folder in ["tasks", "milestones"] {
        fs::create_dir(stage.path().join(folder)).map_err(|e| e.to_string())?;
    }
    let config = serde_json::json!({"schemaVersion":1,"name":name.trim(),"taskPrefix":prefix,"useEffort":use_effort,"taskTypes":["feature","bug","improvement","task"],"labels":[],"nextTaskNumber":1,"nextMilestoneNumber":1});
    project_write::atomic(
        &stage.path().join("project.json"),
        &(serde_json::to_string_pretty(&config).map_err(|e| e.to_string())? + "\n"),
        true,
    )?;
    fs::rename(stage.path(), &data).map_err(|e| e.to_string())?;
    let marker_text = serde_json::to_string_pretty(&serde_json::json!({"dataDirectory":directory}))
        .map_err(|e| e.to_string())?
        + "\n";
    // If publication fails, retain the newly created data for inspection; no existing data is removed.
    project_write::atomic(&marker, &marker_text, true)
}
#[tauri::command]
pub async fn pick_project() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title(crate::i18n::open_project())
            .pick_folder()
            .map(|p| p.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| e.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn initialized(directory: &str, prefix: &str) -> tempfile::TempDir {
        let temp = tempfile::tempdir().unwrap();
        initialize(temp.path(), "Sample", directory, prefix, false).unwrap();
        temp
    }
    #[test]
    fn initialization_custom_directory_and_prefix_roundtrip() {
        let temp = initialized("docs/custom", "DEV");
        let source = files::read(temp.path()).unwrap();
        assert_eq!(source.data_directory, "docs/custom");
        let config: serde_json::Value =
            serde_json::from_str(&source.files["project.json"]).unwrap();
        assert_eq!(config["taskPrefix"], "DEV");
        assert_eq!(source.files.len(), 1);
        assert!(temp.path().join("docs/custom/tasks").is_dir());
        let project = scan(temp.path()).unwrap();
        assert_eq!(project.files.len(), 1);
        assert!(project.files[0].ends_with("worktree.json"));
        assert_eq!(
            scan(&temp.path().join("worktree.json")).unwrap().path,
            project.path
        );
    }
    #[test]
    fn empty_task_directories_can_be_absent_after_git_checkout() {
        let temp = initialized("docs/worktree", "W");
        let data = temp.path().join("docs/worktree");
        fs::remove_dir(data.join("tasks")).unwrap();
        fs::remove_dir(data.join("milestones")).unwrap();
        let before = files::read(temp.path()).unwrap();
        assert_eq!(before.files.len(), 1);
        let mut after = before.clone();
        after
            .files
            .insert("tasks/W001.md".into(), "new task".into());
        project_write::save(
            temp.path(),
            &serde_json::to_string(&before).unwrap(),
            &serde_json::to_string(&after).unwrap(),
        )
        .unwrap();
        assert_eq!(files::read(temp.path()).unwrap(), after);
    }
    #[test]
    fn initialization_never_overwrites_existing_or_orphaned_data() {
        let temp = initialized("docs/worktree", "W");
        let original = files::read(temp.path()).unwrap();
        assert!(initialize(temp.path(), "Other", "docs/other", "ABC", true).is_err());
        assert_eq!(files::read(temp.path()).unwrap(), original);
        fs::remove_file(temp.path().join("worktree.json")).unwrap();
        assert!(initialize(temp.path(), "Other", "docs/worktree", "ABC", true).is_err());
        assert_eq!(
            fs::read_to_string(temp.path().join("docs/worktree/project.json")).unwrap(),
            original.files["project.json"]
        );
    }
    #[test]
    fn rejects_escape_paths_invalid_prefix_and_old_wbs_inputs() {
        let temp = tempfile::tempdir().unwrap();
        for path in [
            "../outside",
            "/absolute",
            "C:/outside",
            "docs/../../outside",
            "docs\\other",
            "",
        ] {
            assert!(
                initialize(temp.path(), "Sample", path, "W", false).is_err(),
                "{path}"
            );
        }
        for prefix in ["MS", "w", "W-", "", "A1"] {
            assert!(initialize(temp.path(), "Sample", "docs/worktree", prefix, false).is_err());
        }
        fs::write(temp.path().join("old.wbs"), "old").unwrap();
        assert!(scan(&temp.path().join("old.wbs")).is_err());
        assert!(scan(temp.path()).unwrap().files.is_empty());
    }
    #[cfg(windows)]
    #[test]
    fn data_directory_junction_is_not_followed() {
        let temp = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let link = temp.path().join("linked");
        let result = std::process::Command::new("cmd.exe")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(outside.path())
            .output()
            .unwrap();
        assert!(result.status.success());
        assert!(initialize(temp.path(), "Sample", "linked/worktree", "W", false).is_err());
        fs::remove_dir(link).unwrap();
        assert!(fs::read_dir(outside.path()).unwrap().next().is_none());
    }
}
