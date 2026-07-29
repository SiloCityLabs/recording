# Optional offline transcription assets

These files are **not** part of the base PWA install. They are hosted on the same
origin so the app can download them into a dedicated Cache Storage bucket
(`recorder-transcription-v1`) only after the user opts in under Settings.

Only **one** language model is stored on the device at a time (plus `vosk.js`).
Changing transcription language with a model installed replaces it after confirm.

## Contents

| File | Role | Approx. size |
|---|---|---|
| `vosk.js` | [vosk-browser](https://github.com/ccoreilly/vosk-browser) 0.0.8 | ~5.54 MiB |
| `vosk-model-small-en-us-0.15.tar.gz` | English (US) | ~39.3 MiB |
| `vosk-model-small-en-gb-0.15.tar.gz` | English (UK) | ~40.8 MiB |
| `vosk-model-small-es-0.42.tar.gz` | Spanish | ~38 MiB |
| `vosk-model-small-fr-0.22.tar.gz` | French | ~40 MiB |
| `vosk-model-small-de-0.15.tar.gz` | German | ~44 MiB |
| `manifest.json` | Byte sizes + provenance (fetch script) | tiny |
| `LICENSE-Apache-2.0.txt` / `NOTICE` | Attribution | — |

**Per-language opt-in download:** runtime + one model ≈ **44–50 MiB**.

## Licenses

- **vosk-browser** — Apache-2.0 — https://github.com/ccoreilly/vosk-browser
- **All listed models** — Apache-2.0 — https://alphacephei.com/vosk/models

## Fetch / refresh

```bash
./scripts/fetch-transcription-assets.sh
```

Model updates: edit the `MODELS` list in the fetch script and `LANG_MODELS` in
`offline-transcription.js`, bump `recorder-transcription-vN` if the cache layout
changes, refresh README sizes.

## Architecture note

Recognition runs inside vosk-browser’s embedded Worker. `offline-transcription.js`
owns download / PCM conversion / public API.

## Do not

- Add these files to `sw.js` `ASSETS` / shell precache
- Count them in the base PWA size row in README.md
- Auto-download without an explicit Settings action
