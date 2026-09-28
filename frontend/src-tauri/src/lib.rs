mod http_client;
mod updater;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(updater::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            http_client::http_request,
            updater::get_app_version,
            updater::download_apk,
            updater::install_apk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
