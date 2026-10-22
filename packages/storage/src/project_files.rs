use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    path::{Component, Path, PathBuf},
};
pub const MAX_BYTES: usize = 16 * 1024 * 1024;
pub const MAX_FILES: usize = 2000;
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectSource {
    pub data_directory: String,
    pub files: BTreeMap<String, String>,
}
pub fn invalid() -> String {
    crate::i18n::invalid_project().into()
}
pub fn is_link(metadata: &fs::Metadata) -> bool {
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
pub fn display(path: &Path) -> String {
    let value = path.to_string_lossy();
    if let Some(rest) = value.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", rest)
    } else {
        value.strip_prefix(r"\\?\").unwrap_or(&value).to_string()
    }
}
pub fn root(path: &Path) -> Result<PathBuf, String> {
    if !path.exists() && path.file_name().is_some_and(|v| v == "worktree.json") {
        return root(path.parent().ok_or_else(invalid)?);
    }
    let target = fs::canonicalize(path).map_err(|e| e.to_string())?;
    if target.is_dir() {
        return Ok(target);
    }
    if target.file_name().is_some_and(|v| v == "worktree.json") {
        return target.parent().map(Path::to_path_buf).ok_or_else(invalid);
    }
    Err(invalid())
}
pub fn relative(value: &str) -> bool {
    !value.is_empty()
        && !value.contains(['\\', ':', '\0'])
        && !value.starts_with('/')
        && value
            .split('/')
            .all(|s| !s.is_empty() && s != "." && s != ".." && !s.ends_with(['.', ' ']))
        && Path::new(value)
            .components()
            .all(|c| matches!(c, Component::Normal(_)))
}
// Check every existing component: canonicalizing only the final path would follow junctions.
pub fn safe_join(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    if !relative(relative_path) {
        return Err(invalid());
    }
    let mut result = root.to_path_buf();
    for component in relative_path.split('/') {
        result.push(component);
        match fs::symlink_metadata(&result) {
            Ok(meta) if is_link(&meta) => return Err(invalid()),
            Ok(_) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(result)
}
pub fn read_text(path: &Path) -> Result<String, String> {
    let meta = fs::symlink_metadata(path).map_err(|e| format!("{}: {e}", display(path)))?;
    if is_link(&meta) || !meta.is_file() || meta.len() > MAX_BYTES as u64 {
        return Err(invalid());
    }
    fs::read_to_string(path).map_err(|e| format!("{}: {e}", display(path)))
}
pub fn data_directory(root: &Path) -> Result<String, String> {
    let value: serde_json::Value =
        serde_json::from_str(&read_text(&safe_join(root, "worktree.json")?)?)
            .map_err(|e| e.to_string())?;
    let directory = value
        .get("dataDirectory")
        .and_then(|v| v.as_str())
        .ok_or_else(invalid)?;
    safe_join(root, directory)?;
    Ok(directory.into())
}
pub fn valid_file(file: &str) -> bool {
    if file == "project.json" {
        return true;
    }
    let Some((folder, name)) = file.split_once('/') else {
        return false;
    };
    if folder == "comments" {
        let Some((task, comment)) = name.split_once('/') else {
            return false;
        };
        let Some(id) = comment.strip_suffix(".md") else {
            return false;
        };
        let parts: Vec<_> = id.split('-').collect();
        return valid_file(&format!("tasks/{task}.md"))
            && parts.len() == 5
            && parts.iter().zip([8, 4, 4, 4, 12]).all(|(part, len)| {
                part.len() == len
                    && part
                        .bytes()
                        .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
            });
    }
    if !["tasks", "milestones"].contains(&folder) || !name.ends_with(".md") {
        return false;
    }
    let stem = &name[..name.len() - 3];
    let digits = stem
        .chars()
        .skip_while(|c| c.is_ascii_uppercase())
        .collect::<String>();
    let prefix_len = stem.len() - digits.len();
    prefix_len > 0
        && prefix_len <= 20
        && digits.len() >= 3
        && digits.chars().all(|c| c.is_ascii_digit())
}
pub fn validate_source(source: &ProjectSource) -> Result<(), String> {
    if !relative(&source.data_directory)
        || !source.files.contains_key("project.json")
        || source.files.len() > MAX_FILES
        || source.files.keys().any(|file| !valid_file(file))
        || source.files.values().map(|s| s.len()).sum::<usize>() > MAX_BYTES
    {
        return Err(invalid());
    }
    let config: serde_json::Value =
        serde_json::from_str(&source.files["project.json"]).map_err(|e| e.to_string())?;
    if config.get("schemaVersion").and_then(|v| v.as_u64()) != Some(1) {
        return Err(invalid());
    }
    Ok(())
}
pub fn read(root: &Path) -> Result<ProjectSource, String> {
    let directory = data_directory(root)?;
    let data = safe_join(root, &directory)?;
    let mut files = BTreeMap::new();
    files.insert(
        "project.json".into(),
        read_text(&safe_join(&data, "project.json")?)?,
    );
    for folder in ["milestones", "tasks"] {
        let path = safe_join(&data, folder)?;
        if !path.exists() {
            continue;
        }
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".md") {
                continue;
            }
            let key = format!("{folder}/{name}");
            if !valid_file(&key) {
                return Err(format!("{}: {}", invalid(), key));
            }
            let text = read_text(&safe_join(&data, &key)?)?;
            files.insert(key, text);
            if files.len() > MAX_FILES || files.values().map(|s| s.len()).sum::<usize>() > MAX_BYTES
            {
                return Err(invalid());
            }
        }
    }
    let comments = safe_join(&data, "comments")?;
    if comments.exists() {
        for entry in fs::read_dir(comments).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let task = entry.file_name().to_string_lossy().into_owned();
            let folder = safe_join(&data, &format!("comments/{task}"))?;
            if !folder.is_dir() || !valid_file(&format!("tasks/{task}.md")) {
                return Err(invalid());
            }
            for comment in fs::read_dir(folder).map_err(|e| e.to_string())? {
                let comment = comment.map_err(|e| e.to_string())?;
                let name = comment.file_name().to_string_lossy().into_owned();
                if !name.ends_with(".md") {
                    continue;
                }
                let key = format!("comments/{task}/{name}");
                if !valid_file(&key) {
                    return Err(format!("{}: {}", invalid(), key));
                }
                let text = read_text(&safe_join(&data, &key)?)?;
                files.insert(key, text);
                if files.len() > MAX_FILES
                    || files.values().map(|s| s.len()).sum::<usize>() > MAX_BYTES
                {
                    return Err(invalid());
                }
            }
        }
    }
    // The UI validates individual documents and reports their exact source file and field.
    Ok(ProjectSource {
        data_directory: directory,
        files,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn comment_paths_are_limited_to_task_ids_and_uuid_markdown_files() {
        assert!(valid_file(
            "comments/W001/12345678-1234-1234-1234-123456789abc.md"
        ));
        assert!(valid_file(
            "comments/MS001/12345678-1234-1234-1234-123456789abc.md"
        ));
        for invalid in [
            "comments/../12345678-1234-1234-1234-123456789abc.md",
            "comments/W001/../../outside.md",
            "comments/W001/name.md",
            "comments/W001/12345678-1234-1234-1234-123456789abc.md/extra",
            "comments/w001/12345678-1234-1234-1234-123456789abc.md",
        ] {
            assert!(!valid_file(invalid), "{invalid}");
        }
    }
    #[cfg(windows)]
    #[test]
    fn comment_directory_junction_is_not_followed() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let data = root.path().join("docs/worktree");
        fs::create_dir_all(data.join("comments")).unwrap();
        fs::write(
            root.path().join("worktree.json"),
            r#"{"dataDirectory":"docs/worktree"}"#,
        )
        .unwrap();
        fs::write(data.join("project.json"), r#"{"schemaVersion":1}"#).unwrap();
        fs::write(outside.path().join("keep.txt"), "keep").unwrap();
        let link = data.join("comments").join("W001");
        let result = std::process::Command::new("cmd.exe")
            .args(["/C", "mklink", "/J"])
            .arg(display(&link).replace('/', "\\"))
            .arg(display(outside.path()).replace('/', "\\"))
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{} {}",
            String::from_utf8_lossy(&result.stdout),
            String::from_utf8_lossy(&result.stderr)
        );
        let result = read(root.path());
        fs::remove_dir(link).unwrap();
        assert!(result.is_err());
        assert_eq!(
            fs::read_to_string(outside.path().join("keep.txt")).unwrap(),
            "keep"
        );
    }
}
