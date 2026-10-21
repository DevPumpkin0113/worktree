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
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Session {
    schema_version: u32,
    recent_files: Vec<String>,
    tabs: Vec<DocumentTab>,
    active_path: Option<String>,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            schema_version: 1,
            recent_files: vec![],
            tabs: vec![],
            active_path: None,
        }
    }
}

fn valid_path(value: &str) -> bool {
    let path = Path::new(value);
    !value.contains('\0')
        && value.len() <= 32767
        && path.is_absolute()
        && path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ["wbs", "md", "markdown"].contains(&ext.to_lowercase().as_str()))
}

impl Session {
    fn validate(&self) -> Result<(), String> {
        if self.schema_version != 1 {
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
            })
            || self
                .active_path
                .as_ref()
                .is_some_and(|path| !self.tabs.iter().any(|tab| &tab.path == path))
        {
            return Err(crate::i18n::invalid_session().into());
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
            }],
            active_path: Some(path),
            ..Session::default()
        }
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
            r#"{"schemaVersion":2,"recentFiles":[],"tabs":[],"activePath":null}"#,
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
}
