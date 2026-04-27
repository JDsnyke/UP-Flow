# AGENTS.md — UP Flow

- **Active app:** `apps/desktop` (Tauri 2 + React + TypeScript). Legacy Ruby/Shoes code is reference-only.
- **API access:** All Up HTTP calls go through Rust (`up_api_request`) with bearer token from keychain; base `https://api.up.com.au/api/v1`.
- **Token UX:** Validate with `GET /util/ping` before persisting; never write tokens to repo files.
- **Rust toolchain:** `apps/desktop/src-tauri/rust-toolchain.toml` pins **1.88+** for Tauri dependencies.
- **Docs:** [developer.up.com.au](https://developer.up.com.au/)
