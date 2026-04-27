# UP Flow (desktop)

Cross-platform Tauri + React app for the Up Banking API.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Vite only (web UI; Up API calls need Tauri IPC) |
| `npm run tauri dev` | Full app with Rust backend |
| `npm run build` | Typecheck + Vite production build |
| `npm run tauri build` | Native bundles |

## Configuration

- **API base:** `https://api.up.com.au/api/v1` (hard-coded in `src-tauri/src/lib.rs`).
- **Token:** stored with service `com.jdsnyke.up-flow` via `keyring`.

## Project layout

- `src/` — React UI, TanStack Query, Tailwind
- `src/lib/up-api/` — typed helpers + Tauri `invoke` wrappers
- `src/features/*` — screens
- `src-tauri/` — Rust: TLS + keychain + proxied API requests

## Troubleshooting

- If `npm run tauri build` fails with an error about invalid `--ci`, unset `CI` (e.g. `CI= npm run tauri build`). Some CI sandboxes export `CI=1` in a form the CLI rejects.
