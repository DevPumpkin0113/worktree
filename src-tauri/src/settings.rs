use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Manager, State};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct Settings {
    schema_version: u32,
    id_separator: String,
    detail_mode: String,
    auto_check_updates: bool,
    language: String,
    display_name: String,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            schema_version: 2,
            id_separator: "none".into(),
            detail_mode: "tabs".into(),
            auto_check_updates: true,
            language: "ko".into(),
            display_name: String::new(),
        }
    }
}
impl Settings {
    fn validate(&self) -> Result<(), String> {
        if self.schema_version != 2 {
            return Err(crate::i18n::unsupported_settings().into());
        }
        if !["ko", "en"].contains(&self.language.as_str())
            || !["none", "hyphen"].contains(&self.id_separator.as_str())
            || !["modal", "tabs", "sidebar"].contains(&self.detail_mode.as_str())
            || self.display_name.trim() != self.display_name
            || self.display_name.encode_utf16().count() > 40
            || self.display_name.contains(['\r', '\n', '\0'])
        {
            return Err(crate::i18n::invalid_settings().into());
        }
        Ok(())
    }
}

pub struct SettingsStore {
    path: PathBuf,
    lock: Mutex<()>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedSettings {
    settings: Option<Settings>,
    warning: String,
}

impl SettingsStore {
    fn at(directory: &Path) -> Self {
        Self {
            path: directory.join("settings.json"),
            lock: Mutex::new(()),
        }
    }
    fn read(&self) -> Result<LoadedSettings, String> {
        let text = match fs::read_to_string(&self.path) {
            Ok(text) => text,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(LoadedSettings {
                    settings: None,
                    warning: String::new(),
                })
            }
            Err(e) => return Err(crate::i18n::settings_read_failed(&e)),
        };
        let text = text.trim_start_matches('\u{feff}');
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(text) {
            if value
                .get("schemaVersion")
                .is_some_and(|version| version != 1 && version != 2)
            {
                return Err(crate::i18n::unsupported_settings().into());
            }
        }
        let settings = serde_json::from_str::<Settings>(text)
            .ok()
            .map(|mut value| {
                if value.schema_version == 1 {
                    value.schema_version = 2;
                    value.language = "ko".into();
                }
                value
            })
            .filter(|value| value.validate().is_ok());
        if let Some(settings) = settings {
            return Ok(LoadedSettings {
                settings: Some(settings),
                warning: String::new(),
            });
        }
        // Preserve malformed user edits before recovering; backup failure must not overwrite the original.
        let parent = self
            .path
            .parent()
            .ok_or(crate::i18n::settings_folder_missing())?;
        let mut backup = tempfile::Builder::new()
            .prefix("settings.invalid-")
            .suffix(".json")
            .tempfile_in(parent)
            .map_err(|e| e.to_string())?;
        backup
            .write_all(text.as_bytes())
            .map_err(|e| e.to_string())?;
        backup.as_file().sync_all().map_err(|e| e.to_string())?;
        let (_, backup_path) = backup.keep().map_err(|e| e.to_string())?;
        let settings = Settings::default();
        self.write(&settings)?;
        Ok(LoadedSettings {
            settings: Some(settings),
            warning: crate::i18n::settings_recovered(&(backup_path.display())),
        })
    }
    fn write(&self, settings: &Settings) -> Result<(), String> {
        settings.validate()?;
        let parent = self
            .path
            .parent()
            .ok_or(crate::i18n::settings_folder_missing())?;
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let mut file = tempfile::Builder::new()
            .prefix("settings-")
            .suffix(".tmp")
            .tempfile_in(parent)
            .map_err(|e| e.to_string())?;
        let mut bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
        bytes.push(b'\n');
        file.write_all(&bytes).map_err(|e| e.to_string())?;
        file.as_file().sync_all().map_err(|e| e.to_string())?;
        file.persist(&self.path)
            .map_err(|e| crate::i18n::settings_save_failed(&e.error))?;
        Ok(())
    }
}

pub fn profile_directory(local: &Path) -> PathBuf {
    let directory = local.join("Worktree");
    let legacy = local.join("local.toothless.worktree");
    if !directory.join("settings.json").exists() && legacy.join("EBWebView").is_dir() {
        legacy
    } else {
        directory
    }
}

pub fn setup(app: &mut tauri::App) -> tauri::Result<()> {
    let local = app.path().local_data_dir()?;
    app.manage(SettingsStore::at(&local.join("Worktree")));
    let config = app
        .config()
        .app
        .windows
        .first()
        .expect("main window configuration");
    tauri::WebviewWindowBuilder::from_config(app, config)?
        .data_directory(profile_directory(&local))
        .build()?;
    Ok(())
}

#[tauri::command]
pub fn load_settings(state: State<SettingsStore>) -> Result<LoadedSettings, String> {
    let _lock = state.lock.lock().map_err(|e| e.to_string())?;
    let loaded = state.read()?;
    if let Some(settings) = &loaded.settings {
        crate::i18n::set_language(&settings.language);
    }
    Ok(loaded)
}
#[tauri::command]
pub fn initialize_settings(
    settings: Settings,
    state: State<SettingsStore>,
) -> Result<Settings, String> {
    let _lock = state.lock.lock().map_err(|e| e.to_string())?;
    if let Some(current) = state.read()?.settings {
        crate::i18n::set_language(&current.language);
        return Ok(current);
    }
    state.write(&settings)?;
    crate::i18n::set_language(&settings.language);
    Ok(settings)
}
#[tauri::command]
pub fn save_settings(settings: Settings, state: State<SettingsStore>) -> Result<Settings, String> {
    let _lock = state.lock.lock().map_err(|e| e.to_string())?;
    // A future schema or external read error must not be silently overwritten.
    state.read()?;
    state.write(&settings)?;
    crate::i18n::set_language(&settings.language);
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tab_detail_mode_round_trips_and_legacy_modal_remains_readable() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(dir.path());
        let mut settings = Settings::default();
        settings.detail_mode = "tabs".into();
        store.write(&settings).unwrap();
        assert_eq!(store.read().unwrap().settings.unwrap(), settings);
        settings.detail_mode = "modal".into();
        assert!(settings.validate().is_ok());
    }

    #[test]
    fn display_name_defaults_and_round_trip_preserve_old_settings() {
        let root = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(root.path());
        fs::write(
            &store.path,
            r#"{"schemaVersion":2,"language":"en","detailMode":"modal"}"#,
        )
        .unwrap();
        let mut settings = store.read().unwrap().settings.unwrap();
        assert!(settings.display_name.is_empty());
        settings.display_name = "박대호".into();
        store.write(&settings).unwrap();
        assert_eq!(store.read().unwrap().settings.unwrap(), settings);
        let bytes = fs::read(&store.path).unwrap();
        for invalid in [
            " padded".to_string(),
            "line\nbreak".to_string(),
            "x".repeat(41),
        ] {
            settings.display_name = invalid;
            assert!(store.write(&settings).is_err());
            assert_eq!(fs::read(&store.path).unwrap(), bytes);
        }
    }
    #[test]
    fn language_migrates_from_v1_and_roundtrips_in_v2() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(dir.path());
        let original = r#"{"schemaVersion":1,"idSeparator":"hyphen","detailMode":"modal","autoCheckUpdates":false}"#;
        fs::write(&store.path, original).unwrap();
        let mut settings = store.read().unwrap().settings.unwrap();
        assert_eq!(settings.schema_version, 2);
        assert_eq!(settings.language, "ko");
        assert_eq!(fs::read_to_string(&store.path).unwrap(), original);
        settings.language = "en".into();
        store.write(&settings).unwrap();
        assert_eq!(store.read().unwrap().settings.unwrap(), settings);
        let saved = fs::read(&store.path).unwrap();
        settings.language = "invalid".into();
        assert!(store.write(&settings).is_err());
        assert_eq!(fs::read(&store.path).unwrap(), saved);
    }
    #[test]
    fn settings_round_trip_replaces_existing_file_without_temporary_residue() {
        let root = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(root.path());
        assert!(store.read().unwrap().settings.is_none());
        let mut settings = Settings::default();
        store.write(&settings).unwrap();
        settings.id_separator = "hyphen".into();
        settings.detail_mode = "modal".into();
        settings.auto_check_updates = false;
        store.write(&settings).unwrap();
        assert_eq!(store.read().unwrap().settings.unwrap(), settings);
        assert_eq!(fs::read_dir(root.path()).unwrap().count(), 1);
    }
    #[test]
    fn corrupted_json_is_backed_up_before_recovery() {
        let root = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(root.path());
        fs::write(&store.path, "{ broken json").unwrap();
        let result = store.read().unwrap();
        assert_eq!(result.settings.unwrap(), Settings::default());
        assert!(!result.warning.is_empty());
        let backup = fs::read_dir(root.path())
            .unwrap()
            .map(|e| e.unwrap().path())
            .find(|p| {
                p.file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("settings.invalid-")
            })
            .unwrap();
        assert_eq!(fs::read_to_string(backup).unwrap(), "{ broken json");
    }
    #[test]
    fn unknown_schema_and_invalid_save_do_not_destroy_existing_settings() {
        let root = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(root.path());
        let future = r#"{"schemaVersion":3,"newFeature":true}"#;
        fs::write(&store.path, future).unwrap();
        assert!(store.read().is_err());
        assert_eq!(fs::read_to_string(&store.path).unwrap(), future);
        let bad = Settings {
            id_separator: "bad".into(),
            ..Settings::default()
        };
        assert!(store.write(&bad).is_err());
        assert_eq!(fs::read_to_string(&store.path).unwrap(), future);
    }
    #[test]
    fn profile_uses_legacy_only_until_json_is_created() {
        let root = tempfile::tempdir().unwrap();
        assert_eq!(profile_directory(root.path()), root.path().join("Worktree"));
        let old = root.path().join("local.toothless.worktree");
        fs::create_dir_all(old.join("EBWebView")).unwrap();
        assert_eq!(profile_directory(root.path()), old);
        SettingsStore::at(&root.path().join("Worktree"))
            .write(&Settings::default())
            .unwrap();
        assert_eq!(profile_directory(root.path()), root.path().join("Worktree"));
    }
    #[test]
    fn bom_and_partial_settings_are_supported_but_invalid_types_are_recovered() {
        let root = tempfile::tempdir().unwrap();
        let store = SettingsStore::at(root.path());
        fs::write(&store.path, "\u{feff}{\"autoCheckUpdates\":false}").unwrap();
        assert!(!store.read().unwrap().settings.unwrap().auto_check_updates);
        fs::write(&store.path, r#"{"autoCheckUpdates":"false"}"#).unwrap();
        assert!(!store.read().unwrap().warning.is_empty());
    }
}
