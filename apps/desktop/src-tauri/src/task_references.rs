use crate::project_files as files;
use std::path::{Path, PathBuf};

fn reference_path(project: &str, value: &str, kind: &str) -> Result<PathBuf, String> {
    if !matches!(kind, "file" | "folder") {
        return Err("Unsupported reference".into());
    }
    let root = files::root(Path::new(project))?;
    let normalized = value.replace('\\', "/");
    let target = files::safe_join(&root, &normalized)?;
    if (kind == "file" && !target.is_file()) || (kind == "folder" && !target.is_dir()) {
        return Err("Reference target not found or type mismatch".into());
    }
    if kind == "file" {
        let extension = target
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if [
            "exe", "com", "bat", "cmd", "ps1", "msi", "vbs", "vbe", "js", "jse", "wsf", "wsh",
            "scr", "lnk", "url", "hta", "cpl", "reg",
        ]
        .contains(&extension.as_str())
        {
            return Err("Executable references cannot be opened".into());
        }
    }
    Ok(target)
}
#[tauri::command]
pub async fn open_task_reference(
    project: String,
    value: String,
    kind: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let target = reference_path(&project, &value, &kind)?;
        open::that(target).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resolves_only_existing_relative_documents_and_folders() {
        let root = tempfile::tempdir().unwrap();
        let project = root.path().to_str().unwrap();
        std::fs::create_dir(root.path().join("자료")).unwrap();
        std::fs::write(root.path().join("자료/한글 파일.md"), "test").unwrap();
        std::fs::write(root.path().join("bad.cmd"), "echo test").unwrap();
        assert!(reference_path(project, "자료\\한글 파일.md", "file").is_ok());
        assert!(reference_path(project, "자료", "folder").is_ok());
        for (value, kind) in [
            ("../outside.md", "file"),
            ("C:/test.md", "file"),
            ("missing.md", "file"),
            ("자료", "file"),
            ("資料.md", "folder"),
            ("bad.cmd", "file"),
            ("資料", "web"),
        ] {
            assert!(reference_path(project, value, kind).is_err());
        }
    }
}
