## Recorder

Thank you for contributing.

1. Fork the repo and create a feature branch from `main`.
2. Keep the app a static PWA (no bundler/npm; Cloudflare runs `make build` only to stamp the commit hash and fetch optional assets).
3. Test locally with `python3 -m http.server` (mic + SW need a real origin).
4. Open a pull request against `main`.

Cloudflare Pages deploys from `main` to https://recording.silocitylabs.com (`make build` → `_site`).
