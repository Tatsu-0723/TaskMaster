// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

// データを保存する関数
#[tauri::command]
fn save_tasks(data: String) -> Result<(), String> {
    fs::write("tasks.json", data).map_err(|e| e.to_string())
}

// データを読み込む関数
#[tauri::command]
fn load_tasks() -> Result<String, String> {
    if std::path::Path::new("tasks.json").exists() {
        fs::read_to_string("tasks.json").map_err(|e| e.to_string())
    } else {
        Ok("[]".to_string()) // ファイルがない場合は空の配列を返す
    }
}

fn main() {
    tauri::Builder::default()
        // この generate_handler! に [save_tasks, load_tasks] が入っていることが必須です
        .invoke_handler(tauri::generate_handler![save_tasks, load_tasks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}