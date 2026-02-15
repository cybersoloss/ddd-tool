mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::file::read_file,
            commands::file::write_file,
            commands::file::path_exists,
            commands::file::create_directory,
            commands::file::delete_file,
            commands::file::delete_directory,
            commands::file::list_directory,
            commands::file::append_log,
            commands::project::git_init,
            commands::project::git_add_all,
            commands::project::git_commit,
            commands::git::git_status,
            commands::git::git_log,
            commands::git::git_stage_file,
            commands::git::git_unstage_file,
            commands::git::git_clone,
            commands::implementation::compute_file_hash,
            commands::implementation::run_command,
            commands::file::watch_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
