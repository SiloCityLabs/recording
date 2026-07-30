# Recorder

Google Recorder–style voice recorder as a standalone static PWA — no app store install required.

**Live:** https://recording.silocitylabs.com

My journey to an appless life continues with PWAs. The Play Store Google Recorder sits at **~121 MB** on my phone (app size), with about **4.27 MB** of app data and **11.83 MB** of cache even with no recordings. This PWA ships the same kind of experience in about **308 KB** (~159 KB transferred with gzip) — roughly **402× smaller**, fully offline once installed, and no store required.

Optional **on-device transcription** (Vosk) is available in Settings and downloads from free public CDNs only after you opt in (~40–50 MB). Browser and offline transcription are mutually exclusive. Optional **Nextcloud** backup uses WebDAV from your browser — your Nextcloud (or reverse proxy) must allow CORS for this PWA; see [CORS.md](CORS.md).

## Features

- Record / pause / stop with live waveform
- Waveform ↔ transcript toggle while recording
- Live transcript via the browser Speech Recognition API (optional; exclusive with offline mode)
- Optional private offline transcription (Vosk WASM + small per-language models for EN/ES/FR/DE) — disabled by default; one-time download; exclusive with browser mode
- Local extractive summary from transcript (no Google AI / cloud)
- Playback with seek, −5s / +10s, speed control
- Crop & remove (saves a copy)
- Search titles & transcripts
- Favorites, rename, share / download, delete
- Swipe a list card either way to delete, with an Undo snackbar
- Optional Nextcloud backup via WebDAV (requires CORS on your Nextcloud / reverse proxy — [CORS.md](CORS.md))
- Screen wake lock while recording (Wake Lock API)
- Screen blackout + optional PIN unlock (browsers can’t record in the background) — fully dark, no status bar or toolbar glow
- Installable offline PWA
- Responsive: phone / tablet / desktop, portrait & landscape

## Size

| | Size |
|---|---|
| Google Recorder (Play Store app size) | ~121 MB |
| Google Recorder app data (no recordings) | ~4.27 MB |
| Google Recorder cache | ~11.83 MB |
| This PWA base shell (all shipped shell files) | **~308 KB** (0.301 MB) |
| Typical base transfer (gzip text + icons) | **~159 KB** |
| Optional offline transcription runtime (`vosk.js`, from jsDelivr) | **~5.5 MB** |
| Optional language model (one of EN/ES/FR/DE, from vosk-browser CDN) | **~33–44 MB** |
| Optional download total (runtime + one model) | **~40–50 MB** |
| Device storage after enabling offline transcription | base shell + ~40–50 MB Cache Storage |

Optional transcription binaries are **not** in the Cloudflare Pages deploy (25 MiB file limit). They download at opt-in from jsDelivr + the vosk-browser GitHub Pages model mirror (CORS-enabled). Switching transcription language replaces the stored offline model (with confirmation).

> **Maintainers / agents:** refresh these numbers on **every deploy** that changes shipped assets. See `AGENTS.md` for the measurement commands (base shell vs optional assets).

## Deploy

Hosted on **Cloudflare Pages** (connected to this GitHub repo).

- Repo: https://github.com/SiloCityLabs/recording
- Custom domain: `recording.silocitylabs.com`
- Build command: `make build`
- Build output directory: `_site`
- Root directory: `/` (repo root)

`make build` runs `scripts/build-site.sh`: stamps `__BUILD_HASH__` from the commit SHA and writes `_site/` (shell + attribution only — no Vosk binaries).

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — prefer http(s), not `file://`, so the mic, Wake Lock, and service worker work.

To test offline transcription downloads against a local mirror (optional; production uses CDNs):

```bash
./scripts/fetch-transcription-assets.sh
```

## Tests

Maintainer unit tests (Vitest) — not part of the Pages deploy:

```bash
npm install
npm test                 # unit + Vosk CDN HEAD checks (no model download)
npm run test:coverage    # coverage thresholds on db/nextcloud/offline/rec-lib/sw-rules
```

Vosk checks only `HEAD` the jsDelivr runtime and vosk-browser model URLs (status, `Content-Length`, CORS).

## Nextcloud sync

Upload / delete via WebDAV (`nextcloud.js`) from the browser. Credentials stay in `localStorage` (app password). Browsers require CORS on **your** Nextcloud or reverse proxy for `https://recording.silocitylabs.com` (and localhost when previewing).

See **[CORS.md](CORS.md)** for:

- Nginx Proxy Manager (TrueNAS-style UI)
- Base nginx (`map` + `/remote.php/dav/`)
- Untested sketches: Apache, Caddy, Traefik, HAProxy

This project does **not** run a Cloudflare Worker as a public open proxy for arbitrary Nextcloud hosts.

## Limits vs stock Google Recorder

Browsers cannot keep the mic open reliably in the background — use **blackout + PIN** and leave the PWA in the foreground. Speaker diarization, on-device Clear Voice, and Google AI summaries are not replicated. Live transcript quality depends on the browser’s speech engine (best on Chromium). Offline transcription uses a small English Vosk model (post-recording, not live streaming) and runs entirely on-device after an explicit download.

## Agent notes

See [AGENTS.md](AGENTS.md) for architecture, layout rules, optional-cache rules, and the deploy checklist.

## License

[CC BY-SA 4.0](LICENSE)

Optional offline transcription runtime and model are Apache-2.0; see `optional/transcription/NOTICE`.
