use std::{
    fs::{self, File, OpenOptions},
    sync::{Mutex, MutexGuard},
};
pub struct StorageLock {
    thread: Mutex<()>,
}
pub struct StorageGuard<'a> {
    _file: File,
    _thread: MutexGuard<'a, ()>,
}
impl StorageLock {
    pub const fn new() -> Self {
        Self {
            thread: Mutex::new(()),
        }
    }
    pub fn lock(&self) -> Result<StorageGuard<'_>, String> {
        self.acquire(&std::env::temp_dir().join("worktree-storage-v1.lock"), true)
    }
    #[cfg(test)]
    fn lock_at(&self, path: &std::path::Path) -> Result<StorageGuard<'_>, String> {
        self.acquire(path, false)
    }
    fn acquire(&self, path: &std::path::Path, wait: bool) -> Result<StorageGuard<'_>, String> {
        let guard = self.thread.lock().map_err(|e| e.to_string())?;
        // The lock file contains no project data and is retained for future processes.
        if let Ok(meta) = fs::symlink_metadata(&path) {
            if crate::project_files::is_link(&meta) || !meta.is_file() {
                return Err(crate::project_files::invalid());
            }
        }
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&path)
            .map_err(|e| e.to_string())?;
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        loop {
            match file.try_lock() {
                Ok(()) => break,
                Err(std::fs::TryLockError::WouldBlock)
                    if wait && std::time::Instant::now() < deadline =>
                {
                    std::thread::sleep(std::time::Duration::from_millis(20));
                }
                Err(error) => return Err(error.to_string()),
            }
        }
        Ok(StorageGuard {
            _thread: guard,
            _file: file,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn process_probe() {
        let Ok(path) = std::env::var("WORKTREE_LOCK_PROBE_PATH") else {
            return;
        };
        let lock = StorageLock::new();
        assert_eq!(
            lock.lock_at(std::path::Path::new(&path)).is_ok(),
            std::env::var("WORKTREE_LOCK_PROBE_FREE").unwrap() == "yes"
        );
    }
    #[test]
    fn other_process_is_blocked_until_owner_releases_lock() {
        let temporary = tempfile::tempdir().unwrap();
        let path = temporary.path().join("storage.lock");
        let lock = StorageLock::new();
        let guard = lock.lock_at(&path).unwrap();
        let probe = |free: &str| {
            std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact", "storage_lock::tests::process_probe"])
                .env("WORKTREE_LOCK_PROBE_PATH", &path)
                .env("WORKTREE_LOCK_PROBE_FREE", free)
                .output()
                .unwrap()
        };
        assert!(probe("no").status.success());
        drop(guard);
        assert!(probe("yes").status.success());
    }
}
