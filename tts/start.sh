#!/usr/bin/env bash
# Starts the HeadTTS REST server on http://127.0.0.1:8882 with this repo's config.
# The first start downloads the Kokoro model (~330 MB fp32) from Hugging Face.
set -euo pipefail
cd "$(dirname "$0")/vendor/HeadTTS"
exec node ./modules/headtts-node.mjs --config ../../headtts-node.json
