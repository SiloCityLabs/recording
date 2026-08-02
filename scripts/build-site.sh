#!/usr/bin/env bash
# Prepare the static site for Cloudflare Pages (or local preview of a stamped build).
# Output: _site/  — set Cloudflare "Build output directory" to `_site`.
# Large Vosk models are NOT shipped; the app downloads them at opt-in time.
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
cp index.html styles.css db.js nextcloud.js offline-transcription.js rec-lib.js sw-rules.js app.js sw.js manifest.webmanifest "$OUT/"
cp .nojekyll CNAME "$OUT/"
if [[ -f haptic.mp3 ]]; then
  cp haptic.mp3 "$OUT/"
fi
# Cloudflare Pages: keep SW scripts revalidating so activate can prune old caches.
if [[ -f _headers ]]; then
  cp _headers "$OUT/"
fi

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

# Attribution only — no vosk.js / model binaries in the deploy.
mkdir -p "$OUT/optional/transcription"
for f in LICENSE-Apache-2.0.txt NOTICE README.md; do
  if [[ -f "optional/transcription/$f" ]]; then
    cp "optional/transcription/$f" "$OUT/optional/transcription/"
  fi
done

# Fail the build if anything over Cloudflare Pages' 25 MiB limit sneaks in.
while IFS= read -r -d '' f; do
  echo "ERROR: $f exceeds Cloudflare Pages 25 MiB limit" >&2
  exit 1
done < <(find "$OUT" -type f -size +25M -print0 2>/dev/null || true)

echo "Built $OUT ($(du -sh "$OUT" | cut -f1))"
