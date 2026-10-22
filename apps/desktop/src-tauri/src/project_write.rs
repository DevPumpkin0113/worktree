use crate::project_files::{self as files, ProjectSource};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, fs, io::Write, path::Path, sync::Mutex};
pub static LOCK: Mutex<()> = Mutex::new(());
const JOURNAL: &str = ".worktree-transaction.json";
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    before: ProjectSource,
    after: ProjectSource,
}
pub fn atomic(path: &Path, content: &str, create: bool) -> Result<(), String> {
    if let Ok(meta) = fs::symlink_metadata(path) {
        if files::is_link(&meta) || !meta.is_file() || meta.permissions().readonly() {
            return Err(files::invalid());
        }
    }
    let mut temporary = tempfile::Builder::new()
        .prefix(".worktree-save-")
        .tempfile_in(path.parent().ok_or_else(files::invalid)?)
        .map_err(|e| e.to_string())?;
    temporary
        .write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;
    if let Ok(meta) = fs::metadata(path) {
        temporary
            .as_file()
            .set_permissions(meta.permissions())
            .map_err(|e| e.to_string())?;
    }
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    if create {
        temporary
            .persist_noclobber(path)
            .map_err(|e| e.to_string())?;
    } else {
        temporary.persist(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
fn changes(j: &Journal) -> Vec<String> {
    j.before
        .files
        .keys()
        .chain(j.after.files.keys())
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .filter(|file| j.before.files.get(file) != j.after.files.get(file))
        .collect()
}
pub fn recover(root: &Path, data_directory: &str) -> Result<(), String> {
    let data = files::safe_join(root, data_directory)?;
    let path = files::safe_join(&data, JOURNAL)?;
    if !path.exists() {
        return Ok(());
    }
    let metadata = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
    if files::is_link(&metadata) || metadata.len() > (files::MAX_BYTES * 16) as u64 {
        return Err(files::invalid());
    }
    let j: Journal = serde_json::from_str(&fs::read_to_string(&path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    files::validate_source(&j.before)?;
    files::validate_source(&j.after)?;
    if j.before.data_directory != data_directory || j.after.data_directory != data_directory {
        return Err(files::invalid());
    }
    // Preserve any outside edits made after an interrupted transaction instead of overwriting them.
    for file in changes(&j) {
        let path = files::safe_join(&data, &file)?;
        let current = if path.exists() {
            Some(files::read_text(&path)?)
        } else {
            None
        };
        if current.as_ref() != j.before.files.get(&file)
            && current.as_ref() != j.after.files.get(&file)
        {
            return Err(crate::i18n::project_recovery_conflict().into());
        }
    }
    for file in changes(&j) {
        let path = files::safe_join(&data, &file)?;
        if let Some(content) = j.before.files.get(&file) {
            if !path.exists() || files::read_text(&path)? != *content {
                atomic(&path, content, false)?;
            }
        } else if path.exists() {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    fs::remove_file(path).map_err(|e| e.to_string())
}
pub fn save(root: &Path, expected: &str, text: &str) -> Result<&'static str, String> {
    let before: ProjectSource = serde_json::from_str(expected).map_err(|e| e.to_string())?;
    let after: ProjectSource = serde_json::from_str(text).map_err(|e| e.to_string())?;
    files::validate_source(&before)?;
    files::validate_source(&after)?;
    if before.data_directory != after.data_directory {
        return Err(files::invalid());
    }
    recover(root, &files::data_directory(root)?)?;
    if files::read(root)? != before {
        return Ok("conflict");
    }
    let data = files::safe_join(root, &before.data_directory)?;
    let j = Journal { before, after };
    for file in changes(&j) {
        let path = files::safe_join(&data, &file)?;
        if path.exists()
            && fs::metadata(&path)
                .map_err(|e| e.to_string())?
                .permissions()
                .readonly()
        {
            return Err(files::invalid());
        }
    }
    if files::read(root)? != j.before {
        return Ok("conflict");
    }
    let journal_path = files::safe_join(&data, JOURNAL)?;
    atomic(
        &journal_path,
        &serde_json::to_string(&j).map_err(|e| e.to_string())?,
        true,
    )?;
    let result = (|| {
        for file in changes(&j) {
            let path = files::safe_join(&data, &file)?;
            if let Some(content) = j.after.files.get(&file) {
                fs::create_dir_all(path.parent().ok_or_else(files::invalid)?)
                    .map_err(|e| e.to_string())?;
                atomic(&path, content, !j.before.files.contains_key(&file))?;
            } else {
                fs::remove_file(path).map_err(|e| e.to_string())?;
            }
        }
        fs::remove_file(&journal_path).map_err(|e| e.to_string())
    })();
    if let Err(error) = result {
        recover(root, &j.before.data_directory)
            .map_err(|recovery| format!("{error}; {recovery}"))?;
        return Err(error);
    }
    Ok("saved")
}
#[cfg(test)]
mod tests {
    use super::*;
    const COMMENT: &str = "comments/W001/12345678-1234-1234-1234-123456789abc.md";
    #[test]
    fn nested_comments_round_trip_conflict_and_deletion() {
        let (temp, before) = fixture();
        let mut after = before.clone();
        after.files.insert(COMMENT.into(), "comment body".into());
        let expected = serde_json::to_string(&before).unwrap();
        let saved = serde_json::to_string(&after).unwrap();
        assert_eq!(save(temp.path(), &expected, &saved).unwrap(), "saved");
        assert_eq!(files::read(temp.path()).unwrap(), after);
        assert_eq!(save(temp.path(), &expected, &saved).unwrap(), "conflict");
        assert_eq!(save(temp.path(), &saved, &expected).unwrap(), "saved");
        assert_eq!(files::read(temp.path()).unwrap(), before);
        assert!(!temp.path().join("docs/worktree").join(COMMENT).exists());
    }
    #[cfg(windows)]
    #[test]
    fn failed_write_rolls_back_new_nested_comment_file() {
        use std::os::windows::fs::OpenOptionsExt;
        let (temp, before) = fixture();
        let mut after = before.clone();
        after.files.insert(COMMENT.into(), "comment body".into());
        after.files.insert("tasks/W001.md".into(), "updated".into());
        let data = temp.path().join("docs/worktree");
        let locked = fs::OpenOptions::new()
            .read(true)
            .share_mode(1)
            .open(data.join("tasks/W001.md"))
            .unwrap();
        assert!(save(
            temp.path(),
            &serde_json::to_string(&before).unwrap(),
            &serde_json::to_string(&after).unwrap()
        )
        .is_err());
        drop(locked);
        recover(temp.path(), "docs/worktree").unwrap();
        assert_eq!(files::read(temp.path()).unwrap(), before);
        assert!(!data.join(COMMENT).exists());
    }
    fn fixture() -> (tempfile::TempDir, ProjectSource) {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("docs/worktree");
        fs::create_dir_all(data.join("tasks")).unwrap();
        fs::create_dir_all(data.join("milestones")).unwrap();
        fs::write(
            temp.path().join("worktree.json"),
            r#"{"dataDirectory":"docs/worktree"}"#,
        )
        .unwrap();
        fs::write(
            data.join("project.json"),
            r#"{"schemaVersion":1,"taskPrefix":"W","nextTaskNumber":2}"#,
        )
        .unwrap();
        fs::write(data.join("tasks/W001.md"), "original").unwrap();
        let source = files::read(temp.path()).unwrap();
        (temp, source)
    }
    #[test]
    fn saves_changed_files_only_and_detects_external_changes() {
        let (temp, before) = fixture();
        let mut after = before.clone();
        after
            .files
            .insert("tasks/W002.md".into(), "new task".into());
        after.files.insert("tasks/W001.md".into(), "updated".into());
        assert_eq!(
            save(
                temp.path(),
                &serde_json::to_string(&before).unwrap(),
                &serde_json::to_string(&after).unwrap()
            )
            .unwrap(),
            "saved"
        );
        assert_eq!(files::read(temp.path()).unwrap(), after);
        assert!(!temp.path().join("docs/worktree").join(JOURNAL).exists());
        assert_eq!(
            save(
                temp.path(),
                &serde_json::to_string(&before).unwrap(),
                &serde_json::to_string(&after).unwrap()
            )
            .unwrap(),
            "conflict"
        );
        assert_eq!(files::read(temp.path()).unwrap(), after);
    }
    #[test]
    fn interrupted_multi_file_save_rolls_back_on_next_read() {
        let (temp, before) = fixture();
        let mut after = before.clone();
        after
            .files
            .insert("tasks/W002.md".into(), "new task".into());
        after.files.remove("tasks/W001.md");
        let data = temp.path().join("docs/worktree");
        let j = Journal {
            before: before.clone(),
            after,
        };
        fs::write(data.join(JOURNAL), serde_json::to_string(&j).unwrap()).unwrap();
        fs::remove_file(data.join("tasks/W001.md")).unwrap();
        fs::write(data.join("tasks/W002.md"), "new task").unwrap();
        recover(temp.path(), "docs/worktree").unwrap();
        assert_eq!(files::read(temp.path()).unwrap(), before);
        assert!(!data.join(JOURNAL).exists());
    }
    #[test]
    fn recovery_preserves_post_crash_external_edits_and_the_journal() {
        let (temp, before) = fixture();
        let mut after = before.clone();
        after.files.insert("tasks/W001.md".into(), "new".into());
        let data = temp.path().join("docs/worktree");
        let j = Journal { before, after };
        fs::write(data.join(JOURNAL), serde_json::to_string(&j).unwrap()).unwrap();
        fs::write(data.join("tasks/W001.md"), "external").unwrap();
        assert!(recover(temp.path(), "docs/worktree").is_err());
        assert_eq!(
            fs::read_to_string(data.join("tasks/W001.md")).unwrap(),
            "external"
        );
        assert!(data.join(JOURNAL).exists());
    }
    #[test]
    fn rejects_unsafe_snapshot_paths_and_readonly_files_without_changes() {
        let (temp, before) = fixture();
        let mut after = before.clone();
        after.files.insert("../outside.md".into(), "bad".into());
        assert!(save(
            temp.path(),
            &serde_json::to_string(&before).unwrap(),
            &serde_json::to_string(&after).unwrap()
        )
        .is_err());
        let path = temp.path().join("docs/worktree/tasks/W001.md");
        let original = fs::metadata(&path).unwrap().permissions();
        let mut readonly = original.clone();
        readonly.set_readonly(true);
        fs::set_permissions(&path, readonly).unwrap();
        after = before.clone();
        after.files.insert("tasks/W001.md".into(), "new".into());
        let result = save(
            temp.path(),
            &serde_json::to_string(&before).unwrap(),
            &serde_json::to_string(&after).unwrap(),
        );
        fs::set_permissions(path, original).unwrap();
        assert!(result.is_err());
        assert_eq!(files::read(temp.path()).unwrap(), before);
    }
    #[cfg(windows)]
    #[test]
    fn failed_second_replacement_rolls_back_the_first_file() {
        use std::os::windows::fs::OpenOptionsExt;
        let (temp, before) = fixture();
        let mut after = before.clone();
        after.files.insert(
            "project.json".into(),
            r#"{"schemaVersion":1,"taskPrefix":"W","nextTaskNumber":3}"#.into(),
        );
        after.files.insert("tasks/W001.md".into(), "new".into());
        let data = temp.path().join("docs/worktree");
        let locked = fs::OpenOptions::new()
            .read(true)
            .share_mode(1)
            .open(data.join("tasks/W001.md"))
            .unwrap();
        assert!(save(
            temp.path(),
            &serde_json::to_string(&before).unwrap(),
            &serde_json::to_string(&after).unwrap()
        )
        .is_err());
        drop(locked);
        // A locked unchanged file need not be rewritten to restore the other changed files.
        recover(temp.path(), "docs/worktree").unwrap();
        assert_eq!(files::read(temp.path()).unwrap(), before);
    }
}
