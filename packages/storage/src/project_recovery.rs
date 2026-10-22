use crate::{project_files as files, project_reset, project_write};
use std::{fs, path::Path};

// Caller holds the common storage lock. Inspection never rewrites project files.
pub fn recover(path: &Path, apply: bool) -> Result<serde_json::Value, String> {
    let root = files::root(path)?;
    let mut pending = Vec::new();
    let reset = files::safe_join(&root, ".worktree-reset.json")?;
    if reset.exists() {
        // Validate the journal as JSON before reporting it; the shared reset recovery
        // performs its full state/path checks before restoring or finishing deletion.
        let _: serde_json::Value =
            serde_json::from_str(&files::read_text(&reset)?).map_err(|e| e.to_string())?;
        pending.push("reset");
        if apply {
            project_reset::recover(&root)?;
        }
    }
    let marker = files::safe_join(&root, "worktree.json")?;
    if marker.exists() {
        let directory = files::data_directory(&root)?;
        let data = files::safe_join(&root, &directory)?;
        let journal = files::safe_join(&data, ".worktree-transaction.json")?;
        if journal.exists() {
            let meta = fs::symlink_metadata(&journal).map_err(|e| e.to_string())?;
            if files::is_link(&meta)
                || !meta.is_file()
                || meta.len() > (files::MAX_BYTES * 16) as u64
            {
                return Err(files::invalid());
            }
            pending.push("save");
            if apply {
                project_write::recover(&root, &directory)?;
            }
        }
    }
    Ok(
        serde_json::json!({"status":if apply {"recovered"} else {"inspected"}, "pending":pending, "initialized":marker.exists()}),
    )
}
