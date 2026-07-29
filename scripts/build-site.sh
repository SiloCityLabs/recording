#!/usr/bin/env bash
# Prepare the static site for Cloudflare Pages (or local preview of a stamped build).
# Output: _site/  — set Cloudflare "Build output directory" to `_site`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="_site"
rm -rf "$OUT"
mkdir -p "$OUT"

# Prefer Cloudflare / CI commit SHA; fall back to local git.
SHA="${CF_PAGES_COMMIT_SHA:-${GITHUB_SHA:-}}"
if [[ -z "$SHA" ]]; then
  SHA="$(git rev-parse HEAD 2>/dev/null || true)"
fi
SHORT_SHA="${SHA:0:7}"
if [[ -z "$SHORT_SHA" ]]; then
  SHORT_SHA="dev"
fi
echo "Build hash: $SHORT_SHA"

# App shell
cp index.html styles.css db.js nextcloud.js offline-transcription.js app.js sw.js manifest.webmanifest "$OUT/"
cp .nojekyll CNAME "$OUT/"

# Stamp commit hash into menus + service worker cache name
sed -i "s/__BUILD_HASH__/${SHORT_SHA}/g" "$OUT/index.html"
sed -i "s/__BUILD_HASH__/${SHORT_SHA}/g" "$OUT/sw.js"

# Icons (PWA / favicons)
mkdir -p "$OUT/icons"
cp -r icons/. "$OUT/icons/"
if [[ -f images/icon.png ]]; then
  mkdir -p "$OUT/images"
  cp images/icon.png "$OUT/images/icon.png"
fi

# Optional offline transcription assets (not in shell precache).
NEED_FETCH=0
if [[ ! -f optional/transcription/vosk.js ]]; then NEED_FETCH=1; fi
for m in vosk-model-small-en-us-0.15 vosk-model-small-en-gb-0.15 vosk-model-small-es-0.42 vosk-model-small-fr-0.22 vosk-model-small-de-0.15; do
  if [[ ! -f "optional/transcription/${m}.tar.gz" ]]; then NEED_FETCH=1; fi
done
if [[ "$NEED_FETCH" = "1" ]]; then
  chmod +x scripts/fetch-transcription-assets.sh
  ./scripts/fetch-transcription-assets.sh
fi
mkdir -p "$OUT/optional/transcription"
cp -r optional/transcription/. "$OUT/optional/transcription/"

echo "Built $OUT ($(du -sh "$OUT" | cut -f1))"
