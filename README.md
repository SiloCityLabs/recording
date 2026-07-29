# Recorder

Google Recorder–style voice recorder as a standalone static PWA — no app store install required.

**Live:** https://recording.silocitylabs.com

My journey to an appless life continues with PWAs. The Play Store Google Recorder sits at **~121 MB** on my phone (app size), with about **4.27 MB** of app data and **11.83 MB** of cache even with no recordings. This PWA ships the same kind of experience in about **291 KB** (~152 KB transferred with gzip) — roughly **426× smaller**, fully offline once installed, and no store required.

Optional **on-device transcription** (Vosk, per-language small models) is available in Settings and downloads only after you opt in (~44–50 MB). Browser and offline transcription are mutually exclusive. Optional **Nextcloud** backup is planned (same-origin proxy) — disabled for now because browsers block cross-origin WebDAV (CORS).

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
- Nextcloud backup UI present but disabled until a same-origin proxy lands
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
| This PWA base shell (all shipped shell files) | **~291 KB** (0.284 MB) |
| Typical base transfer (gzip text + icons) | **~152 KB** |
| Optional offline transcription runtime (`vosk.js`) | **~5.54 MB** (~2.25 MB gzip) |
| Optional language model (one of EN/ES/FR/DE) | **~38–44 MB** |
| Optional download total (runtime + one model) | **~44–50 MB** |
| Device storage after enabling offline transcription | base shell + ~44–50 MB Cache Storage |

Optional transcription files are hosted for opt-in download and are **not** included in the base PWA install/precache size. They are fetched only after **Settings → Offline transcription → Download and enable**. Switching transcription language replaces the stored offline model (with confirmation).

> **Maintainers / agents:** refresh these numbers on **every deploy** that changes shipped assets. See `AGENTS.md` for the measurement commands (base shell vs optional assets).

## Deploy

Hosted on **Cloudflare Pages** (connected to this GitHub repo).

- Repo: https://github.com/SiloCityLabs/recording
- Custom domain: `recording.silocitylabs.com`
- Build command: `make build`
- Build output directory: `_site`
- Root directory: `/` (repo root)

`make build` runs `scripts/build-site.sh`: stamps `__BUILD_HASH__` from the commit SHA, fetches optional transcription assets if missing, and writes the publish tree to `_site/`.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — prefer http(s), not `file://`, so the mic, Wake Lock, and service worker work.

To test offline transcription locally, fetch optional assets once:

```bash
./scripts/fetch-transcription-assets.sh
```

## Nextcloud (deferred)

Cross-origin WebDAV from this PWA is blocked by browser CORS unless Nextcloud (or a proxy) opts in. The sync buttons stay visible but disabled with an explanation. A same-origin proxy can unlock this later without changing Nextcloud CORS.

## Limits vs stock Google Recorder

Browsers cannot keep the mic open reliably in the background — use **blackout + PIN** and leave the PWA in the foreground. Speaker diarization, on-device Clear Voice, and Google AI summaries are not replicated. Live transcript quality depends on the browser’s speech engine (best on Chromium). Offline transcription uses a small English Vosk model (post-recording, not live streaming) and runs entirely on-device after an explicit download.

## Agent notes

See [AGENTS.md](AGENTS.md) for architecture, layout rules, optional-cache rules, and the deploy checklist.

## License

[CC BY-SA 4.0](LICENSE)

Optional offline transcription runtime and model are Apache-2.0; see `optional/transcription/NOTICE`.
