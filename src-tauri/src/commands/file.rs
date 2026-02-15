use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

use notify::{Watcher, RecursiveMode, EventKind};
use tauri::Emitter;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories for {}: {}", path, e))?;
    }
    fs::write(&path, contents).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory {}: {}", path, e))
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        fs::remove_file(p).map_err(|e| format!("Failed to delete file {}: {}", path, e))
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn delete_directory(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        fs::remove_dir_all(p).map_err(|e| format!("Failed to delete directory {}: {}", path, e))
    } else {
        Ok(())
    }
}

/// Append a line to a log file with rotation (max_bytes per file, keep max_files).
#[tauri::command]
pub fn append_log(path: String, line: String, max_bytes: u64, max_files: u32) -> Result<(), String> {
    let log_path = Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = log_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create log directory: {}", e))?;
    }

    // Check if rotation is needed
    if log_path.exists() {
        if let Ok(meta) = fs::metadata(log_path) {
            if meta.len() >= max_bytes {
                // Rotate: .4 -> delete, .3 -> .4, .2 -> .3, .1 -> .2, current -> .1
                for i in (1..max_files).rev() {
                    let from = if i == 1 {
                        path.clone()
                    } else {
                        format!("{}.{}", path, i - 1)
                    };
                    let to = format!("{}.{}", path, i);
                    if Path::new(&from).exists() {
                        let _ = fs::rename(&from, &to);
                    }
                }
            }
        }
    }

    // Append line
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;
    writeln!(file, "{}", line)
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn list_directory(path: String) -> Vec<String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Vec::new();
    }
    match fs::read_dir(p) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter_map(|e| e.file_name().into_string().ok())
            .collect(),
        Err(_) => Vec::new(),
    }
}

#[tauri::command]
pub fn watch_directory(window: tauri::Window, path: String) -> Result<(), String> {
    let watch_path = path.clone();
    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create watcher: {}", e);
                return;
            }
        };
        if let Err(e) = watcher.watch(Path::new(&watch_path), RecursiveMode::Recursive) {
            eprintln!("Failed to watch {}: {}", watch_path, e);
            return;
        }

        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    if matches!(
                        event.kind,
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                    ) {
                        let paths: Vec<String> = event
                            .paths
                            .iter()
                            .filter_map(|p| p.to_str().map(String::from))
                            .filter(|p| {
                                p.ends_with(".yaml")
                                    || p.ends_with(".yml")
                                    || p.ends_with(".json")
                            })
                            .collect();
                        if !paths.is_empty() {
                            let _ = window.emit("spec-files-changed", &paths);
                        }
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Watch error: {}", e);
                }
                Err(_) => break,
            }
        }
    });
    Ok(())
}
