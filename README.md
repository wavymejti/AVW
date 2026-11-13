# AVW — Sniffer, the talking avatar (POC)

Desktop web app where Sniffer (a 3D dog mascot) talks with the user in English.

```
user text → /api/chat (OpenAI) → sentences + mood → /tts (HeadTTS, Kokoro) → audio + visemes → TalkingHead
```

- `web/` — Vite + TypeScript page with [TalkingHead](https://github.com/met4citizen/TalkingHead) 1.8.2 and three.js 0.186.
- `server/` — FastAPI backend (OpenAI key stays here).
- `tts/` — scripts and config for the [HeadTTS](https://github.com/met4citizen/HeadTTS) server (free, runs locally on CPU).
- `public/models/sniffer_avatar_lite.glb` — the avatar. Model details: `docs/SNIFFER_AVATAR_HANDOFF.md`.

## Run locally (macOS)

Needs Node.js 20+, Python 3.11+.

```bash
cp .env.example .env            # add OPENAI_API_KEY later (stage 3)

# 1. TTS (first time: ./tts/setup.sh; first start downloads the Kokoro model)
./tts/setup.sh
./tts/start.sh                  # http://127.0.0.1:8882

# 2. Backend
cd server && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --port 8000     # http://127.0.0.1:8000/api/health

# 3. Web
cd web && npm install && npm run dev   # http://localhost:5173  (add ?dev for the debug panel)
```

Vite proxies `/api` to the backend and `/tts` to HeadTTS, so the page calls both on its own origin.

To pick Sniffer's voice: with the TTS server running, `./tts/preview.sh` plays a sample of each downloaded voice.

## Stage 2: speech check (no LLM yet)

With all three processes running, type in the chat: Sniffer reads the text aloud with lipsync.
Open `http://localhost:5173/#dev` for the tuning panel:

- **voice** and **speed** — sent to HeadTTS with each sentence,
- **lips ms** — shifts mouth movement against the audio (negative = mouth earlier),
- **test sentences** with **say** / **next** — a fixed set covering lips (p/b/m), vowels, rounding, sibilants, long words and numbers,
- moods, ears and **surprise!**.

Settings are kept in the browser (localStorage). In dev mode the TalkingHead instance is `window.head` in the console.
