use serde::Serialize;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const RELEASE_API: &str = "https://api.github.com/repos/DevPumpkin0113/worktree/releases/latest";
const RELEASE_BASE: &str = "https://github.com/DevPumpkin0113/worktree/releases/download/";

#[derive(Default)]
pub struct UpdateState {
    busy: AtomicBool,
    pending: Mutex<Option<Update>>,
}
struct Operation<'a>(&'a AtomicBool);
impl<'a> Operation<'a> {
    fn start(busy: &'a AtomicBool) -> Result<Self, String> {
        busy.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "업데이트 작업이 이미 진행 중입니다.".to_string())?;
        Ok(Self(busy))
    }
}
impl Drop for Operation<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildInfo {
    version: &'static str,
    built_at: &'static str,
    commit: &'static str,
    channel: &'static str,
    platform: String,
}
#[tauri::command]
pub fn get_build_info() -> BuildInfo {
    BuildInfo {
        version: env!("CARGO_PKG_VERSION"),
        built_at: env!("WORKTREE_BUILD_TIME"),
        commit: env!("WORKTREE_COMMIT"),
        channel: env!("WORKTREE_BUILD_CHANNEL"),
        platform: format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    kind: &'static str,
    version: Option<String>,
    notes: String,
}

fn compare_versions(current: &str, latest: &str) -> Result<std::cmp::Ordering, String> {
    let current =
        semver::Version::parse(current).map_err(|_| "현재 앱 버전이 올바르지 않습니다.")?;
    let latest = semver::Version::parse(latest.strip_prefix('v').unwrap_or(latest))
        .map_err(|_| "릴리즈 버전이 올바르지 않습니다.")?;
    Ok(current.cmp(&latest))
}

fn valid_download(url: &reqwest::Url, version: &str) -> bool {
    let expected = format!("{RELEASE_BASE}v{version}/Worktree_{version}_x64-setup.exe");
    url.as_str() == expected
}

async fn fetch_latest_release() -> Result<Option<serde_json::Value>, String> {
    let response = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .user_agent(concat!("Worktree/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| e.to_string())?
        .get(RELEASE_API)
        .send()
        .await
        .map_err(|_| "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요.")?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    if response.status() == reqwest::StatusCode::FORBIDDEN
        || response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS
    {
        return Err("GitHub 조회 한도에 도달했습니다. 잠시 후 다시 시도하세요.".into());
    }
    let release: serde_json::Value = response
        .error_for_status()
        .map_err(|e| {
            format!(
                "업데이트 서버 오류: {}",
                e.status().map(|s| s.as_u16()).unwrap_or(0)
            )
        })?
        .json()
        .await
        .map_err(|_| "릴리즈 정보를 읽지 못했습니다.")?;
    Ok(Some(release))
}

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    state: State<'_, UpdateState>,
) -> Result<CheckResult, String> {
    let _operation = Operation::start(&state.busy)?;
    *state
        .pending
        .lock()
        .map_err(|_| "업데이트 상태를 읽지 못했습니다.")? = None;
    let Some(release) = fetch_latest_release().await? else {
        return Ok(CheckResult {
            kind: "no-release",
            version: None,
            notes: String::new(),
        });
    };
    let tag = release["tag_name"]
        .as_str()
        .ok_or("릴리즈 버전이 없습니다.")?;
    let version = tag.strip_prefix('v').unwrap_or(tag).to_string();
    let comparison = compare_versions(env!("CARGO_PKG_VERSION"), &version)?;
    let notes: String = release["body"]
        .as_str()
        .unwrap_or("")
        .chars()
        .take(16000)
        .collect();
    if comparison != std::cmp::Ordering::Less {
        return Ok(CheckResult {
            kind: if comparison.is_gt() {
                "ahead"
            } else {
                "latest"
            },
            version: Some(version),
            notes: String::new(),
        });
    }
    let has_manifest = release["assets"]
        .as_array()
        .is_some_and(|assets| assets.iter().any(|a| a["name"] == "latest.json"));
    if !has_manifest {
        return Ok(CheckResult {
            kind: "manual",
            version: Some(version),
            notes,
        });
    }
    let mut update = app
        .updater_builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|_| "서명 업데이트 정보를 확인하지 못했습니다. 잠시 후 다시 시도하세요.")?
        .ok_or("릴리즈 정보가 변경되었습니다. 다시 확인하세요.")?;
    if update.version != version || !valid_download(&update.download_url, &version) {
        return Err("릴리즈와 설치 파일 정보가 일치하지 않습니다. 다시 확인하세요.".into());
    }
    update.timeout = Some(Duration::from_secs(300));
    *state
        .pending
        .lock()
        .map_err(|_| "업데이트 상태를 저장하지 못했습니다.")? = Some(update);
    Ok(CheckResult {
        kind: "available",
        version: Some(version),
        notes,
    })
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    phase: &'static str,
    downloaded: u64,
    total: Option<u64>,
}

#[tauri::command]
pub async fn install_app_update(
    state: State<'_, UpdateState>,
    on_progress: Channel<UpdateProgress>,
) -> Result<bool, String> {
    let _operation = Operation::start(&state.busy)?;
    let update = state
        .pending
        .lock()
        .map_err(|_| "업데이트 상태를 읽지 못했습니다.")?
        .clone()
        .ok_or("업데이트를 먼저 확인하세요.")?;
    let version = update.version.clone();
    let confirmed = tauri::async_runtime::spawn_blocking(move || {
        rfd::MessageDialog::new().set_title("Worktree 업데이트")
            .set_description(format!("Worktree {version}을 다운로드하고 설치할까요?\n설치가 시작되면 앱이 종료됩니다. 설치 후 Worktree를 다시 실행해 주세요."))
            .set_buttons(rfd::MessageButtons::OkCancel).show() == rfd::MessageDialogResult::Ok
    }).await.map_err(|e| e.to_string())?;
    if !confirmed {
        return Ok(false);
    }
    let mut downloaded = 0_u64;
    let progress = on_progress.clone();
    let bytes = update
        .download(
            move |chunk, total| {
                downloaded += chunk as u64;
                let _ = progress.send(UpdateProgress {
                    phase: "downloading",
                    downloaded,
                    total,
                });
            },
            || {},
        )
        .await
        .map_err(|_| {
            "다운로드 또는 서명 검증에 실패했습니다. 설치하지 않았습니다. 다시 시도하세요."
        })?;
    let _ = on_progress.send(UpdateProgress {
        phase: "installing",
        downloaded: bytes.len() as u64,
        total: Some(bytes.len() as u64),
    });
    tauri::async_runtime::spawn_blocking(move || update.install(bytes))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|_| "설치 프로그램을 실행하지 못했습니다. 다시 시도하세요.".to_string())?;
    Ok(true)
}

fn issue_url() -> reqwest::Url {
    let info = get_build_info();
    let body = format!("## 발생한 문제\n\n\n## 재현 방법\n1. \n\n## 기대한 동작\n\n\n## 앱 정보\n- 버전: {}\n- 빌드: {} / {}\n- 빌드 일시(Unix UTC): {}\n- 환경: {}\n\n문서 내용이나 개인 경로는 포함되지 않습니다. 첨부 자료의 개인정보를 확인해 주세요.\n", info.version, info.channel, info.commit, info.built_at, info.platform);
    let mut url =
        reqwest::Url::parse("https://github.com/DevPumpkin0113/worktree/issues/new").unwrap();
    url.query_pairs_mut().append_pair("body", &body);
    url
}
#[tauri::command]
pub async fn open_issue_report() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| open::that(issue_url().as_str()))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|_| {
            "기본 브라우저를 열지 못했습니다. GitHub 저장소의 Issues에서 제보해 주세요.".into()
        })
}
#[tauri::command]
pub async fn open_releases() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| {
        open::that("https://github.com/DevPumpkin0113/worktree/releases/latest")
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn semver_order_handles_two_digit_and_prerelease_versions() {
        assert!(compare_versions("0.9.0", "v0.10.0").unwrap().is_lt());
        assert!(compare_versions("0.5.0", "v0.4.0").unwrap().is_gt());
        assert!(compare_versions("0.5.0-beta.1", "v0.5.0").unwrap().is_lt());
        assert!(compare_versions("0.5.0", "invalid").is_err());
    }
    #[test]
    fn installer_must_match_repository_version_and_architecture() {
        assert!(valid_download(
            &reqwest::Url::parse(&format!(
                "{RELEASE_BASE}v0.5.0/Worktree_0.5.0_x64-setup.exe"
            ))
            .unwrap(),
            "0.5.0"
        ));
        for url in ["https://evil.test/setup.exe", "https://github.com/DevPumpkin0113/worktree/releases/download/v0.4.0/Worktree_0.4.0_x64-setup.exe"] {
            assert!(!valid_download(&reqwest::Url::parse(url).unwrap(), "0.5.0"));
        }
    }
    #[test]
    fn issue_report_is_a_draft_on_the_fixed_repository() {
        let url = issue_url();
        assert_eq!(url.host_str(), Some("github.com"));
        assert_eq!(url.path(), "/DevPumpkin0113/worktree/issues/new");
        assert!(url
            .query_pairs()
            .any(|(key, value)| key == "body" && value.contains(env!("CARGO_PKG_VERSION"))));
    }
    #[test]
    fn concurrent_operations_are_rejected_and_unlock_after_failure() {
        let busy = AtomicBool::new(false);
        let operation = Operation::start(&busy).unwrap();
        assert!(Operation::start(&busy).is_err());
        drop(operation);
        assert!(Operation::start(&busy).is_ok());
    }

    #[test]
    #[ignore = "Requires live GitHub network access"]
    fn live_github_release_uses_the_app_http_client() {
        let release = tauri::async_runtime::block_on(fetch_latest_release())
            .unwrap()
            .expect("Public release expected");
        let tag = release["tag_name"].as_str().unwrap();
        let comparison = compare_versions(env!("CARGO_PKG_VERSION"), tag).unwrap();
        assert!(comparison.is_gt() || comparison.is_eq());
        println!(
            "Live release: {tag}; current: {}",
            env!("CARGO_PKG_VERSION")
        );
    }

    #[test]
    #[ignore = "Requires locally built signed NSIS installer"]
    fn signed_installer_verifies_and_tampering_is_rejected() {
        use base64::Engine;
        let decode = |text: &str| {
            String::from_utf8(
                base64::engine::general_purpose::STANDARD
                    .decode(text.trim())
                    .unwrap(),
            )
            .unwrap()
        };
        let config: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let public_key = minisign_verify::PublicKey::decode(&decode(
            config["plugins"]["updater"]["pubkey"].as_str().unwrap(),
        ))
        .unwrap();
        let installer = format!(
            "target/release/bundle/nsis/Worktree_{}_x64-setup.exe",
            env!("CARGO_PKG_VERSION")
        );
        let mut bytes = std::fs::read(&installer).unwrap();
        let signature = minisign_verify::Signature::decode(&decode(
            &std::fs::read_to_string(format!("{installer}.sig")).unwrap(),
        ))
        .unwrap();
        public_key.verify(&bytes, &signature, true).unwrap();
        assert!(signature
            .trusted_comment()
            .contains(&format!("version:{}", env!("CARGO_PKG_VERSION"))));
        bytes[0] ^= 1;
        assert!(public_key.verify(&bytes, &signature, true).is_err());
    }
}
