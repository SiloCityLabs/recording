#!/usr/bin/env bash
# Download optional offline-transcription runtime + per-language Vosk models.
# Not part of the base PWA shell; fetched by maintainers or by scripts/build-site.sh
# during Cloudflare Pages (or local) builds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/optional/transcription"
VOSK_VER="0.0.8"
VOSK_TGZ_URL="https://registry.npmjs.org/vosk-browser/-/vosk-browser-${VOSK_VER}.tgz"

# modelId|lang ids (comma)|display label
MODELS=(
  "vosk-model-small-en-us-0.15|en-US|English (US)"
  "vosk-model-small-en-gb-0.15|en-GB|English (UK)"
  "vosk-model-small-es-0.42|es-ES|Spanish"
  "vosk-model-small-fr-0.22|fr-FR|French"
  "vosk-model-small-de-0.15|de-DE|German"
)

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Fetching vosk-browser@${VOSK_VER}…"
curl -fsSL "$VOSK_TGZ_URL" | tar -xz -C "$TMP"
cp "$TMP/package/dist/vosk.js" "$OUT/vosk.js"
RUNTIME_BYTES=$(wc -c < "$OUT/vosk.js" | tr -d ' ')

MODELS_JSON=""
FIRST=1
for entry in "${MODELS[@]}"; do
  IFS='|' read -r MODEL_NAME LANGS LABEL <<<"$entry"
  echo "Fetching ${MODEL_NAME}.zip (${LABEL})…"
  curl -fL --progress-bar -o "$TMP/model.zip" "https://alphacephei.com/vosk/models/${MODEL_NAME}.zip"
  rm -rf "$TMP/model"
  mkdir -p "$TMP/model"
  unzip -q "$TMP/model.zip" -d "$TMP/model"
  MODEL_DIR="$(find "$TMP/model" -maxdepth 1 -type d ! -path "$TMP/model" | head -1)"
  if [[ -z "$MODEL_DIR" || ! -d "$MODEL_DIR/am" ]]; then
    echo "Unexpected model zip layout for ${MODEL_NAME}" >&2
    exit 1
  fi
  tar -czf "$OUT/${MODEL_NAME}.tar.gz" -C "$MODEL_DIR" .
  MODEL_BYTES=$(wc -c < "$OUT/${MODEL_NAME}.tar.gz" | tr -d ' ')
  echo "  → ${MODEL_BYTES} bytes"

  LANGS_JSON=$(python3 -c "import json; print(json.dumps('${LANGS}'.split(',')))")
  if [[ $FIRST -eq 1 ]]; then
    FIRST=0
  else
    MODELS_JSON+=","
  fi
  MODELS_JSON+=$(cat <<EOF

    "${MODEL_NAME}": {
      "bytes": ${MODEL_BYTES},
      "langs": ${LANGS_JSON},
      "label": "${LABEL}",
      "license": "Apache-2.0",
      "source": "https://alphacephei.com/vosk/models/${MODEL_NAME}.zip"
    }
EOF
)
done

cat > "$OUT/manifest.json" <<EOF
{
  "version": 2,
  "runtime": "vosk-browser@${VOSK_VER}",
  "runtimeLicense": "Apache-2.0",
  "runtimeSource": "https://www.npmjs.com/package/vosk-browser",
  "runtimeBytes": ${RUNTIME_BYTES},
  "models": {${MODELS_JSON}
  }
}
EOF

echo "Wrote:"
ls -lh "$OUT/vosk.js" "$OUT"/vosk-model-*.tar.gz "$OUT/manifest.json"
