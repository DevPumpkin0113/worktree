use std::{
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
fn git(args: &[&str]) -> Option<String> {
    Command::new("git")
        .args(args)
        .current_dir("..")
        .output()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
}
fn main() {
    println!("cargo:rerun-if-env-changed=WORKTREE_RELEASE_BUILD");
    println!("cargo:rerun-if-env-changed=SOURCE_DATE_EPOCH");
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-changed=../.git/index");
    println!("cargo:rerun-if-changed=../src");
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=../index.html");
    let timestamp = std::env::var("SOURCE_DATE_EPOCH")
        .ok()
        .filter(|s| s.parse::<u64>().is_ok())
        .unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                .to_string()
        });
    let mut commit = git(&["rev-parse", "--short=8", "HEAD"]).unwrap_or_else(|| "unknown".into());
    if git(&["status", "--porcelain"]).is_some_and(|s| !s.is_empty()) {
        commit.push_str("+dirty");
    }
    let channel = if std::env::var("WORKTREE_RELEASE_BUILD").as_deref() == Ok("1") {
        "release"
    } else {
        "development"
    };
    println!("cargo:rustc-env=WORKTREE_BUILD_TIME={timestamp}");
    println!("cargo:rustc-env=WORKTREE_COMMIT={commit}");
    println!("cargo:rustc-env=WORKTREE_BUILD_CHANNEL={channel}");
    tauri_build::build()
}
