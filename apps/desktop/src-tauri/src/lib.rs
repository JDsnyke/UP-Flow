use keyring::Entry;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::str::FromStr;

const KEYRING_SERVICE: &str = "com.jdsnyke.up-flow";
const KEYRING_USER: &str = "personal_access_token";
const UP_API_BASE: &str = "https://api.up.com.au/api/v1";

static HTTP: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .use_rustls_tls()
        .build()
        .expect("reqwest client")
});

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
}

fn token_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

#[tauri::command]
fn token_save(token: String) -> Result<(), String> {
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return Err("Token cannot be empty.".to_string());
    }
    let entry = token_entry()?;
    entry
        .set_password(trimmed)
        .map_err(|e| format!("Could not save token to secure storage: {e}"))
}

#[tauri::command]
fn token_delete() -> Result<(), String> {
    let entry = token_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Could not remove token: {e}")),
    }
}

#[tauri::command]
fn token_exists() -> Result<bool, String> {
    let entry = token_entry()?;
    match entry.get_password() {
        Ok(p) => Ok(!p.trim().is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

async fn send_up_request(
    token: &str,
    method: &str,
    path: &str,
    query: Option<String>,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    if !path.starts_with('/') {
        return Err("API path must start with '/'.".to_string());
    }

    let mut url = format!("{UP_API_BASE}{path}");
    if let Some(q) = query {
        if !q.is_empty() {
            url.push('?');
            url.push_str(&q);
        }
    }

    let m = reqwest::Method::from_str(method).map_err(|_| format!("Invalid HTTP method: {method}"))?;

    let mut req = HTTP
        .request(m, &url)
        .header("Authorization", format!("Bearer {token}"));

    if let Some(b) = body {
        req = req
            .header("Content-Type", "application/json")
            .body(b);
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = response.status().as_u16();
    let response_body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))?;

    Ok(ApiResponse {
        status,
        body: response_body,
    })
}

#[tauri::command]
async fn up_api_validate_token(token: String) -> Result<ApiResponse, String> {
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return Err("Token cannot be empty.".to_string());
    }
    send_up_request(trimmed, "GET", "/util/ping", None, None).await
}

#[tauri::command]
async fn up_api_request(
    method: String,
    path: String,
    query: Option<String>,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    let entry = token_entry()?;
    let token = entry
        .get_password()
        .map_err(|_| "No Personal Access Token saved. Open Settings to add one.".to_string())?;

    send_up_request(&token, &method, &path, query, body).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            token_save,
            token_delete,
            token_exists,
            up_api_validate_token,
            up_api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
