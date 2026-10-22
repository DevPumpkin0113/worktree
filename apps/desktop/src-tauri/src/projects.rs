use crate::{project_files as files, project_write};
use serde::Serialize;
#[cfg(test)]
use std::fs;
use std::path::Path;
pub use worktree_storage::project_init::InitializationRules;
#[cfg(test)]
use worktree_storage::project_init::ProjectPriority;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFiles {
    path: String,
    files: Vec<String>,
    selected_path: Option<String>,
}
fn scan(path: &Path) -> Result<ProjectFiles, String> {
    let _guard = project_write::LOCK.lock().map_err(|e| e.to_string())?;
    let root = files::root(path)?;
    crate::project_reset::recover(&root)?;
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
        crate::project_reset::recover(&root)?;
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
        let root = files::root(Path::new(&path))?;
        crate::project_reset::recover(&root)?;
        project_write::save(&root, &expected, &text).map(String::from)
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
    id_separator: String,
    rules: InitializationRules,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        initialize(
            Path::new(&path),
            &name,
            &data_directory,
            &task_prefix,
            use_effort,
            &id_separator,
            &rules,
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
    id_separator: &str,
    rules: &InitializationRules,
) -> Result<(), String> {
    let _guard = project_write::LOCK.lock()?;
    let root = files::root(root)?;
    crate::project_reset::recover(&root)?;
    worktree_storage::project_init::initialize(
        &root,
        name,
        directory,
        prefix,
        use_effort,
        id_separator,
        rules,
    )
}
fn selected_parent(root: &Path, selected: &Path) -> Result<String, String> {
    let root = std::path::PathBuf::from(files::display(root));
    let selected = std::path::PathBuf::from(files::display(selected));
    let mut components = selected.components();
    for root_component in root.components() {
        let component = components
            .next()
            .ok_or_else(|| crate::i18n::select_project_parent().to_string())?;
        let matches = if cfg!(windows) {
            component
                .as_os_str()
                .to_string_lossy()
                .eq_ignore_ascii_case(&root_component.as_os_str().to_string_lossy())
        } else {
            component == root_component
        };
        if !matches {
            return Err(crate::i18n::select_project_parent().into());
        }
    }
    let relative = components.collect::<std::path::PathBuf>();
    if relative.as_os_str().is_empty() {
        return Ok(String::new());
    }
    let relative = relative.to_string_lossy().replace('\\', "/");
    let target = files::safe_join(&root, &relative)?;
    if !target.is_dir() {
        return Err(files::invalid());
    }
    Ok(relative)
}
#[tauri::command]
pub async fn pick_project_parent(path: String, parent: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = files::root(Path::new(&path))?;
        let start = if parent.is_empty() {
            root.clone()
        } else {
            files::safe_join(&root, &parent)
                .ok()
                .filter(|value| value.is_dir())
                .unwrap_or_else(|| root.clone())
        };
        let selected = rfd::FileDialog::new()
            .set_title(crate::i18n::select_project_parent())
            .set_directory(start)
            .pick_folder();
        selected
            .map(|selected| selected_parent(&root, &selected))
            .transpose()
    })
    .await
    .map_err(|e| e.to_string())?
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
        initialize(
            temp.path(),
            "Sample",
            directory,
            prefix,
            false,
            "none",
            &InitializationRules::default(),
        )
        .unwrap();
        temp
    }
    #[test]
    fn initialization_saves_project_id_separator_and_rejects_invalid_values() {
        let temp = tempfile::tempdir().unwrap();
        assert!(initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "bad",
            &InitializationRules::default()
        )
        .is_err());
        assert!(!temp.path().join("docs").exists());
        initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "hyphen",
            &InitializationRules::default(),
        )
        .unwrap();
        let source = files::read(temp.path()).unwrap();
        let config: serde_json::Value =
            serde_json::from_str(&source.files["project.json"]).unwrap();
        assert_eq!(config["idSeparator"], "hyphen");
    }
    #[test]
    fn initialization_persists_custom_rules_and_validates_before_writing() {
        let temp = tempfile::tempdir().unwrap();
        let mut rules = InitializationRules {
            date_format: "yyyy.MM.dd".into(),
            time_format: "12h".into(),
            task_types: vec!["개발".into(), "검토".into()],
            task_type_colors: Default::default(),
            priorities: vec![],
            assignees: vec![],
            labels: vec!["ui".into()],
        };
        rules.time_format = "bad".into();
        assert!(initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "none",
            &rules
        )
        .is_err());
        assert!(!temp.path().join("docs").exists());
        rules.time_format = "12h".into();
        rules.labels.push("ui".into());
        assert!(initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "none",
            &rules
        )
        .is_err());
        rules.labels.pop();
        initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "none",
            &rules,
        )
        .unwrap();
        let source = files::read(temp.path()).unwrap();
        let config: serde_json::Value =
            serde_json::from_str(&source.files["project.json"]).unwrap();
        assert_eq!(config["dateFormat"], "yyyy.MM.dd");
        assert_eq!(config["timeFormat"], "12h");
        assert_eq!(config["taskTypes"], serde_json::json!(["개발", "검토"]));
        assert_eq!(config["labels"], serde_json::json!(["ui"]));
    }
    #[test]
    fn date_order_separator_combinations_are_validated_independently() {
        let mut rules = InitializationRules::default();
        for order in [
            ["yyyy", "MM", "dd"],
            ["dd", "MM", "yyyy"],
            ["MM", "dd", "yyyy"],
        ] {
            for separator in ["-", ".", "/"] {
                rules.date_format = order.join(separator);
                assert!(rules.valid(), "{}", rules.date_format);
            }
        }
        rules.date_format = "yyyy.MM/dd".into();
        assert!(!rules.valid());
    }
    #[test]
    fn selected_parent_accepts_root_and_children_and_rejects_outside() {
        let temp = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let root = files::root(temp.path()).unwrap();
        fs::create_dir(root.join("docs")).unwrap();
        fs::write(root.join("file.txt"), "text").unwrap();
        assert_eq!(selected_parent(&root, &root).unwrap(), "");
        assert_eq!(selected_parent(&root, &root.join("docs")).unwrap(), "docs");
        assert!(selected_parent(&root, outside.path()).is_err());
        assert!(selected_parent(&root, &root.join("docs/../outside")).is_err());
        assert!(selected_parent(&root, &root.join("missing")).is_err());
        assert!(selected_parent(&root, &root.join("file.txt")).is_err());
    }
    #[test]
    fn initialization_type_colors_validate_and_persist() {
        let temp = tempfile::tempdir().unwrap();
        let mut rules = InitializationRules::default();
        for color in ["red", "#fff", "#00000000", "#xxxxxx"] {
            rules
                .task_type_colors
                .insert("feature".into(), color.into());
            assert!(initialize(
                temp.path(),
                "Sample",
                "docs/worktree",
                "W",
                false,
                "none",
                &rules
            )
            .is_err());
            assert!(!temp.path().join("docs").exists());
        }
        rules.task_type_colors.clear();
        rules
            .task_type_colors
            .insert("outside".into(), "#123456".into());
        assert!(!rules.valid());
        rules.task_type_colors.clear();
        rules
            .task_type_colors
            .insert("feature".into(), "#123456".into());
        initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "none",
            &rules,
        )
        .unwrap();
        let source = files::read(temp.path()).unwrap();
        let config: serde_json::Value =
            serde_json::from_str(&source.files["project.json"]).unwrap();
        assert_eq!(config["taskTypeColors"]["feature"], "#123456");
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
        assert!(initialize(
            temp.path(),
            "Other",
            "docs/other",
            "ABC",
            true,
            "none",
            &InitializationRules::default()
        )
        .is_err());
        assert_eq!(files::read(temp.path()).unwrap(), original);
        fs::remove_file(temp.path().join("worktree.json")).unwrap();
        assert!(initialize(
            temp.path(),
            "Other",
            "docs/worktree",
            "ABC",
            true,
            "none",
            &InitializationRules::default()
        )
        .is_err());
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
                initialize(
                    temp.path(),
                    "Sample",
                    path,
                    "W",
                    false,
                    "none",
                    &InitializationRules::default()
                )
                .is_err(),
                "{path}"
            );
        }
        for prefix in ["MS", "w", "W-", "", "A1"] {
            assert!(initialize(
                temp.path(),
                "Sample",
                "docs/worktree",
                prefix,
                false,
                "none",
                &InitializationRules::default()
            )
            .is_err());
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
        assert!(selected_parent(temp.path(), &link).is_err());
        assert!(initialize(
            temp.path(),
            "Sample",
            "linked/worktree",
            "W",
            false,
            "none",
            &InitializationRules::default()
        )
        .is_err());
        fs::remove_dir(link).unwrap();
        assert!(fs::read_dir(outside.path()).unwrap().next().is_none());
    }
    #[test]
    fn initialization_priorities_and_assignees_validate_and_persist() {
        let temp = tempfile::tempdir().unwrap();
        let mut rules = InitializationRules::default();
        rules.priorities = vec![
            ProjectPriority {
                id: "low".into(),
                name: "낮음".into(),
            },
            ProjectPriority {
                id: "custom".into(),
                name: "긴급 검토".into(),
            },
        ];
        rules.assignees = vec!["박대호".into()];
        let valid = rules.priorities.clone();
        rules.priorities[1].id = "-".into();
        assert!(!rules.valid());
        assert!(initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "none",
            &rules
        )
        .is_err());
        assert!(!temp.path().join("worktree.json").exists());
        rules.priorities = valid;
        rules.assignees.push("박대호".into());
        assert!(!rules.valid());
        rules.assignees.pop();
        rules.priorities[1].name = "낮음".into();
        assert!(!rules.valid());
        rules.priorities[1].name = "긴급 검토".into();
        initialize(
            temp.path(),
            "Sample",
            "docs/worktree",
            "W",
            false,
            "none",
            &rules,
        )
        .unwrap();
        let source = files::read(temp.path()).unwrap();
        let config: serde_json::Value =
            serde_json::from_str(&source.files["project.json"]).unwrap();
        assert_eq!(config["priorities"][1]["id"], "custom");
        assert_eq!(config["assignees"], serde_json::json!(["박대호"]));
    }
}
