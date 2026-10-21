use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};

const MAX_FILES: usize = 2000;
const MAX_DIRECTORIES: usize = 10000;
const MAX_DEPTH: usize = 64;
const EXCLUDED: &[&str] = &["node_modules", "target", "dist"];

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFiles {
    path: String,
    files: Vec<String>,
    selected_path: Option<String>,
}

fn is_link(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        metadata.file_attributes() & 0x400 != 0
    }
    #[cfg(not(windows))]
    {
        metadata.file_type().is_symlink()
    }
}

fn display_path(path: &Path) -> String {
    let value = path.to_string_lossy();
    if let Some(rest) = value.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", rest)
    } else {
        value.strip_prefix(r"\\?\").unwrap_or(&value).to_string()
    }
}

fn scan(path: &Path) -> Result<ProjectFiles, String> {
    let target = fs::canonicalize(path).map_err(|e| e.to_string())?;
    let metadata = fs::metadata(&target).map_err(|e| e.to_string())?;
    let selected = if metadata.is_file() {
        let extension = target
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !["wbs", "md", "markdown"].contains(&extension.as_str()) {
            return Err(crate::i18n::select_wbs().into());
        }
        Some(target.clone())
    } else {
        None
    };
    let root = if selected.is_some() {
        target
            .parent()
            .ok_or_else(|| crate::i18n::project_folder_required().to_string())?
            .to_path_buf()
    } else {
        target
    };
    if !root.is_dir() {
        return Err(crate::i18n::project_folder_required().into());
    }
    let mut files = vec![];
    let mut pending = vec![(root.clone(), 0usize)];
    let mut directories = 0;
    while let Some((directory, depth)) = pending.pop() {
        directories += 1;
        if directories > MAX_DIRECTORIES || depth > MAX_DEPTH {
            return Err(crate::i18n::project_scan_limit().into());
        }
        for entry in
            fs::read_dir(&directory).map_err(|e| format!("{}: {e}", directory.display()))?
        {
            let entry = entry.map_err(|e| e.to_string())?;
            let metadata = fs::symlink_metadata(entry.path()).map_err(|e| e.to_string())?;
            if is_link(&metadata) {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if metadata.is_dir() {
                if !name.starts_with('.') && !EXCLUDED.contains(&name.as_str()) {
                    pending.push((entry.path(), depth + 1));
                }
            } else if metadata.is_file()
                && entry
                    .path()
                    .extension()
                    .is_some_and(|ext| ext.eq_ignore_ascii_case("wbs"))
            {
                files.push(entry.path());
                if files.len() > MAX_FILES {
                    return Err(crate::i18n::project_scan_limit().into());
                }
            }
        }
    }
    if let Some(path) = &selected {
        if !files.contains(path) {
            files.push(path.clone());
        }
    }
    files.sort_by_key(|path| path.to_string_lossy().to_lowercase());
    Ok(ProjectFiles {
        path: display_path(&root),
        files: files.into_iter().map(|p| display_path(&p)).collect(),
        selected_path: selected.map(|p| display_path(&p)),
    })
}

#[tauri::command]
pub async fn scan_project(path: String) -> Result<ProjectFiles, String> {
    tauri::async_runtime::spawn_blocking(move || scan(&PathBuf::from(path)))
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
    #[test]
    fn scans_nested_wbs_and_excludes_generated_folders() {
        let temp = tempfile::tempdir().unwrap();
        for folder in ["planning", "node_modules", "target", "dist", ".git"] {
            fs::create_dir(temp.path().join(folder)).unwrap();
        }
        for file in [
            "root.WBS",
            "planning/plan.wbs",
            "node_modules/skip.wbs",
            "target/skip.wbs",
            "dist/skip.wbs",
            ".git/skip.wbs",
            "readme.md",
        ] {
            fs::write(temp.path().join(file), "").unwrap();
        }
        let project = scan(temp.path()).unwrap();
        assert_eq!(project.files.len(), 2);
        assert!(project.selected_path.is_none());
        let file = scan(&temp.path().join("planning/plan.wbs")).unwrap();
        assert_eq!(file.files.len(), 1);
        assert!(file.selected_path.unwrap().ends_with("plan.wbs"));
        assert!(scan(&temp.path().join("missing")).is_err());
        let legacy = scan(&temp.path().join("readme.md")).unwrap();
        assert_eq!(legacy.files.len(), 3);
    }
    #[test]
    fn empty_projects_and_scan_limit() {
        let temp = tempfile::tempdir().unwrap();
        assert!(scan(temp.path()).unwrap().files.is_empty());
        for index in 0..=MAX_FILES {
            fs::write(temp.path().join(format!("{index}.wbs")), "").unwrap();
        }
        assert!(scan(temp.path()).is_err());
    }
    #[cfg(windows)]
    #[test]
    fn project_scan_does_not_follow_junctions() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("outside.wbs"), "").unwrap();
        let link = root.path().join("linked");
        let result = std::process::Command::new("cmd.exe")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(outside.path())
            .output()
            .unwrap();
        assert!(result.status.success());
        let result = scan(root.path());
        fs::remove_dir(&link).unwrap();
        assert!(result.unwrap().files.is_empty());
        assert!(outside.path().join("outside.wbs").exists());
    }
}
