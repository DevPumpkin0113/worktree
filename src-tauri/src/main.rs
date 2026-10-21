#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{path::PathBuf, sync::Mutex};
use tauri::Manager;
mod app_updates;
mod i18n;
mod project_files;
mod project_write;
mod projects;
mod session;
mod settings;
mod update_cleanup;
use app_updates::{
    check_app_update, get_build_info, install_app_update, open_issue_report, open_releases,
    UpdateState,
};
use settings::{initialize_settings, load_settings, save_settings};

#[derive(Default)]
struct OpenQueue(Mutex<Vec<String>>);

fn enqueue(state: &OpenQueue, paths: impl Iterator<Item = PathBuf>) {
    if let Ok(mut queue) = state.0.lock() {
        for path in paths {
            if path.is_dir() {
                queue.push(path.to_string_lossy().to_string());
                continue;
            }
            if let Some(ext) = path.extension().and_then(|x| x.to_str()) {
                if ext.eq_ignore_ascii_case("json")
                    && path.file_name().is_some_and(|name| name == "worktree.json")
                {
                    queue.push(path.to_string_lossy().to_string());
                }
            }
        }
    }
}

#[tauri::command]
fn take_open_requests(state: tauri::State<OpenQueue>) -> Result<Vec<String>, String> {
    let mut queue = state.0.lock().map_err(|e| e.to_string())?;
    Ok(std::mem::take(&mut *queue))
}

fn main() {
    tauri::Builder::default()
        .manage(OpenQueue::default())
        .manage(UpdateState::default())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            enqueue(
                &app.state::<OpenQueue>(),
                args.into_iter().skip(1).map(|arg| {
                    let p = PathBuf::from(arg);
                    if p.is_absolute() {
                        p
                    } else {
                        PathBuf::from(&cwd).join(p)
                    }
                }),
            );
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            session::setup(app)?;
            settings::setup(app)?;
            tauri::async_runtime::spawn_blocking(|| {
                if let Err(error) = update_cleanup::cleanup_previous_installers() {
                    eprintln!("{}", crate::i18n::cleanup_failed(&error));
                }
            });
            enqueue(
                &app.state::<OpenQueue>(),
                std::env::args_os().skip(1).map(PathBuf::from),
            );
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                enqueue(&window.state::<OpenQueue>(), paths.iter().cloned());
            }
        })
        .invoke_handler(tauri::generate_handler![
            take_open_requests,
            projects::read_project,
            projects::save_project,
            projects::initialize_project,
            projects::pick_project,
            projects::pick_project_parent,
            projects::scan_project,
            get_build_info,
            check_app_update,
            install_app_update,
            open_issue_report,
            open_releases,
            load_settings,
            initialize_settings,
            save_settings,
            session::load_session,
            session::save_session
        ])
        .run(tauri::generate_context!())
        .expect(crate::i18n::startup_failed());
}
