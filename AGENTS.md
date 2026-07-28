# AGENTS.md

Context for AI agents working on **SiloCityLabs/recording**.

## What this is

A **standalone static PWA** that approximates the Google Recorder experience — no build step, no framework, no app store. Part of an “appless” push: replace heavy Play Store apps with tiny installable web apps.

| | |
|---|---|
| **Live** | https://recording.silocitylabs.com |
| **Repo** | https://github.com/SiloCityLabs/recording |
| **Stack** | Plain HTML / CSS / JS |
| **Host** | GitHub Pages via Actions |
| **License** | CC BY-SA 4.0 |

## Goals

- Feel like stock Google Recorder (layout & behavior), not a novelty widget.
- Stay tiny (target: well under 500 KB shipped).
- Work offline after install (service worker) for local recordings.
- Optional Nextcloud sync instead of Google Drive.
- Deploy from `main` with zero build tooling.

## Layout (match stock)

Ignore Material You dynamic wallpaper colors from screenshots — stock pulls theme from the phone. We ship fixed **dark / light / system** themes with coral/pink recording accents and blue waveform accents.

| Mode | Behavior |
|---|---|
| **Portrait (phone)** | Search pill + list; round red record FAB centered at bottom |
| **Landscape (phone/tablet)** | List takes the main column; record FAB sits on the **right** |
| **Playback landscape** | Waveform / transcript card on the **left**; seek + transport on the **right** |
| **Wide desktop** | Same landscape split, capped content width |

Reference screenshots (gitignored from deploy, kept for design): `images/screenshots/`.

## Source map

| File | Role |
|---|---|
| `index.html` | Shell, views, sheets/modals, early theme boot script |
| `styles.css` | Themes, portrait / landscape / wide layouts |
| `db.js` | IndexedDB recordings store (`RecDB`) |
| `nextcloud.js` | Optional WebDAV upload / folder create / delete |
| `app.js` | UI, MediaRecorder, waveform, speech, playback, edit, PIN/blackout, wake lock |
| `sw.js` | Offline cache — cache name stamped with `__BUILD_HASH__` at deploy |
| `.github/workflows/deploy.yml` | Copies static files → Pages artifact; replaces `__BUILD_HASH__` with short git SHA |
| `manifest.webmanifest` | PWA manifest (`orientation: any`) |
| `CNAME` | `recording.silocitylabs.com` |
| `icons/` | Circular `any` icons + full-bleed `maskable` icons |
| `images/icon.png` | Source brand artwork; derive icons from this |
| `images/screenshots/` | Design reference (phone + tablet) — **do not ship** |

## Conventions

- **No bundler / npm.** Edit files directly; preview with `python3 -m http.server`.
- Relative URLs only (`./`) so project Pages + custom domain both work.
- Keep `user-select: none` on chrome; **transcript / summary / inputs must stay selectable**.
- PWA icons: `purpose: any` = circular with transparent corners; `purpose: maskable` = opaque full-bleed square.
- After icon/manifest changes, users often must **uninstall + reinstall** the PWA for the launcher icon to refresh.
- Prefer matching Google Recorder UX over inventing new patterns.
- Menu / profile footer must include **Made by SiloCityLabs**, **GitHub**, and **Build `__BUILD_HASH__`** (stamped at deploy).
- Never commit Nextcloud credentials. App passwords live only in the user’s `localStorage`.

## Storage model

Each recording in IndexedDB:

`id`, `title`, `createdAt`, `durationMs`, `mimeType`, `blob`, `peaks[]`, `transcript`, `segments[]`, `summary[]`, `favorite`, `synced`, `syncName`

## Features to preserve

- Wake Lock while recording (`navigator.wakeLock`)
- Blackout overlay + optional PIN
- Nextcloud optional sync
- Build hash in nav/menus

## Deploy checklist (every meaningful ship)

1. **Update README size numbers** (see below) — required every deploy that changes shipped bytes.
2. Push to `main`; Actions stamps `__BUILD_HASH__` and deploys automatically (SW cache name follows the commit).

### README size (required update)

The README compares this PWA to Play Store Google Recorder (~121 MB app size; ~4.27 MB data / ~11.83 MB cache empty). Those KB figures go stale quickly — **recompute and update the Size section on every deploy**.

Measure the same set the workflow ships (`index.html`, `styles.css`, `db.js`, `nextcloud.js`, `app.js`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `CNAME`, `icons/**`, `images/icon.png` if present):

```bash
python3 - <<'PY'
import os, io, gzip
files = []
for p in ['index.html','styles.css','db.js','nextcloud.js','app.js','sw.js','manifest.webmanifest','.nojekyll','CNAME']:
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

Update both the intro paragraph and the Size table in `README.md`.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — prefer http(s), not `file://`, so mic / SW / wake lock can register.

## Out of scope

- Native apps, Capacitor, React/Vue/Svelte, CSS frameworks
- Google Account / Drive sync
- Tracking, ads, mandatory accounts, backend APIs
- Shipping design-reference screenshots in the Pages artifact
