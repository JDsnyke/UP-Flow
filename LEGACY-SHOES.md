# Legacy Shoes 3 prototype

The original UP Flow shipped as a **Ruby + Shoes 3** GUI with:

- Windows-only helpers (`start` for URLs and updater)
- Custom “encryption” for the API token on disk
- `VERIFY_NONE` for TLS in HTTP clients (insecure)
- Static JSON snapshots under `assets/data/`

**Do not use this path for new development.** The maintained replacement is [`apps/desktop`](apps/desktop) (Tauri + React).

If you need historical behavior, see `legacy/app.rb` and `legacy/assets/engine.rb`. Prefer porting features into the new app’s `src/features/` modules and `src/lib/up-api/` client.
