# Sniffer — awatar 3D: stan prac i przekazanie do strony mobilnej

Stan na 2026-11-13. Dokument dla agenta, który buduje stronę mobilną z gadającym awatarem Sniffera. Zawiera wszystko, co trzeba wiedzieć o modelu i jego integracji z TalkingHead, bez potrzeby zaglądania do Blendera.

## 1. Cel aplikacji

Aplikacja dla Volkswagena (repo `wavymejti/AVW`) z maskotką **Sniffer** — uczłowieczonym psem w 3D. Przepływ:

```
tekst użytkownika → LLM przez API (np. OpenAI) → tekst odpowiedzi → TTS → audio
                                                                        ↓
                         awatar 3D mówi: ruch ust (visemy), oczu, brwi, uszu, nastroje
```

Kluczowa cecha: naturalny, „ludzki” ruch ust, oczu, uszu i nosa, żeby awatar rozmawiał z użytkownikiem. Najpierw wersja webowa (najlepszy efekt najmniejszym kosztem), łatwa do spięcia z backendem w FastAPI albo z aplikacją w Kotlinie (np. przez WebView).

Renderowanie i animacja twarzy: biblioteka **TalkingHead** (`@met4citizen/talkinghead`, przetestowana wersja **1.8.2**) na **three.js 0.186**.

## 2. Co jest zrobione

Model jest **gotowy i przetestowany** w TalkingHead. Prace w Blenderze są zakończone.

| Etap | Stan |
|---|---|
| Przygotowanie modelu z Rodin/Hyper3D: porządek, spawanie szwów, decymacja (38,9 tys. trójkątów) | gotowe |
| Osobne gałki oczu, prawdziwa jama ustna z zębami i językiem | gotowe |
| Szkielet w nazewnictwie Ready Player Me (59 kości, zerowe obroty spoczynkowe) | gotowe |
| 52 klucze ARKit (mimika) | gotowe |
| Powieki jako osobne „czapeczki” na kuli oka (prawdziwe mrugnięcie) | gotowe |
| Uszy: `earsUp` (stają na sztorc), `earsBack` (kładą się po sobie) | gotowe |
| 15 visemów Oculus (ruch ust przy mowie) | gotowe |
| Eksport GLB, walidator Khronos glTF: 0 błędów | gotowe |
| Strona testowa z TalkingHead: nastroje, uszy, zaskoczenie, klucze | gotowe |
| **Strona mobilna, TTS, LLM, lipsync po polsku** | **do zrobienia — to Twoje zadanie** |

Nie zostało jeszcze sprawdzone: prawdziwa mowa (TTS + lipsync). Visemy są wczytywane i działają ręcznie, ale nie było testu z audio.

## 3. Pliki modelu

Pliki leżą na komputerze Mateusza (nie ma ich jeszcze w repo):

```
~/Documents/Sniffer/sniffer/work/export/sniffer_avatar_lite.glb   ← UŻYWAJ TEGO (3,1 MB, tekstury JPEG)
~/Documents/Sniffer/sniffer/work/export/sniffer_avatar.glb        ← wzorzec (10,6 MB, tekstury PNG)
```

Do zrobienia: dodać `sniffer_avatar_lite.glb` do repo jako plik statyczny (np. `public/models/sniffer_avatar_lite.glb`) i serwować z poprawnym typem `model/gltf-binary`. Wersja lite wygląda w TalkingHead tak samo jak pełna i ładuje się kilka razy szybciej, więc to ona idzie na mobile.

Pliki Blendera (tylko jeśli trzeba będzie poprawić model, wtedy przez Mateusza):
- `work/sniffer_07b_fixes.blend` — plik roboczy z bibliotekami skryptów do kluczy (tu się wraca przy zmianach min),
- `work/sniffer_08_final.blend` — oczyszczona scena, z której jest eksport.

## 4. Specyfikacja modelu

- **Siatki:** `Sniffer_mesh` (2 materiały: `model` i `Teeth`; w three.js widoczne jako `Sniffer_mesh` i `Sniffer_mesh_1`), `EyeLeft_mesh`, `EyeRight_mesh`. Oczy nie mają morph targets, obracają je kości `LeftEye`/`RightEye`.
- **Rozmiar:** 21 071 wierzchołków, 38 878 trójkątów, max 4 wpływy kości na wierzchołek.
- **Tekstury:** diffuse, normal, metallic/roughness po 2048×2048 + tęczówka 1024×512. Na GPU ok. 70 MB po rozpakowaniu z mipmapami. Jeśli słabe telefony będą miały problem z pamięcią, Mateusz może wyeksportować wariant z teksturami 1024².
- **Skala i położenie:** postać to popiersie 0,68 × 0,46 × 0,65 m (głowa ok. 0,40 m). Biodra (`Hips`) na wysokości 1 m, bo TalkingHead tego wymaga. Głowa w świecie ok. y = 1,23 m.
- **Szkielet:** pełny zestaw nazw Ready Player Me (TalkingHead rzuca `Avatar object LeftShoulder not found`, jeśli kości brakuje). Realnie ruszają się: `Hips → Spine → Spine1 → Spine2 → Neck → Head`, `LeftEye`/`RightEye`. Kości rąk i nóg są puste (popiersie, brak rąk), więc gesty dłoni TalkingHead (`playGesture`, `handFist*`) nic nie dadzą. Kości `LeftEar*`/`RightEar*` istnieją, ale uszami steruje się morph targetami, nie kośćmi.
- **Morph targets (69 na `Sniffer_mesh`):**
  - 52 ARKit: `eyeBlinkLeft/Right`, `eyeLookDown/In/Out/Up` L/R, `eyeSquint` L/R, `eyeWide` L/R, `jawForward`, `jawLeft`, `jawRight`, `jawOpen`, `mouthClose`, `mouthFunnel`, `mouthPucker`, `mouthLeft`, `mouthRight`, `mouthSmile` L/R, `mouthFrown` L/R, `mouthDimple` L/R, `mouthStretch` L/R, `mouthRollLower/Upper`, `mouthShrugLower/Upper`, `mouthPress` L/R, `mouthLowerDown` L/R, `mouthUpperUp` L/R, `browDown` L/R, `browInnerUp`, `browOuterUp` L/R, `cheekPuff`, `cheekSquint` L/R, `noseSneer` L/R, `tongueOut`;
  - 15 visemów Oculus: `viseme_sil`, `viseme_PP`, `viseme_FF`, `viseme_TH`, `viseme_DD`, `viseme_kk`, `viseme_CH`, `viseme_SS`, `viseme_nn`, `viseme_RR`, `viseme_aa`, `viseme_E`, `viseme_I`, `viseme_O`, `viseme_U`;
  - 2 dodatkowe: `earsUp`, `earsBack`.
- Nazw kluczy nie wolno zmieniać: TalkingHead szuka ich po nazwie.

## 5. Integracja z TalkingHead — działający kod

Poniższy kod pochodzi ze strony testowej, na której model był sprawdzany. Trzy fragmenty są **obowiązkowe**: blokada ciała, korekta mrugnięcia i ustawienia startowe.

### 5.1. Import i ustawienia

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.186/build/three.module.js/+esm",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186/examples/jsm/",
  "talkinghead": "https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.8.2/modules/talkinghead.mjs"
} }
</script>
```

```js
import { TalkingHead } from "talkinghead";

const head = new TalkingHead(document.getElementById('avatar'), {
  ttsEndpoint: null,          // nie używamy Google TTS wbudowanego w TalkingHead
  lipsyncModules: ['en'],     // polskiego modułu nie ma — patrz rozdział 6
  cameraView: 'upper',        // kadr na popiersie; dostępne też 'head', 'mid', 'full'
  modelFPS: 30,
  update: () => lockBody()    // obowiązkowe, patrz 5.2
});
```

### 5.2. Blokada ciała (obowiązkowa)

TalkingHead zakłada pełną postać człowieka: animuje biodra i kręgosłup (pozy, balans na stopach). U popiersia psa to przesuwa i kładzie tułów. Po każdej klatce przywracamy spoczynkowe `Hips`/`Spine*`, a szyja, głowa, oczy i morph targets zostają w rękach TalkingHead. Pozycję spoczynkową trzeba wziąć z surowego glTF (callback `showAvatar`), zanim TalkingHead nałoży swoją pozę.

```js
let bodyRest = null; const gltfRest = {};
function lockBody() {
  if (!bodyRest) return;
  for (const r of bodyRest) { r.o.position.copy(r.p); r.o.quaternion.copy(r.q); }
}

await head.showAvatar(
  { url: '/models/sniffer_avatar_lite.glb', body: 'M', avatarMood: 'neutral', lipsyncLang: 'en' },
  ev => { /* postęp ładowania: ev.loaded / ev.total */ },
  gltf => {
    ['Hips','Spine','Spine1','Spine2'].forEach(n => {
      const o = gltf.scene.getObjectByName(n);
      gltfRest[n] = { p: o.position.clone(), q: o.quaternion.clone() };
    });
  }
);
bodyRest = ['Hips','Spine','Spine1','Spine2'].map(n => {
  const o = head.armature.getObjectByName(n);
  return { o, p: gltfRest[n].p.clone(), q: gltfRest[n].q.clone() };
});
```

### 5.3. Korekta mrugnięcia (obowiązkowa)

Powieki to osobne powłoki na kuli oka. Morph targets sumują się liniowo, a suma dwóch dużych obrotów po kuli zapada powiekę w gałkę oka: przy `eyeWide` (np. nastrój `fear`, zaskoczenie) + mrugnięciu oko się nie domyka i wygląda to źle. W modelu nie da się tego skompensować (pod skórą nad okiem jest 1–3 mm luzu). Rozwiązanie: po każdej aktualizacji morph targets `eyeWide` i `eyeSquint` wygaszają się proporcjonalnie do mrugnięcia.

Ustawić **zaraz po** `new TalkingHead(...)`, przed `showAvatar`:

```js
const _umt = head.updateMorphTargets.bind(head);
head.updateMorphTargets = dt => {
  _umt(dt);
  for (const s of ['Left', 'Right']) {
    const b = head.mtAvatar['eyeBlink' + s];
    if (!b) continue;
    const k = 1 - Math.min(1, Math.max(0, b.applied));
    for (const n of ['eyeWide', 'eyeSquint']) {
      const w = head.mtAvatar[n + s];
      if (!w) continue;
      const v = Math.min(1, Math.max(0, w.applied)) * k;
      w.ms.forEach((infl, i) => { infl[w.is[i]] = v; });
    }
  }
};
```

Nie zastępować tego przez `head.mtLimits`: dla wartości ustawionych przez `setFixedValue` TalkingHead przestaje liczyć limit, gdy wartość się ustali, i korekta przestaje działać. Przy aktualizacji TalkingHead do nowszej wersji sprawdzić, czy `updateMorphTargets`, `mtAvatar[...].applied`, `.ms` i `.is` nadal istnieją.

### 5.4. Nastroje, uszy, pojedyncze klucze

```js
head.setMood('happy');   // neutral, happy, angry, sad, fear, disgust, love, sleep

// uszy (dowolny klucz można tak ustawić; null oddaje sterowanie TalkingHead)
head.setFixedValue('earsUp', 1);     // uszy na sztorc
head.setFixedValue('earsBack', 1);   // uszy po sobie
head.setFixedValue('earsUp', null);  // zwolnij

// „zaskoczenie” na 2,5 s — sprawdzone, wygląda dobrze
const SURPRISE = { earsUp: 1, browInnerUp: 1, browOuterUpLeft: 1, browOuterUpRight: 1,
                   eyeWideLeft: 1, eyeWideRight: 1, jawOpen: 0.45 };
function surprise() {
  head.setFixedValue('earsBack', null);
  for (const k in SURPRISE) head.setFixedValue(k, SURPRISE[k]);
  setTimeout(() => { for (const k in SURPRISE) head.setFixedValue(k, null); }, 2500);
}

head.setView('upper');   // zmiana kadru
```

Zachowania zauważone w testach:
- Przy `angry` oczy są lekko przymknięte. To robi sam TalkingHead: przy `browDown` automatycznie podnosi `eyeBlink`. Tak ma być.
- Nastroje różnią się subtelnie (TalkingHead ustawia klucze na 0,1–0,8). Dla wyraźniejszych reakcji lepiej łączyć nastrój z `setFixedValue` (uszy, brwi), jak w „zaskoczeniu”.
- Uszy nadają się do reakcji na zdarzenia: `earsUp` przy zaskoczeniu lub zainteresowaniu, `earsBack` przy smutku, przeprosinach, błędzie.

## 6. Mowa: TTS i lipsync — do zrobienia

### Jak TalkingHead porusza ustami
`head.speakAudio(r)` przyjmuje audio i znaczniki czasu, a ruch ust liczy na ich podstawie:

```js
head.speakAudio({
  audio,            // AudioBuffer (zdekodowane audio z TTS)
  words,            // ['Cześć', 'jestem', 'Sniffer']
  wtimes,           // początek każdego słowa w ms
  wdurations,       // długość każdego słowa w ms
  // opcjonalnie, jeśli TTS zwraca visemy — wtedy słowa nie są przeliczane na visemy:
  visemes,          // ['PP', 'aa', ...] — nazwy Oculus bez prefiksu 'viseme_'
  vtimes, vdurations
}, { lipsyncLang: 'pl' });
```

Bez `visemes` TalkingHead zamienia każde słowo na visemy modułem lipsync dla języka.

### Problem: brak polskiego
TalkingHead 1.8.2 ma moduły lipsync dla: `en`, `de`, `fi`, `fr`, `lt`, `pt_br`, `bn`. **Polskiego nie ma.** Opcje:

1. **Własny moduł `lipsync-pl`** (zalecane na start). Moduły to proste reguły: litera lub grupa liter → visemy Oculus (wzór: `modules/lipsync-de.mjs` w paczce TalkingHead, klasa z metodami `preProcessText(s)` i `wordsToVisemes(w)` zwracającą `{ visemes, times, durations }`). Polska pisownia jest dość fonetyczna, więc reguły są krótkie: dwuznaki `sz cz rz ch dz dź dż`, `ą ę`, miękkie `ś ć ź ń`, `w/f`, `ó/u`. TalkingHead ładuje moduły z katalogu, w którym leży `talkinghead.mjs`, więc przy imporcie z CDN najprościej podpiąć własny moduł ręcznie: `head.lipsync['pl'] = new LipsyncPl();` i podawać `{ lipsyncLang: 'pl' }`. Wymaga to TTS, który zwraca czasy słów.
2. **TTS, który sam zwraca visemy albo czasy słów.** Część usług TTS zwraca znaczniki czasu słów albo zdarzenia visemów. Wtedy podajemy je w `words/wtimes` lub `visemes/vtimes`. Przed wyborem sprawdzić w dokumentacji usługi, co dokładnie zwraca dla języka polskiego i jak zmapować jej zestaw visemów na 15 visemów Oculus.
3. **Awaryjnie:** ruch ust sterowany głośnością audio (`jawOpen` z amplitudy). Najprostsze, ale najmniej naturalne.

Jak visemy wyglądają na tym modelu (pysk psa jest mały, więc część się zlewa):
- `PP` — usta zamknięte, `aa` — szeroko otwarte, `O` — okrągłe, `U` — wąskie, wysunięte, `E`/`I`/`SS` — szerokie, z lekkim uśmiechem;
- `FF`, `TH`, `DD`, `kk`, `CH`, `nn`, `RR` — subtelne różnice; w ruchu wystarczą.

## 7. Uwagi pod mobile

- **Audio na iOS/Android:** przeglądarki blokują dźwięk bez gestu użytkownika. `AudioContext` TalkingHead trzeba wznowić w obsłudze pierwszego dotknięcia (np. przycisk „Porozmawiaj”), zanim przyjdzie pierwsza odpowiedź TTS.
- **Wydajność:** 39 tys. trójkątów i 4 tekstury to umiarkowane obciążenie. Na słabszych telefonach warto ograniczyć `pixelRatio` renderera do ok. 1,5–2 i zostać przy `modelFPS: 30`. Wstrzymywać renderowanie, gdy karta jest w tle.
- **Ładowanie:** 3,1 MB GLB — pokazać pasek postępu (callback `showAvatar`) i serwować plik z cache/CDN z kompresją.
- **Układ:** awatar w górnej części ekranu (kadr `upper` lub `head`), czat pod spodem. Kontener `#avatar` musi mieć jawny rozmiar (TalkingHead dopasowuje canvas do kontenera).
- **WebView w Kotlinie:** jeśli strona ma działać w aplikacji Androida, WebView musi mieć włączony JavaScript i WebGL, a autoodtwarzanie audio wymaga zgody (`mediaPlaybackRequiresUserGesture`).

## 8. Znane ograniczenia modelu

- **Tylko z korektą mrugnięcia.** Bez kodu z 5.3 (np. w innym silniku albo przy surowym sumowaniu kluczy) `eyeWide` + `eyeBlink` nie domyka oka.
- Wnętrze ucha przy `earsUp` jest rozciągnięte ok. dwukrotnie; na różowej teksturze tego nie widać.
- W połowie mrugnięcia lekka „aureola” przy powiece. Przy szybkim mrugnięciu niewidoczna.
- `viseme_U` ma lekkie spiczaste zagniecenie brody, trwa ułamek sekundy w mowie.
- Miny są generowane skryptami, poprawne, ale mniej „aktorskie” niż ręczna rzeźba.
- Popiersie bez rąk: nie używać gestów i animacji całego ciała TalkingHead.

## 9. Proponowany plan dla strony mobilnej

1. Szkielet strony: kontener awatara + okno czatu, ładowanie `sniffer_avatar_lite.glb` z blokadą ciała i korektą mrugnięcia (kod z rozdziału 5).
2. Backend (np. FastAPI): endpoint `/chat` → LLM → tekst; endpoint TTS → audio + czasy słów (lub visemy).
3. Lipsync: moduł `lipsync-pl` albo visemy z TTS, `head.speakAudio(...)`.
4. Zachowania: nastroje z treści odpowiedzi (np. LLM zwraca też pole `mood`), uszy i zaskoczenie przy zdarzeniach.
5. Testy na prawdziwych telefonach (iOS Safari, Android Chrome): audio po geście, płynność, pamięć.

Poprawki modelu (miny, visemy, tekstury) robi Mateusz w Blenderze — zgłaszać konkretnie: który klucz, w jakiej sytuacji, co wygląda źle.
