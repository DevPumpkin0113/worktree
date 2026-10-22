use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Manager, State};

const MAX_RECENT: usize = 12;
const MAX_TABS: usize = 40;
const MAX_BYTES: u64 = 128 * 1024;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DocumentTab {
    path: String,
    view: String,
    gantt_unit: String,
    #[serde(default)]
    task_tabs: Vec<String>,
    #[serde(default)]
    active_task_tab: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectTab {
    path: String,
    active_path: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Session {
    schema_version: u32,
    recent_files: Vec<String>,
    tabs: Vec<DocumentTab>,
    active_path: Option<String>,
    #[serde(default)]
    projects: Vec<ProjectTab>,
    #[serde(default)]
    active_project_path: Option<String>,
    #[serde(default)]
    recent_projects: Vec<String>,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            schema_version: 2,
            recent_files: vec![],
            tabs: vec![],
            active_path: None,
            projects: vec![],
            active_project_path: None,
            recent_projects: vec![],
        }
    }
}

fn valid_folder(value: &str) -> bool {
    !value.contains('\0')
        && value.len() <= 32767
        && Path::new(value).is_absolute()
        && !Path::new(value)
            .components()
            .any(|part| part == std::path::Component::ParentDir)
}
fn path_key(value: &str) -> String {
    value
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_lowercase()
}
fn within(file: &str, folder: &str) -> bool {
    path_key(file).starts_with(&(path_key(folder) + "/"))
}
fn valid_path(value: &str) -> bool {
    let path = Path::new(value);
    !value.contains('\0')
        && value.len() <= 32767
        && path.is_absolute()
        && path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| {
                ["wbs", "md", "markdown", "json"].contains(&ext.to_lowercase().as_str())
            })
}

fn valid_task_id(id: &str) -> bool {
    let prefix = id
        .bytes()
        .take_while(|byte| byte.is_ascii_uppercase())
        .count();
    (1..=20).contains(&prefix)
        && id.len() >= prefix + 3
        && id[prefix..].bytes().all(|byte| byte.is_ascii_digit())
}
fn valid_task_tabs(tab: &DocumentTab) -> bool {
    tab.task_tabs.len() <= 2000
        && tab.task_tabs.iter().all(|id| valid_task_id(id))
        && tab
            .task_tabs
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len()
            == tab.task_tabs.len()
        && tab
            .active_task_tab
            .as_ref()
            .is_none_or(|id| tab.task_tabs.contains(id))
}

impl Session {
    fn validate(&self) -> Result<(), String> {
        if ![1, 2].contains(&self.schema_version) {
            return Err(crate::i18n::unsupported_session().into());
        }
        let unique_recent = self
            .recent_files
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len();
        let unique_tabs = self
            .tabs
            .iter()
            .map(|tab| &tab.path)
            .collect::<std::collections::HashSet<_>>()
            .len();
        if self.recent_files.len() > MAX_RECENT
            || self.tabs.len() > MAX_TABS
            || unique_recent != self.recent_files.len()
            || unique_tabs != self.tabs.len()
            || self.recent_files.iter().any(|path| !valid_path(path))
            || self.tabs.iter().any(|tab| {
                !valid_path(&tab.path)
                    || !["tree", "board", "flow", "gantt"].contains(&tab.view.as_str())
                    || !["day", "week"].contains(&tab.gantt_unit.as_str())
                    || !valid_task_tabs(tab)
            })
            || self
                .active_path
                .as_ref()
                .is_some_and(|path| !self.tabs.iter().any(|tab| &tab.path == path))
        {
            return Err(crate::i18n::invalid_session().into());
        }
        if self.schema_version == 2 {
            let unique = |paths: Vec<&str>| {
                paths
                    .iter()
                    .map(|p| path_key(p))
                    .collect::<std::collections::HashSet<_>>()
                    .len()
                    == paths.len()
            };
            if self.projects.len() > MAX_TABS
                || self.recent_projects.len() > MAX_RECENT
                || !unique(self.projects.iter().map(|p| p.path.as_str()).collect())
                || !unique(self.recent_projects.iter().map(|p| p.as_str()).collect())
                || self.recent_projects.iter().any(|p| !valid_folder(p))
                || self.projects.iter().any(|p| {
                    !valid_folder(&p.path)
                        || p.active_path.as_ref().is_some_and(|file| {
                            !valid_path(file)
                                || !within(file, &p.path)
                                || !self.tabs.iter().any(|tab| &tab.path == file)
                        })
                })
                || self
                    .active_project_path
                    .as_ref()
                    .is_some_and(|path| !self.projects.iter().any(|p| &p.path == path))
                || self
                    .tabs
                    .iter()
                    .any(|tab| !self.projects.iter().any(|p| within(&tab.path, &p.path)))
                || self.active_path.as_ref().is_some_and(|file| {
                    !self.projects.iter().any(|p| {
                        Some(&p.path) == self.active_project_path.as_ref()
                            && p.active_path.as_ref() == Some(file)
                    })
                })
            {
                return Err(crate::i18n::invalid_session().into());
            }
        }
        Ok(())
    }
}

pub struct SessionStore {
    path: PathBuf,
    lock: Mutex<()>,
}
impl SessionStore {
    fn read(&self) -> Result<Session, String> {
        let metadata = match fs::metadata(&self.path) {
            Ok(value) => value,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(Session::default())
            }
            Err(error) => return Err(error.to_string()),
        };
        if metadata.len() > MAX_BYTES {
            return Err(crate::i18n::session_too_large().into());
        }
        let text = fs::read_to_string(&self.path).map_err(|error| error.to_string())?;
        let session: Session = serde_json::from_str(text.trim_start_matches('\u{feff}'))
            .map_err(|error| crate::i18n::session_read_failed(&error))?;
        session.validate()?;
        Ok(session)
    }
    fn write(&self, session: &Session) -> Result<(), String> {
        session.validate()?;
        // Unsupported or damaged saved state must never be silently overwritten.
        self.read()?;
        let parent = self
            .path
            .parent()
            .ok_or(crate::i18n::session_folder_missing())?;
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        let bytes = serde_json::to_vec_pretty(session).map_err(|error| error.to_string())?;
        if bytes.len() as u64 > MAX_BYTES {
            return Err(crate::i18n::session_save_too_large().into());
        }
        let mut temporary = tempfile::Builder::new()
            .prefix("session-")
            .suffix(".tmp")
            .tempfile_in(parent)
            .map_err(|error| error.to_string())?;
        temporary
            .write_all(&bytes)
            .map_err(|error| error.to_string())?;
        temporary
            .as_file()
            .sync_all()
            .map_err(|error| error.to_string())?;
        temporary
            .persist(&self.path)
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}

pub fn setup(app: &mut tauri::App) -> tauri::Result<()> {
    app.manage(SessionStore {
        path: app.path().local_data_dir()?.join("Worktree/session.json"),
        lock: Mutex::new(()),
    });
    Ok(())
}
#[tauri::command]
pub fn load_session(state: State<SessionStore>) -> Result<Session, String> {
    let _guard = state.lock.lock().map_err(|error| error.to_string())?;
    state.read()
}
#[tauri::command]
pub fn save_session(session: Session, state: State<SessionStore>) -> Result<(), String> {
    let _guard = state.lock.lock().map_err(|error| error.to_string())?;
    state.write(&session)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn store(path: &Path) -> SessionStore {
        SessionStore {
            path: path.join("session.json"),
            lock: Mutex::new(()),
        }
    }
    fn sample() -> Session {
        let path = std::env::temp_dir()
            .join("sample.wbs")
            .to_string_lossy()
            .into_owned();
        Session {
            recent_files: vec![path.clone()],
            tabs: vec![DocumentTab {
                path: path.clone(),
                view: "gantt".into(),
                gantt_unit: "week".into(),
                task_tabs: vec![],
                active_task_tab: None,
            }],
            projects: vec![ProjectTab {
                path: std::env::temp_dir().to_string_lossy().into_owned(),
                active_path: Some(path.clone()),
            }],
            active_project_path: Some(std::env::temp_dir().to_string_lossy().into_owned()),
            active_path: Some(path),
            ..Session::default()
        }
    }
    #[test]
    fn task_tabs_round_trip_and_invalid_ids_are_rejected() {
        let directory = tempfile::tempdir().unwrap();
        let store = store(directory.path());
        let mut session = sample();
        session.tabs[0].task_tabs = vec!["W002".into(), "W001".into()];
        session.tabs[0].active_task_tab = Some("W001".into());
        store.write(&session).unwrap();
        assert_eq!(store.read().unwrap(), session);
        session.tabs[0].active_task_tab = Some("W999".into());
        assert!(session.validate().is_err());
        session.tabs[0].active_task_tab = None;
        session.tabs[0].task_tabs = vec!["W001".into(), "W001".into()];
        assert!(session.validate().is_err());
        session.tabs[0].task_tabs = vec!["../W001".into()];
        assert!(session.validate().is_err());
        let mut old = serde_json::to_value(sample()).unwrap();
        old["tabs"][0].as_object_mut().unwrap().remove("taskTabs");
        old["tabs"][0]
            .as_object_mut()
            .unwrap()
            .remove("activeTaskTab");
        let loaded: Session = serde_json::from_value(old).unwrap();
        assert!(loaded.tabs[0].task_tabs.is_empty());
        assert!(loaded.validate().is_ok());
    }

    #[test]
    fn session_roundtrip_and_replace() {
        let directory = tempfile::tempdir().unwrap();
        let store = store(directory.path());
        assert_eq!(store.read().unwrap(), Session::default());
        store.write(&sample()).unwrap();
        assert_eq!(store.read().unwrap(), sample());
        store.write(&Session::default()).unwrap();
        assert_eq!(store.read().unwrap(), Session::default());
    }
    #[test]
    fn damaged_or_future_session_is_preserved() {
        let directory = tempfile::tempdir().unwrap();
        let store = store(directory.path());
        for text in [
            "{broken",
            r#"{"schemaVersion":3,"recentFiles":[],"tabs":[],"activePath":null}"#,
        ] {
            fs::write(&store.path, text).unwrap();
            assert!(store.read().is_err());
            assert!(store.write(&sample()).is_err());
            assert_eq!(fs::read_to_string(&store.path).unwrap(), text);
        }
    }
    #[test]
    fn invalid_paths_views_and_counts_are_rejected() {
        let mut session = sample();
        session.tabs[0].view = "invalid".into();
        assert!(session.validate().is_err());
        session = sample();
        session.tabs[0].path = "relative.wbs".into();
        assert!(session.validate().is_err());
        session = sample();
        session.recent_files = vec![session.recent_files[0].clone(); 13];
        assert!(session.validate().is_err());
        session = sample();
        session.active_path = Some("missing.wbs".into());
        assert!(session.validate().is_err());
    }
    #[test]
    fn legacy_session_is_read_without_rewriting_then_saved_as_project_session() {
        let directory = tempfile::tempdir().unwrap();
        let store = store(directory.path());
        let mut legacy = sample();
        legacy.schema_version = 1;
        legacy.projects.clear();
        legacy.active_project_path = None;
        let mut json = serde_json::to_value(&legacy).unwrap();
        for key in ["projects", "activeProjectPath", "recentProjects"] {
            json.as_object_mut().unwrap().remove(key);
        }
        let original = serde_json::to_string(&json).unwrap();
        fs::write(&store.path, &original).unwrap();
        assert_eq!(store.read().unwrap().schema_version, 1);
        assert_eq!(fs::read_to_string(&store.path).unwrap(), original);
        store.write(&sample()).unwrap();
        assert_eq!(store.read().unwrap().schema_version, 2);
        let mut empty = Session::default();
        empty.projects = vec![ProjectTab {
            path: directory.path().to_string_lossy().into_owned(),
            active_path: None,
        }];
        empty.active_project_path = Some(empty.projects[0].path.clone());
        assert!(empty.validate().is_ok());
        empty.projects.push(empty.projects[0].clone());
        assert!(empty.validate().is_err());
    }
}
