# UP Flow

Unofficial desktop client for **Up Bank (Australia)** using the [Up Banking API](https://developer.up.com.au/) (v1). Personal Access Token only — requests run through a local **Tauri** backend with **TLS verification** (avoids browser CORS limits).

## Modern app (recommended)

The current implementation lives in [`apps/desktop`](apps/desktop):

- **Stack:** Tauri 2, React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Recharts.
- **Platforms:** macOS, Windows, Linux (build from the same codebase).
- **Token storage:** OS keychain / credential manager via the Rust `keyring` crate (not plaintext on disk).

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://www.rust-lang.org/) — the app pins **1.88+** via [`apps/desktop/src-tauri/rust-toolchain.toml`](apps/desktop/src-tauri/rust-toolchain.toml) (install with `rustup`; first `cargo` run may fetch that toolchain).

### Development

```bash
cd apps/desktop
npm install
npm run tauri dev
```

### Build

```bash
cd apps/desktop
npm run tauri build
```

Installers/binaries appear under `apps/desktop/src-tauri/target/release/bundle/`.

If the Tauri CLI complains about `--ci`, run with an empty `CI` env var: `CI= npm run tauri build`.

### Features

- Dashboard (accounts, totals, balance and cashflow charts)
- Paginated transactions with status/date/account/category/tag filters, URL-persisted state, category & tag edits (leaf categories only)
- Categories browser (all vs assignable leaves)
- Attachments list with open-in-browser for temporary file URLs
- Webhooks: create, delete, ping, delivery logs
- Analytics: spend/income/net views, monthly charts, category drilldown (paginated fetch)
- Settings: validate token with `GET /util/ping`, save/remove token, webhook signature self-test
- Rust API proxy includes retry/backoff for 429/5xx and strict TLS/CSP hardening

## Legacy Shoes app (archived)

The original **Ruby + Shoes 3** prototype (`legacy/app.rb`, bundled Shoes runtime under `legacy/lib/`) is **unmaintained** and **Windows-oriented**. It is kept for reference only; use `apps/desktop` for all new work. See [LEGACY-SHOES.md](LEGACY-SHOES.md).

## Disclaimer

This project is not affiliated with Up Bank. Up names and marks belong to their owners. Use at your own risk; protect your Personal Access Token.

## License

MIT — see [LICENSE](LICENSE).
