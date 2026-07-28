# Recorder

Google Recorder–style voice recorder as a standalone static PWA — no app store install required.

**Live:** https://recording.silocitylabs.com

My journey to an appless life continues with PWAs. The Play Store Google Recorder sits at **~121 MB** on my phone (app size), with about **4.27 MB** of app data and **11.83 MB** of cache even with no recordings. This PWA ships the same kind of experience in about **214 KB** (~133 KB transferred with gzip) — roughly **580× smaller**, fully offline once installed, and no store required.

Optional **Nextcloud** backup is planned (same-origin proxy) — disabled for now because browsers block cross-origin WebDAV (CORS).

## Features

- Record / pause / stop with live waveform
- Waveform ↔ transcript toggle while recording
- Live transcript via the browser Speech Recognition API (when available)
- Local extractive summary from transcript (no Google AI / cloud)
- Playback with seek, −5s / +10s, speed control
- Crop & remove (saves a copy)
- Search titles & transcripts
- Favorites, rename, share / download, delete
- Nextcloud backup UI present but disabled until a same-origin proxy lands
- Screen wake lock while recording (Wake Lock API)
- Screen blackout + optional PIN unlock (browsers can’t record in the background)
- Installable offline PWA
- Responsive: phone / tablet / desktop, portrait & landscape

## Size

| | Size |
|---|---|
| Google Recorder (Play Store app size) | ~121 MB |
| Google Recorder app data (no recordings) | ~4.27 MB |
| Google Recorder cache | ~11.83 MB |
| This PWA (all shipped files) | **~214 KB** (0.209 MB) |
| Typical transfer (gzip text + icons) | **~133 KB** |

> **Maintainers / agents:** refresh these numbers on **every deploy** that changes shipped assets. See `AGENTS.md` for the measurement command.

## Deploy

Hosted on GitHub Pages via Actions.

- Repo: https://github.com/SiloCityLabs/recording
- Custom domain: `recording.silocitylabs.com`
- Workflow: `.github/workflows/deploy.yml` (deploys on push to `main`)

DNS should point a CNAME for `recording` → `silocitylabs.github.io`.

In the repo: **Settings → Pages → Source = GitHub Actions**, custom domain set to `recording.silocitylabs.com`, Enforce HTTPS on.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — prefer http(s), not `file://`, so the mic, Wake Lock, and service worker work.

## Nextcloud (deferred)

Cross-origin WebDAV from this PWA is blocked by browser CORS unless Nextcloud (or a proxy) opts in. The sync buttons stay visible but disabled with an explanation. A same-origin proxy can unlock this later without changing Nextcloud CORS.

## Limits vs stock Google Recorder

Browsers cannot keep the mic open reliably in the background — use **blackout + PIN** and leave the PWA in the foreground. Speaker diarization, on-device Clear Voice, and Google AI summaries are not replicated; transcript quality depends on the browser’s speech engine (best on Chromium).

## Agent notes

See [AGENTS.md](AGENTS.md) for architecture, layout rules, and the deploy checklist.

## License

[CC BY-SA 4.0](LICENSE)
