#!/usr/bin/env bash
# Synthesizes one sentence with each voice into tts/preview/<voice>.wav and plays it (macOS afplay).
# Usage: ./tts/preview.sh ["Text to say"]   (the TTS server must be running)
set -euo pipefail
cd "$(dirname "$0")"
TEXT=${1:-"Hi, I'm Sniffer! Want to find out what your car can do? Just ask me."}
mkdir -p preview
for f in vendor/HeadTTS/voices/*.bin; do
  v=$(basename "$f" .bin)
  python3 - "$v" "$TEXT" <<'PY'
import base64, json, sys, urllib.request
voice, text = sys.argv[1], sys.argv[2]
req = urllib.request.Request("http://127.0.0.1:8882/v1/synthesize",
  data=json.dumps({"input": text, "voice": voice, "language": "en-us", "speed": 1, "audioEncoding": "wav"}).encode(),
  headers={"Content-Type": "application/json"})
res = json.load(urllib.request.urlopen(req))
if "error" in res: sys.exit(f"{voice}: {res['error']}")
open(f"preview/{voice}.wav", "wb").write(base64.b64decode(res["audio"]))
PY
  echo "$v"
  command -v afplay >/dev/null && afplay "preview/$v.wav"
done
