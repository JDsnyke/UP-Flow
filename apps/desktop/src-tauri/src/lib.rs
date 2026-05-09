use keyring::Entry;
use hmac::{Hmac, Mac};
use log::info;
use once_cell::sync::Lazy;
use serde::Serialize;
use sha2::Sha256;
use std::cmp::min;
use std::str::FromStr;
use std::time::{Duration, Instant, SystemTime};
use subtle::ConstantTimeEq;

const KEYRING_SERVICE: &str = "com.jdsnyke.up-flow";
const KEYRING_USER: &str = "personal_access_token";
const UP_API_BASE: &str = "https://api.up.com.au/api/v1";
const USER_AGENT: &str = concat!("up-flow/", env!("CARGO_PKG_VERSION"));
const REQUEST_TIMEOUT_SECS: u64 = 20;
const RETRY_BUDGET_MS: u64 = 8_000;
const MAX_ATTEMPTS: usize = 3;
const BASE_BACKOFF_MS: u64 = 300;
const MAX_BACKOFF_MS: u64 = 3_500;

type HmacSha256 = Hmac<Sha256>;

static LOGGER: Lazy<()> = Lazy::new(|| {
    let _ = env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .is_test(false)
        .try_init();
});

static HTTP: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .use_rustls_tls()
        .min_tls_version(reqwest::tls::Version::TLS_1_2)
        .user_agent(USER_AGENT)
        .connect_timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .tcp_keepalive(Duration::from_secs(30))
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

fn redacted_path(path: &str) -> String {
    let normalized = path.trim_matches('/');
    if normalized.is_empty() {
        return "/".to_string();
    }
    let mut out = String::with_capacity(path.len());
    for seg in normalized.split('/') {
        out.push('/');
        if seg.len() > 8 {
            out.push_str("{id}");
        } else {
            out.push_str(seg);
        }
    }
    out
}

fn retry_after_delay_ms(headers: &reqwest::header::HeaderMap) -> Option<u64> {
    let raw = headers.get(reqwest::header::RETRY_AFTER)?.to_str().ok()?.trim();
    if let Ok(secs) = raw.parse::<u64>() {
        return Some(secs.saturating_mul(1000));
    }
    let when = httpdate::parse_http_date(raw).ok()?;
    let now = SystemTime::now();
    let dur = when.duration_since(now).ok()?;
    Some(dur.as_millis() as u64)
}

fn backoff_delay_ms(attempt: usize, retry_after_ms: Option<u64>) -> u64 {
    if let Some(ms) = retry_after_ms {
        return min(ms, MAX_BACKOFF_MS);
    }
    let exp = BASE_BACKOFF_MS.saturating_mul(1 << (attempt.saturating_sub(1)));
    let capped = min(exp, MAX_BACKOFF_MS);
    if capped <= 1 {
        return capped;
    }
    rand::random::<u64>() % capped + 1
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
    Lazy::force(&LOGGER);
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

    let started = Instant::now();
    let redacted = redacted_path(path);
    let body_for_retry = body;
    let mut last_error: Option<String> = None;

    for attempt in 1..=MAX_ATTEMPTS {
        let mut req = HTTP
            .request(m.clone(), &url)
            .header("Authorization", format!("Bearer {token}"));

        if let Some(ref b) = body_for_retry {
            req = req
                .header("Content-Type", "application/json")
                .body(b.clone());
        }

        match req.send().await {
            Ok(response) => {
                let status = response.status().as_u16();
                let retryable = status == 429 || status >= 500;

                if retryable && attempt < MAX_ATTEMPTS && started.elapsed().as_millis() < RETRY_BUDGET_MS as u128 {
                    let delay = backoff_delay_ms(attempt, retry_after_delay_ms(response.headers()));
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                    continue;
                }

                let response_body = response
                    .text()
                    .await
                    .map_err(|e| format!("Failed to read response: {e}"))?;
                info!(
                    "{} {} -> {} in {}ms",
                    method,
                    redacted,
                    status,
                    started.elapsed().as_millis()
                );
                return Ok(ApiResponse {
                    status,
                    body: response_body,
                });
            }
            Err(e) => {
                last_error = Some(format!("Network error: {e}"));
                if attempt < MAX_ATTEMPTS && started.elapsed().as_millis() < RETRY_BUDGET_MS as u128 {
                    let delay = backoff_delay_ms(attempt, None);
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                    continue;
                }
            }
        }
    }

    Err(last_error.unwrap_or_else(|| "Network error".to_string()))
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

#[tauri::command]
fn up_webhook_verify(signature_hex: String, raw_body: String, secret_key: String) -> Result<bool, String> {
    let sig = hex::decode(signature_hex.trim()).map_err(|_| "Signature must be valid hex.".to_string())?;
    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .map_err(|_| "Invalid secret key.".to_string())?;
    mac.update(raw_body.as_bytes());
    let expected = mac.finalize().into_bytes();
    if sig.len() != expected.len() {
        return Ok(false);
    }
    Ok(sig.as_slice().ct_eq(expected.as_slice()).into())
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
            up_api_request,
            up_webhook_verify
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
