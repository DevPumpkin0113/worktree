use serde::Deserialize;
use std::{
    io::{self, Read},
    path::Path,
};
use worktree_storage::{project_files as files, project_write};
#[derive(Deserialize)]
#[serde(
    tag = "operation",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum Request {
    Recover {
        root: String,
        apply: bool,
        language: String,
    },
    Save {
        root: String,
        expected: String,
        text: String,
        language: String,
    },
    Init {
        root: String,
        name: String,
        directory: String,
        prefix: String,
        use_effort: bool,
        id_separator: String,
        rules: worktree_storage::project_init::InitializationRules,
        language: String,
    },
}
fn execute() -> Result<serde_json::Value, String> {
    let mut input = String::new();
    io::stdin()
        .take((files::MAX_BYTES * 16 + 1) as u64)
        .read_to_string(&mut input)
        .map_err(|e| e.to_string())?;
    if input.len() > files::MAX_BYTES * 16 {
        return Err("Request too large".into());
    }
    let request: Request = serde_json::from_str(&input).map_err(|e| e.to_string())?;

    let _guard = match project_write::LOCK.lock() {
        Ok(guard) => guard,
        Err(message) => {
            return Ok(
                serde_json::json!({"error":{"code":"STORAGE_LOCK_FAILED","message":message}}),
            )
        }
    };
    match request {
        Request::Recover {
            root,
            apply,
            language,
        } => {
            worktree_storage::set_language(&language);
            worktree_storage::project_recovery::recover(Path::new(&root), apply)
        }
        Request::Save {
            root,
            expected,
            text,
            language,
        } => {
            worktree_storage::set_language(&language);
            let root = files::root(Path::new(&root))?;
            if files::safe_join(&root, ".worktree-reset.json")?.exists() {
                return Ok(
                    serde_json::json!({"error":{"code":"RECOVERY_REQUIRED","message":"Open the desktop app to recover the interrupted reset."}}),
                );
            }
            let status = project_write::save(&root, &expected, &text)?;
            Ok(serde_json::json!({"status":status}))
        }
        Request::Init {
            root,
            name,
            directory,
            prefix,
            use_effort,
            id_separator,
            rules,
            language,
        } => {
            worktree_storage::set_language(&language);
            worktree_storage::project_init::initialize(
                Path::new(&root),
                &name,
                &directory,
                &prefix,
                use_effort,
                &id_separator,
                &rules,
            )?;
            Ok(serde_json::json!({"status":"initialized"}))
        }
    }
}
fn main() {
    match execute() {
        Ok(result) => {
            println!("{result}");
            if result.get("error").is_some() {
                std::process::exit(1);
            }
        }
        Err(message) => {
            println!(
                "{}",
                serde_json::json!({ "error": { "code": "STORAGE_ERROR", "message": message } })
            );
            std::process::exit(1);
        }
    }
}
