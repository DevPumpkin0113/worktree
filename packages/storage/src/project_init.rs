use crate::{project_files as files, project_write};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
#[derive(Deserialize, Serialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct ProjectPriority {
    pub id: String,
    pub name: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InitializationRules {
    pub date_format: String,
    pub time_format: String,
    pub task_types: Vec<String>,
    pub task_type_colors: std::collections::BTreeMap<String, String>,
    pub labels: Vec<String>,
    #[serde(default)]
    pub priorities: Vec<ProjectPriority>,
    #[serde(default)]
    pub assignees: Vec<String>,
}
impl Default for InitializationRules {
    fn default() -> Self {
        Self {
            date_format: "yyyy-MM-dd".into(),
            time_format: "24h".into(),
            task_types: vec![
                "feature".into(),
                "bug".into(),
                "improvement".into(),
                "task".into(),
                "docs".into(),
                "spike".into(),
                "chore".into(),
            ],
            task_type_colors: Default::default(),
            priorities: vec![],
            assignees: vec![],
            labels: vec![],
        }
    }
}
impl InitializationRules {
    pub fn valid(&self) -> bool {
        let list = |values: &[String]| {
            let unique: std::collections::HashSet<_> = values.iter().collect();
            unique.len() == values.len()
                && values.iter().all(|v| {
                    !v.trim().is_empty() && v.trim() == v && !v.contains(['\r', '\n', '\0', ','])
                })
        };
        [
            "yyyy-MM-dd",
            "yyyy.MM.dd",
            "yyyy/MM/dd",
            "dd-MM-yyyy",
            "dd.MM.yyyy",
            "dd/MM/yyyy",
            "MM-dd-yyyy",
            "MM.dd.yyyy",
            "MM/dd/yyyy",
        ]
        .contains(&self.date_format.as_str())
            && ["24h", "12h"].contains(&self.time_format.as_str())
            && !self.task_types.is_empty()
            && list(&self.task_types)
            && list(&self.labels)
            && list(&self.assignees)
            && !self.assignees.iter().any(|v| v == "-")
            && self.priorities.len() <= 100
            && self.priorities.iter().all(|p| {
                !p.id.is_empty()
                    && p.id.len() <= 80
                    && p.id
                        .chars()
                        .next()
                        .is_some_and(|c| c.is_ascii_alphanumeric() || c == '_')
                    && p.id
                        .chars()
                        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
                    && p.name.encode_utf16().count() <= 100
            })
            && list(
                &self
                    .priorities
                    .iter()
                    .map(|p| p.name.clone())
                    .collect::<Vec<_>>(),
            )
            && self
                .priorities
                .iter()
                .map(|p| &p.id)
                .collect::<std::collections::HashSet<_>>()
                .len()
                == self.priorities.len()
            && self.task_type_colors.iter().all(|(name, color)| {
                self.task_types.contains(name)
                    && color.len() == 7
                    && color.starts_with('#')
                    && color[1..].chars().all(|c| c.is_ascii_hexdigit())
            })
    }
}
/// Caller must hold project_write::LOCK for the complete initialization operation.
pub fn initialize(
    root: &Path,
    name: &str,
    directory: &str,
    prefix: &str,
    use_effort: bool,
    id_separator: &str,
    rules: &InitializationRules,
) -> Result<(), String> {
    if !rules.valid()
        || !matches!(id_separator, "none" | "hyphen")
        || name.trim().is_empty()
        || name.encode_utf16().count() > 200
        || name.contains(['\r', '\n', '\0'])
        || prefix.is_empty()
        || prefix.len() > 20
        || prefix == "MS"
        || !prefix.chars().all(|c| c.is_ascii_uppercase())
    {
        return Err(files::invalid());
    }
    // Validate the relative data path before any directory is created.
    files::safe_join(root, directory)?;
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let root = files::root(root)?;
    let marker = files::safe_join(&root, "worktree.json")?;
    let data = files::safe_join(&root, directory)?;
    if files::safe_join(&root, ".worktree-reset.json")?.exists() || marker.exists() || data.exists()
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
    let config = serde_json::json!({"schemaVersion":1,"name":name.trim(),"taskPrefix":prefix,"useEffort":use_effort,"idSeparator":id_separator,"dateFormat":rules.date_format,"timeFormat":rules.time_format,"taskTypes":rules.task_types,"taskTypeColors":rules.task_type_colors,"labels":rules.labels,"priorities":rules.priorities,"assignees":rules.assignees,"nextTaskNumber":1,"nextMilestoneNumber":1});
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
    project_write::atomic(&marker, &marker_text, true)?;
    Ok(())
}
