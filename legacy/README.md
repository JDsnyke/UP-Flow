# Legacy Ruby/Shoes Prototype (Archived)

This directory contains the original UP Flow prototype built with Ruby + Shoes 3.
It is archived for historical reference only.

- Status: unmaintained
- Platform: primarily Windows-oriented
- Security: not reviewed to current standards

The actively maintained application is `apps/desktop` (Tauri + React).
See `../README.md` and `../LEGACY-SHOES.md` for current project guidance.

## Known legacy issues

- Insecure TLS (`OpenSSL::SSL::VERIFY_NONE`) is used in `assets/engine.rb`.
- API key handling relies on custom obfuscation ("crypt"), not secure storage.
- The old flow writes token/cache artifacts to disk.
- Version check bug in `assets/engine.rb`: `installed_shoes_ver =! app_shoes_ver`.

## Intentionally absent files

The following files are intentionally not tracked in git:

- `assets/keys/api.txt`
- `assets/keys/crypt.gkey`
- `assets/temp/crypt.rb`
- `assets/data/accounts.json`
- `assets/data/transactions.json`

If you choose to run this legacy code locally, those files must be created locally
and must not be committed.
