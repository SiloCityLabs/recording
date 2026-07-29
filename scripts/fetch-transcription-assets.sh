#!/usr/bin/env bash
# Optional local mirror for `python3 -m http.server` testing.
# Production downloads from jsDelivr + ccoreilly.github.io (no deploy binaries).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/optional/transcription"
VOSK_VER="0.0.8"
RUNTIME_URL="https://cdn.jsdelivr.net/npm/vosk-browser@${VOSK_VER}/dist/vosk.js"
MODEL_CDN="https://ccoreilly.github.io/vosk-browser/models"

MODELS=(
  "vosk-model-small-en-us-0.15"
  "vosk-model-small-es-0.3"
  "vosk-model-small-fr-pguyot-0.3"
  "vosk-model-small-de-0.15"
)

mkdir -p "$OUT"

echo "Fetching vosk.js from jsDelivr…"
curl -fL --progress-bar -o "$OUT/vosk.js" "$RUNTIME_URL"

for MODEL_NAME in "${MODELS[@]}"; do
  echo "Fetching ${MODEL_NAME}.tar.gz…"
  curl -fL --progress-bar -o "$OUT/${MODEL_NAME}.tar.gz" \
    "${MODEL_CDN}/${MODEL_NAME}.tar.gz"
done

echo "Local mirror ready (gitignored)."
ls -lh "$OUT/vosk.js" "$OUT"/vosk-model-*.tar.gz
