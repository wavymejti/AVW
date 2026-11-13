import { TalkingHead } from '@met4citizen/talkinghead/modules/talkinghead.mjs';
import { LipsyncEn } from '@met4citizen/talkinghead/modules/lipsync-en.mjs';
import { synthesize, splitSentences, TtsError, VOICES, TEST_SENTENCES, type TtsSettings } from './tts';

// A host page may provide the model itself (e.g. as a blob: URL) via window.SNIFFER_MODEL_URL.
const MODEL_URL: string = (window as any).SNIFFER_MODEL_URL ?? 'models/sniffer_avatar_lite.glb';
const BODY_BONES = ['Hips', 'Spine', 'Spine1', 'Spine2'] as const;

const avatarEl = document.getElementById('avatar') as HTMLElement;
const loadingEl = document.getElementById('loading') as HTMLElement;
const logEl = document.getElementById('log') as HTMLElement;
const formEl = document.getElementById('form') as HTMLFormElement;
const inputEl = document.getElementById('input') as HTMLInputElement;

const DEV = new URLSearchParams(location.search).has('dev') || location.hash === '#dev';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
if (!hasWebGL()) {
  loadingEl.textContent = 'This browser has no WebGL, so Sniffer cannot be shown.';
  throw new Error('WebGL not available');
}

const head = new TalkingHead(avatarEl, {
  ttsEndpoint: null,
  // Lipsync is attached below by a static import, so it also works in the production build.
  lipsyncModules: [],
  cameraView: 'upper',
  modelFPS: 30,
  // Body lock runs every frame; bodyRest is filled in after the model loads.
  update: () => lockBody(),
});

head.lipsync['en'] = new LipsyncEn();

// Blink correction (handoff 5.3): must be installed before showAvatar.
const originalUpdateMorphTargets = head.updateMorphTargets.bind(head);
head.updateMorphTargets = (dt: number) => {
  originalUpdateMorphTargets(dt);
  for (const side of ['Left', 'Right']) {
    const blink = head.mtAvatar['eyeBlink' + side];
    if (!blink) continue;
    const k = 1 - Math.min(1, Math.max(0, blink.applied));
    for (const name of ['eyeWide', 'eyeSquint']) {
      const morph = head.mtAvatar[name + side];
      if (!morph) continue;
      const v = Math.min(1, Math.max(0, morph.applied)) * k;
      morph.ms.forEach((infl: any, i: number) => { infl[morph.is[i]] = v; });
    }
  }
};

// Body lock (handoff 5.2): keep Hips/Spine at their glTF rest pose.
let bodyRest: { o: any; p: any; q: any }[] | null = null;
const gltfRest: Record<string, { p: any; q: any }> = {};

function lockBody() {
  if (!bodyRest) return;
  for (const r of bodyRest) {
    r.o.position.copy(r.p);
    r.o.quaternion.copy(r.q);
  }
}

async function loadAvatar() {
  try {
    await head.showAvatar(
      { url: MODEL_URL, body: 'M', avatarMood: 'neutral', lipsyncLang: 'en' },
      (ev: ProgressEvent) => {
        if (ev.total) loadingEl.textContent = `Loading Sniffer… ${Math.round((ev.loaded / ev.total) * 100)}%`;
      },
      (gltf: any) => {
        for (const n of BODY_BONES) {
          const o = gltf.scene.getObjectByName(n);
          gltfRest[n] = { p: o.position.clone(), q: o.quaternion.clone() };
        }
      },
    );
    bodyRest = BODY_BONES.map((n) => {
      const o = head.armature.getObjectByName(n);
      return { o, p: gltfRest[n].p.clone(), q: gltfRest[n].q.clone() };
    });
    loadingEl.remove();
  } catch (err) {
    loadingEl.textContent = 'Could not load Sniffer. Check the connection and reload.';
    console.error(err);
  }
}

// Browsers keep audio suspended until the first user gesture; resume it then.
function resumeAudio() {
  if (head.audioCtx?.state === 'suspended') head.audioCtx.resume();
}
document.addEventListener('pointerdown', resumeAudio);
document.addEventListener('keydown', resumeAudio);

// --- Speech (stage 2): text -> HeadTTS -> speakAudio -------------------------------------------

const SETTINGS_KEY = 'sniffer.tts';
const settings: TtsSettings = { voice: 'am_puck', speed: 1, visemeOffsetMs: 0, ...loadSettings() };

function loadSettings(): Partial<TtsSettings> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'); } catch { return {}; }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
}

let speechAbort: AbortController | null = null;

/** Speaks text sentence by sentence; a new call interrupts the previous one. */
async function say(text: string) {
  speechAbort?.abort();
  head.stopSpeaking();
  const abort = new AbortController();
  speechAbort = abort;
  resumeAudio();
  try {
    for (const sentence of splitSentences(text)) {
      const t0 = performance.now();
      const payload = await synthesize(sentence, settings, head.audioCtx, abort.signal);
      if (abort.signal.aborted) return;
      if (DEV) console.info(`TTS ${Math.round(performance.now() - t0)} ms: ${sentence}`);
      head.speakAudio(payload, { lipsyncLang: 'en' });
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    addMessage('system', err instanceof TtsError ? err.message : `Speech failed: ${(err as Error).message}`);
    console.error(err);
  }
}

// --- Chat log -------------------------------------------------------------------------------------

function addMessage(who: 'user' | 'sniffer' | 'system', text: string) {
  const msg = document.createElement('div');
  msg.className = `msg ${who}`;
  msg.textContent = text;
  logEl.append(msg);
  logEl.scrollTop = logEl.scrollHeight;
}

// Stage 2: Sniffer reads the typed text aloud. Stage 3 replaces this with the LLM reply.
formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  addMessage('user', text);
  addMessage('sniffer', text);
  say(text);
});

// --- Dev panel, shown only with ?dev or #dev: moods, ears, surprise, speech tuning --------------

const devPanel = document.createElement('div');
devPanel.className = 'dev';
for (const mood of ['neutral', 'happy', 'angry', 'sad', 'fear', 'disgust', 'love', 'sleep']) {
  devPanel.append(button(mood, () => head.setMood(mood)));
}
devPanel.append(
  button('ears up', () => head.setFixedValue('earsUp', 1)),
  button('ears back', () => head.setFixedValue('earsBack', 1)),
  button('reset ears', () => { head.setFixedValue('earsUp', null); head.setFixedValue('earsBack', null); }),
  button('surprise!', surprise),
);

const speechRow = document.createElement('div');
speechRow.className = 'dev-row';
const voiceSel = select(VOICES, settings.voice, (v) => { settings.voice = v; saveSettings(); });
const speed = slider('speed', 0.7, 1.3, 0.05, settings.speed, (v) => { settings.speed = v; saveSettings(); });
const offset = slider('lips ms', -150, 150, 10, settings.visemeOffsetMs, (v) => { settings.visemeOffsetMs = v; saveSettings(); });
const testSel = select(TEST_SENTENCES, TEST_SENTENCES[0], () => {});
let testIndex = 0;
speechRow.append(
  voiceSel, speed, offset, testSel,
  button('say', () => say(testSel.value)),
  button('next', () => { testIndex = (testIndex + 1) % TEST_SENTENCES.length; testSel.value = TEST_SENTENCES[testIndex]; say(testSel.value); }),
  button('stop', () => { speechAbort?.abort(); head.stopSpeaking(); }),
);
devPanel.append(speechRow);
if (DEV) document.querySelector('.chat')?.prepend(devPanel);

const SURPRISE: Record<string, number> = {
  earsUp: 1, browInnerUp: 1, browOuterUpLeft: 1, browOuterUpRight: 1,
  eyeWideLeft: 1, eyeWideRight: 1, jawOpen: 0.45,
};
let surpriseTimer: number | undefined;
function surprise() {
  head.setFixedValue('earsBack', null);
  for (const k in SURPRISE) head.setFixedValue(k, SURPRISE[k]);
  clearTimeout(surpriseTimer);
  surpriseTimer = window.setTimeout(() => { for (const k in SURPRISE) head.setFixedValue(k, null); }, 2500);
}

function button(label: string, onClick: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function select(options: readonly string[], value: string, onChange: (v: string) => void) {
  const s = document.createElement('select');
  for (const o of options) s.add(new Option(o, o));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function slider(label: string, min: number, max: number, step: number, value: number, onChange: (v: number) => void) {
  const wrap = document.createElement('label');
  const out = document.createElement('span');
  const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value });
  out.textContent = `${label} ${value}`;
  input.addEventListener('input', () => { const v = Number(input.value); out.textContent = `${label} ${v}`; onChange(v); });
  wrap.append(out, input);
  return wrap;
}

// Debug handle for the browser console in dev mode.
if (DEV) (window as any).head = head;

loadAvatar();
