// Client for the HeadTTS REST server (POST /v1/synthesize), reached through the Vite proxy at /tts.
// Turns text into the object TalkingHead.speakAudio() expects: audio + word and viseme timings.

// am_echo is Sniffer's voice (chosen 2026-11-13); the rest stay for comparison.
export const VOICES = [
  'am_echo', 'am_puck', 'am_fenrir', 'am_michael', 'bm_fable',
  'af_heart', 'af_bella', 'af_nicole',
] as const;

export interface TtsSettings {
  voice: string;
  speed: number;
  /** Shift of mouth movement against audio in ms; negative = mouth earlier. */
  visemeOffsetMs: number;
}

export interface SpeakPayload {
  audio: AudioBuffer;
  words: string[];
  wtimes: number[];
  wdurations: number[];
  visemes: string[];
  vtimes: number[];
  vdurations: number[];
}

interface HeadTtsResponse {
  audio: string; // base64 WAV
  words: string[];
  wtimes: number[];
  wdurations: number[];
  visemes: string[];
  vtimes: number[];
  vdurations: number[];
  error?: string;
}

const ENDPOINT = 'tts/v1/synthesize';
const MAX_CHARS = 450; // HeadTTS accepts up to 500 characters per request

export class TtsError extends Error {}

/** Splits text into sentence-sized chunks under the HeadTTS length limit. */
export function splitSentences(text: string): string[] {
  const parts = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [];
  const out: string[] = [];
  for (const raw of parts) {
    let s = raw.trim();
    while (s.length > MAX_CHARS) {
      const cut = s.lastIndexOf(' ', MAX_CHARS);
      const at = cut > 0 ? cut : MAX_CHARS;
      out.push(s.slice(0, at));
      s = s.slice(at).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

export async function synthesize(
  text: string,
  settings: TtsSettings,
  audioCtx: AudioContext,
  signal?: AbortSignal,
): Promise<SpeakPayload> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        voice: settings.voice,
        language: 'en-us',
        speed: settings.speed,
        audioEncoding: 'wav',
      }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new TtsError('TTS server is not reachable. Start it with ./tts/start.sh.');
  }
  if (!res.ok) {
    throw new TtsError(`TTS server error ${res.status}. Is ./tts/start.sh running?`);
  }
  const data = (await res.json()) as HeadTtsResponse;
  if (data.error) throw new TtsError(`TTS: ${data.error}`);

  const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
  const audio = await audioCtx.decodeAudioData(bytes.buffer);

  const shift = (ts: number[]) => ts.map((t) => Math.max(0, t + settings.visemeOffsetMs));
  return {
    audio,
    words: data.words,
    wtimes: data.wtimes,
    wdurations: data.wdurations,
    visemes: data.visemes,
    vtimes: shift(data.vtimes),
    vdurations: data.vdurations,
  };
}

/** Sentences for the stage 2 lipsync check: lips, open vowels, rounding, sibilants, long words, numbers. */
export const TEST_SENTENCES = [
  'Hi, I am Sniffer. Nice to meet you!',
  'Bob bought a big blue map of Paris.',
  'Papa made many purple pancakes.',
  'Wow, look at all those old boats.',
  'You knew the school rules too.',
  'She sells sea shells by the sea shore.',
  'Five fine vans drove very fast.',
  'Think through these three things together.',
  'Can you check the gearbox and the brakes?',
  'The extraordinarily comfortable seats are adjustable.',
  'It has 150 horsepower and a range of 420 kilometers.',
  'Hmm. Really? Oh, I see!',
];
