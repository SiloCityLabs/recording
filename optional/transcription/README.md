# Optional offline transcription assets

These files are **not** part of the base PWA install or Cloudflare Pages deploy.
In production, Settings downloads them from free CORS-enabled CDNs into Cache
Storage (`recorder-transcription-v2`) only after the user opts in:

| Asset | Source |
|---|---|
| `vosk.js` | https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js |
| Language models | https://ccoreilly.github.io/vosk-browser/models/ |

Upstream models live at [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models),
but that host does not send `Access-Control-Allow-Origin`, so browsers cannot
fetch from it directly (and this project does not use Cloudflare Functions to
proxy them).

## Local mirror (optional)

For offline local testing with `python3 -m http.server`:

```bash
./scripts/fetch-transcription-assets.sh
```

That writes gitignored binaries under this folder; the app prefers them when present.

## Licenses

- **vosk-browser** — Apache-2.0 — https://github.com/ccoreilly/vosk-browser
- **Models** — Apache-2.0 — https://alphacephei.com/vosk/models

See `NOTICE` and `LICENSE-Apache-2.0.txt`.

## Do not

- Add model/runtime binaries to the Pages `_site` artifact
- Put them in `sw.js` `ASSETS` / shell precache
- Count them in the base PWA size row in README.md
- Auto-download without an explicit Settings action
- Add Cloudflare Workers/Functions solely to proxy these files
