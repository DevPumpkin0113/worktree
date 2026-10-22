use std::{fs, io, path::Path};

#[derive(Default, Debug)]
pub struct CleanupReport {
    pub removed: usize,
    pub retained: usize,
}

fn is_link(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        metadata.file_attributes() & 0x400 != 0 // Includes junctions, not just symbolic links.
    }
    #[cfg(not(windows))]
    {
        metadata.file_type().is_symlink()
    }
}

fn candidate_version(name: &str, current: &semver::Version) -> Option<String> {
    let prefix = "Worktree-";
    if !name.get(..prefix.len())?.eq_ignore_ascii_case(prefix) {
        return None;
    }
    let (version, random) = name[prefix.len()..].rsplit_once("-updater-")?;
    if !(6..=64).contains(&random.len()) || !random.bytes().all(|c| c.is_ascii_alphanumeric()) {
        return None;
    }
    let parsed = semver::Version::parse(version).ok()?;
    if parsed > *current {
        return None;
    }
    Some(version.to_owned())
}

fn remove_known_installer(directory: &Path, version: &str) -> io::Result<()> {
    let expected = format!("Worktree-{version}-installer.exe");
    let entries = fs::read_dir(directory)?.collect::<Result<Vec<_>, _>>()?;
    // Inspect the whole directory before removing anything. Extra files belong to the user.
    for entry in &entries {
        let metadata = fs::symlink_metadata(entry.path())?;
        if !metadata.is_file()
            || is_link(&metadata)
            || !entry
                .file_name()
                .to_string_lossy()
                .eq_ignore_ascii_case(&expected)
        {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "unknown updater directory contents",
            ));
        }
    }
    for entry in entries {
        // An installer still in use must be left for a later startup.
        let mut options = fs::OpenOptions::new();
        options.read(true);
        #[cfg(windows)]
        {
            use std::os::windows::fs::OpenOptionsExt;
            options.share_mode(0);
        }
        drop(options.open(entry.path())?);
        fs::remove_file(entry.path())?;
    }
    fs::remove_dir(directory)
}

pub fn cleanup_in(temp_root: &Path, current: &semver::Version) -> io::Result<CleanupReport> {
    let root = temp_root.canonicalize()?;
    let mut report = CleanupReport::default();
    for entry in fs::read_dir(&root)? {
        let Ok(entry) = entry else {
            continue;
        };
        let Some(version) = candidate_version(&entry.file_name().to_string_lossy(), current) else {
            continue;
        };
        let path = entry.path();
        let safe = fs::symlink_metadata(&path).is_ok_and(|m| m.is_dir() && !is_link(&m))
            && path
                .canonicalize()
                .is_ok_and(|p| p.parent() == Some(root.as_path()));
        if safe && remove_known_installer(&path, &version).is_ok() {
            report.removed += 1;
        } else {
            report.retained += 1;
        }
    }
    Ok(report)
}

pub fn cleanup_previous_installers() -> io::Result<CleanupReport> {
    let current = semver::Version::parse(env!("CARGO_PKG_VERSION")).expect("valid app version");
    cleanup_in(&std::env::temp_dir(), &current)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn candidate(root: &Path, name: &str, version: &str) -> std::path::PathBuf {
        let directory = root.join(name);
        fs::create_dir(&directory).unwrap();
        fs::write(
            directory.join(format!("Worktree-{version}-installer.exe")),
            b"fixture",
        )
        .unwrap();
        directory
    }
    fn version() -> semver::Version {
        semver::Version::parse("0.5.2").unwrap()
    }
    #[test]
    fn removes_only_completed_or_old_updates_including_lowercase_names() {
        let root = tempfile::tempdir().unwrap();
        let old = candidate(root.path(), "Worktree-0.5.0-updater-Ab12Cd", "0.5.0");
        let current = candidate(root.path(), "worktree-0.5.2-updater-Ab12Ce", "0.5.2");
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().removed, 2);
        assert!(!old.exists());
        assert!(!current.exists());
    }
    #[test]
    fn preserves_future_versions_unrelated_apps_and_inexact_names() {
        let root = tempfile::tempdir().unwrap();
        for name in [
            "Worktree-0.5.3-updater-Ab12Cd",
            "Other-0.5.0-updater-Ab12Cd",
            "Worktree-backup-updater-Ab12Cd",
            "Worktree-0.5.0-updater-not_a_temp_dir",
        ] {
            candidate(root.path(), name, "0.5.0");
        }
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().removed, 0);
        assert_eq!(fs::read_dir(root.path()).unwrap().count(), 4);
    }
    #[test]
    fn unexpected_files_or_subdirectories_prevent_all_removal() {
        let root = tempfile::tempdir().unwrap();
        let directory = candidate(root.path(), "Worktree-0.5.0-updater-Ab12Cd", "0.5.0");
        fs::write(directory.join("notes.txt"), "keep").unwrap();
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().retained, 1);
        assert!(directory.join("Worktree-0.5.0-installer.exe").exists());
        fs::remove_file(directory.join("notes.txt")).unwrap();
        fs::create_dir(directory.join("nested")).unwrap();
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().retained, 1);
    }
    #[test]
    fn removes_empty_known_directories_and_is_idempotent() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join("Worktree-0.5.1-updater-Ab12Cd")).unwrap();
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().removed, 1);
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().removed, 0);
    }
    #[cfg(windows)]
    #[test]
    fn locked_installer_is_retained_and_retried_on_later_startup() {
        use std::os::windows::fs::OpenOptionsExt;
        let root = tempfile::tempdir().unwrap();
        let directory = candidate(root.path(), "Worktree-0.5.0-updater-Ab12Cd", "0.5.0");
        let lock = fs::OpenOptions::new()
            .read(true)
            .share_mode(0)
            .open(directory.join("Worktree-0.5.0-installer.exe"))
            .unwrap();
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().retained, 1);
        assert!(directory.exists());
        drop(lock);
        assert_eq!(cleanup_in(root.path(), &version()).unwrap().removed, 1);
    }
    #[test]
    fn parses_prerelease_versions_without_accepting_newer_installers() {
        assert!(candidate_version("Worktree-0.5.2-beta.1-updater-Ab12Cd", &version()).is_some());
        assert!(candidate_version("Worktree-0.6.0-beta.1-updater-Ab12Cd", &version()).is_none());
    }
    #[cfg(windows)]
    #[test]
    fn junction_to_another_directory_is_never_traversed() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let target = candidate(outside.path(), "payload", "0.5.0");
        let junction = root.path().join("Worktree-0.5.0-updater-Ab12Cd");
        let result = std::process::Command::new("cmd.exe")
            .args(["/C", "mklink", "/J"])
            .arg(&junction)
            .arg(&target)
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "Could not create isolated junction fixture"
        );
        let report = cleanup_in(root.path(), &version()).unwrap();
        assert_eq!(report.removed, 0);
        assert_eq!(report.retained, 1);
        assert!(target.join("Worktree-0.5.0-installer.exe").exists());
        fs::remove_dir(&junction).unwrap();
    }
}
