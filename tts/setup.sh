#!/usr/bin/env bash
# Installs the HeadTTS server (Kokoro-82M) into tts/vendor/HeadTTS, pinned to a known commit,
# and downloads a few extra voices to listen to. Needs Node.js 20+ and network access.
set -euo pipefail
cd "$(dirname "$0")"

HEADTTS_COMMIT=5ae6d5eb93b812859a09079944a66c6a2177b311
VOICES=(af_heart af_bella af_nicole am_puck am_fenrir am_michael am_echo bm_fable)

mkdir -p vendor
if [ ! -d vendor/HeadTTS/.git ]; then
  git clone https://github.com/met4citizen/HeadTTS vendor/HeadTTS
fi
git -C vendor/HeadTTS fetch --depth 1 origin "$HEADTTS_COMMIT"
git -C vendor/HeadTTS checkout -q "$HEADTTS_COMMIT"
(cd vendor/HeadTTS && npm install --no-audit --no-fund)

for v in "${VOICES[@]}"; do
  f="vendor/HeadTTS/voices/$v.bin"
  [ -f "$f" ] || curl -fsSL -o "$f" \
    "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/$v.bin"
done
echo "HeadTTS ready. Start it with: ./tts/start.sh"
