import { TalkingHead } from '@met4citizen/talkinghead/modules/talkinghead.mjs';

const MODEL_URL = '/models/sniffer_avatar_lite.glb';
const BODY_BONES = ['Hips', 'Spine', 'Spine1', 'Spine2'] as const;

const avatarEl = document.getElementById('avatar') as HTMLElement;
const loadingEl = document.getElementById('loading') as HTMLElement;
const logEl = document.getElementById('log') as HTMLElement;
const formEl = document.getElementById('form') as HTMLFormElement;
const inputEl = document.getElementById('input') as HTMLInputElement;

const DEV = new URLSearchParams(location.search).has('dev');

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
  lipsyncModules: ['en'],
  cameraView: 'upper',
  modelFPS: 30,
  // Body lock runs every frame; bodyRest is filled in after the model loads.
  update: () => lockBody(),
});

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

// Dev panel, shown only with ?dev in the URL: moods, ears, surprise.
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

// Chat placeholder (stage 1 only; the LLM and TTS come in stages 2–3).
formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  const msg = document.createElement('div');
  msg.className = 'msg user';
  msg.textContent = text;
  logEl.append(msg);
  inputEl.value = '';
  logEl.scrollTop = logEl.scrollHeight;
});

loadAvatar();
