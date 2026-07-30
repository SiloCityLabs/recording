# AGENTS.md

Context for AI agents working on **SiloCityLabs/recording**.

## What this is

A **standalone static PWA** that approximates the Google Recorder experience — no build step, no framework, no app store. Part of an “appless” push: replace heavy Play Store apps with tiny installable web apps.

| | |
|---|---|
| **Live** | https://recording.silocitylabs.com |
| **Repo** | https://github.com/SiloCityLabs/recording |
| **Stack** | Plain HTML / CSS / JS |
| **Host** | Cloudflare Pages |
| **License** | CC BY-SA 4.0 |

## Goals

- Feel like stock Google Recorder (layout & behavior), not a novelty widget.
- Stay tiny (target: well under 500 KB shipped **base shell**).
- Work offline after install (service worker) for local recordings.
- Optional on-device transcription (opt-in download; never in shell precache).
- Optional Nextcloud sync later (currently disabled UI — CORS); same-origin proxy planned.
- Deploy from `main` via Cloudflare Pages (`make build` → `_site`; no bundler/npm).

## Layout (match stock)

Ignore Material You dynamic wallpaper colors from screenshots — stock pulls theme from the phone. We ship fixed **dark / light / system** themes with coral/pink recording accents and blue waveform accents.

| Mode | Behavior |
|---|---|
| **Portrait (phone)** | Search pill + list; round red record FAB centered at bottom |
| **Landscape (phone/tablet)** | List takes the main column; record FAB sits on the **right** |
| **Playback landscape** | Waveform / transcript card on the **left**; seek + transport on the **right** |
| **Wide desktop** | Same landscape split, capped content width |

Reference screenshots (kept for design, not shipped): `images/screenshots/`.

### Recording list card

Match `images/screenshots/tablet-landscape-home-recording.png`. Three stacked rows, **not** a
left/right split:

1. Cloud-off icon + title (`Jul 29 at 8:54 AM`) with a bare coral play triangle pushed right
2. Weekday date left, duration right, both muted
3. Full-width progress track

On the track, **coral is the portion not yet listened to** and gray is what has already played, with
a small gap between the two segments. A brand-new recording is therefore almost fully coral; a
fully-played one is all gray.

Swiping a card **left or right** slides it off a `--danger-container` panel that carries a trash icon
at both ends, so whichever side is revealed shows one — see
`images/screenshots/phone-home-swipe-delete.png`. Past ~40% of the card width it deletes and offers
**Undo** in the toast; a shorter drag snaps back. Vertical drags must still scroll the list, and the
click that follows a drag must not open the recording.

## Source map

| File | Role |
|---|---|
| `index.html` | Shell, views, sheets/modals, early theme boot script |
| `styles.css` | Themes, portrait / landscape / wide layouts |
| `db.js` | IndexedDB recordings store (`RecDB`) |
| `nextcloud.js` | Optional WebDAV upload / folder create / delete |
| `rec-lib.js` | Pure helpers (duration, summary, WAV edit, error copy) |
| `sw-rules.js` | SW path/cache classification helpers |
| `offline-transcription.js` | Opt-in Vosk model management, PCM conversion, public transcription API |
| `app.js` | UI, MediaRecorder, waveform, speech, playback, edit, PIN/blackout, wake lock |
| `sw.js` | Offline cache — shell name stamped with `__BUILD_HASH__`; preserves transcription caches |
| `optional/transcription/` | Attribution only in deploy; binaries optional local mirror |
| `scripts/fetch-transcription-assets.sh` | Optional local CDN mirror for `python3 -m http.server` |
| `scripts/build-site.sh` | Stamps `__BUILD_HASH__`, writes `_site/` (no model binaries) |
| `Makefile` | `make build` for Cloudflare Pages |
| `tests/` | Vitest unit tests + Vosk CDN HEAD checks |
| `manifest.webmanifest` | PWA manifest (`display: fullscreen` + `display_override`, `orientation: any`) |
| `CNAME` | `recording.silocitylabs.com` (kept in artifact; DNS is Cloudflare custom domain) |
| `icons/` | Circular `any` icons + full-bleed `maskable` icons |
| `images/icon.png` | Source brand artwork; derive icons from this |
| `images/screenshots/` | Design reference (phone + tablet) — **do not ship** |

## Conventions

- **No bundler / npm for the site.** Edit files directly; preview with `python3 -m http.server`.
  Maintainer unit tests use a separate `package.json` (`npm test` / `npm run test:coverage`) — never required to ship the PWA.
- Relative URLs only (`./`) so project Pages + custom domain both work.
- Keep `user-select: none` on chrome; **transcript / summary / inputs must stay selectable**.
- PWA icons: `purpose: any` = circular with transparent corners; `purpose: maskable` = opaque full-bleed square.
- After icon/manifest changes, users often must **uninstall + reinstall** the PWA for the launcher icon and the `display` mode to refresh.
- Prefer matching Google Recorder UX over inventing new patterns.
- Menu / profile footer must include **Made by SiloCityLabs**, **GitHub**, and **Build `__BUILD_HASH__`** (stamped at deploy).
- Never commit Nextcloud credentials. App passwords live only in the user’s `localStorage`.

## Storage model

Each recording in IndexedDB:

`id`, `title`, `createdAt`, `durationMs`, `mimeType`, `blob`, `peaks[]`, `transcript`, `segments[]`, `summary[]`, `favorite`, `synced`, `syncName`

## Features to preserve

- Wake Lock while recording (`navigator.wakeLock`)
- Blackout overlay + optional PIN. Blackout must be **fully** dark: the installed app runs
  `display: fullscreen` so there is no status bar, and blackout also sets `theme-color` to
  `#000000` and calls `requestFullscreen({ navigationUI: "hide" })` for browser tabs and
  `standalone` fallbacks. A lit status bar or toolbar defeats the feature.
- Nextcloud optional sync
- Build hash in nav/menus
- Swipe-to-delete on list cards, with an Undo toast
- Live transcript survives Chrome ending speech sessions: a fresh `SpeechRecognition`
  per attempt plus a watchdog, never gated on `state.recording`
- The SW update reload never fires on first install or mid-recording — it waits for
  the recording to be saved (see `applyPendingShellReload`)
- Optional offline transcription never auto-downloads; preference
  `recorder.offlineTranscribe.v1` defaults **off** and is separate from
  `recorder.transcribe.v1` (live auto-transcribe, default on)

## Optional offline transcription

### Priority

Exactly one transcription mode at a time (Settings toggles are mutually exclusive):

1. **Browser transcription** — live `SpeechRecognition` while recording (probed on enable; left off if the check fails)
2. **Offline transcription** — Vosk after save / “Transcribe again” when the model is installed
3. Neither — no transcript

Do not fall back from browser → offline within a single recording session.

### Caches

| Cache | Purpose |
|---|---|
| `recorder-__BUILD_HASH__` | App shell precache (`ASSETS` in `sw.js`) |
| `recorder-transcription-v2` | Optional runtime + model only (CDN downloads) |

Rules:

- **Never** put `optional/transcription/**` in `ASSETS`.
- On `activate`, delete obsolete shell caches but **keep** any cache whose name starts with `recorder-transcription-`.
- Do not let the generic shell `.js` handler absorb optional transcription URLs into the shell cache (`isOptionalTranscriptionPath`).
- Installation is complete only after all required files are validated in the transcription cache.
- Prefer Cache Storage (+ blob URLs for `Vosk.createModel`) over OPFS unless a future runtime requires file handles.

### Assets & licenses

| Asset | Version | License | Browser download source |
|---|---|---|---|
| `vosk.js` | vosk-browser 0.0.8 | Apache-2.0 | jsDelivr (`cdn.jsdelivr.net/npm/vosk-browser@0.0.8/...`) |
| Per-lang small models | en-us / es-0.3 / fr-pguyot / de | Apache-2.0 | `ccoreilly.github.io/vosk-browser/models/` (CORS `*`) |

Upstream models are published at https://alphacephei.com/vosk/models but **do not send CORS headers**, so the browser cannot fetch them directly. Do **not** add Cloudflare Workers/Functions to proxy them (billing). Prefer CORS-enabled free mirrors.

One language model is cached on-device at a time. Settings language picker confirms before replacing a stored model. `en-GB` shares the en-US offline model.

Attribution files: `optional/transcription/NOTICE`, `LICENSE-Apache-2.0.txt`, `README.md` (copied into `_site`; tiny).

Large binaries are **gitignored** and **not** in the Pages artifact. Optional local mirror:

```bash
./scripts/fetch-transcription-assets.sh
```

### Model update procedure

1. Point `LANG_MODELS` / CDN URLs in `offline-transcription.js` at a CORS-enabled free host.
2. Bump optional cache name (`recorder-transcription-vN`) if the cache key layout changes.
3. Update README size rows and `optional/transcription/README.md`.
4. Keep Apache-2.0 NOTICE / LICENSE files accurate.
5. Never ship model/runtime binaries in `_site` (Cloudflare Pages 25 MiB file limit).

### Transcription behavior notes

- Live streaming with Vosk is **not** required; post-recording PCM pipeline is preferred.
- Convert WebM/Opus (or other) via `AudioContext.decodeAudioData` → mono → 16 kHz → `acceptWaveformFloat`.
- Heavy recognition runs inside vosk-browser’s embedded Worker; do not evaluate `vosk.js` at app startup.
- Segments without reliable timings: single `{ t: 0, text, speaker: 1 }` (or coarse word-timed chunks only when words are present — documented in code).
- Never block saving the audio blob on transcription success/failure.
- “Transcribe again” is shown only when the offline model is installed and
  enabled; it always runs silent on-device Vosk (no play-aloud mic retranscription).

### Browser limits

- Requires WebAssembly, Workers, Web Audio, Cache Storage.
- Firefox (no Web Speech API) is a primary offline-transcription target.
- Safari / iOS may be memory-constrained (~300 MB runtime for the small model).
- Formats the browser cannot `decodeAudioData` cannot be transcribed offline; keep the recording.

## Deploy checklist (every meaningful ship)

1. **Update README size numbers** (base shell **and** optional rows if those changed).
2. Push to `main`; Cloudflare Pages runs `make build` (stamps `__BUILD_HASH__`) and publishes `_site/` — static only, no Workers/Functions.

### README size (required update)

The README compares this PWA to Play Store Google Recorder (~121 MB app size; ~4.27 MB data / ~11.83 MB cache empty). Those KB figures go stale quickly — **recompute and update the Size section on every deploy**.

**Base shell only** (same set the workflow ships as the installable app, **excluding** `optional/transcription` binaries):

```bash
python3 - <<'PY'
import os, io, gzip
files = []
for p in ['index.html','styles.css','db.js','nextcloud.js','offline-transcription.js','rec-lib.js','sw-rules.js','app.js','sw.js','manifest.webmanifest','.nojekyll','CNAME']:
    if os.path.exists(p): files.append(p)
for dp, _, fs in os.walk('icons'):
    for f in fs: files.append(os.path.join(dp, f))
if os.path.exists('images/icon.png'): files.append('images/icon.png')
total = sum(os.path.getsize(p) for p in files)
gz = 0
for p in files:
    data = open(p, 'rb').read()
    if p.endswith(('.html', '.css', '.js', '.webmanifest')) or os.path.basename(p) in ('CNAME', '.nojekyll'):
        buf = io.BytesIO()
        with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=9) as g:
            g.write(data)
        gz += len(buf.getvalue())
    else:
        gz += os.path.getsize(p)
print(f'{len(files)} files | {total/1024:.1f} KB uncompressed | ~{gz/1024:.1f} KB gzip-ish')
print(f'vs 121 MB → ~{121*1024*1024/total:.0f}× smaller')
PY
```

**Optional transcription assets** (do **not** fold into the headline base size):

```bash
python3 - <<'PY'
import os
paths = [
  'optional/transcription/vosk.js',
  'optional/transcription/vosk-model-small-en-us-0.15.tar.gz',
]
for p in paths:
    if os.path.exists(p):
        n = os.path.getsize(p)
        print(f'{p}: {n/1024/1024:.2f} MiB ({n} bytes)')
    else:
        print(f'{p}: MISSING — run ./scripts/fetch-transcription-assets.sh')
PY
```

Update both the intro paragraph and the Size table in `README.md`.

## Manual test matrix

| Case | Expect |
|---|---|
| Chromium + SpeechRecognition | Live transcript as before; offline unused if live text exists |
| Firefox (no SpeechRecognition) | Context note; with offline enabled → post-save on-device transcript |
| Offline **after** model installed | Record / retranscribe works without network |
| Offline **before** model installed | No auto-download; Settings still explains opt-in |
| Interrupt model download | Incomplete assets discarded; retry works |
| Delete offline model | Cache cleared; preference off; shell untouched |
| App-shell update with model installed | `recorder-transcription-v2` survives; shell cache rotates |
| SW update while recording | Reload deferred until save (`applyPendingShellReload`) |
| Pause / resume recording | Existing speech watchdog / pause behavior unchanged |
| WebM/Opus local transcription | Decodes → mono 16 kHz → transcript saved |
| Retranscribe | Uses Vosk when installed+enabled; updates transcript/segments/summary only |
| Transcription failure | Toast; audio blob retained |
| Quota / low storage | Failed download; no “installed” claim |
| Reopen installed PWA after download | Model still detected; enable/disable without re-download |
| Light / dark themes | Settings offline row matches existing `.settings-*` |
| Phone portrait / landscape | Settings + recording/detail layouts unchanged |

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — prefer http(s), not `file://`, so mic / SW / wake lock can register.

## Out of scope

- Native apps, Capacitor, React/Vue/Svelte, CSS frameworks
- Google Account / Drive sync
- Tracking, ads, mandatory accounts, backend APIs
- Cloud transcription (Google / OpenAI / etc.)
- Shipping design-reference screenshots in the Pages artifact
- Counting optional model bytes in the base PWA size headline
