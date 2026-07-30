## Recorder

Thank you for contributing.

1. Fork the repo and create a feature branch from `main`.
2. Keep the app a static PWA (no bundler for the site; `npm test` is for maintainers only).
3. Test locally with `python3 -m http.server` (mic + SW need a real origin).
4. Run `npm test` when changing `db.js` / `nextcloud.js` / `offline-transcription.js` / `rec-lib.js` / `sw-rules.js`.
5. Open a pull request against `main`.

Cloudflare Pages deploys from `main` to https://recording.silocitylabs.com (`make build` → `_site`).
