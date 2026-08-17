# Raaga Studio · Compose → Mix → Master

A single-page, zero-dependency studio for a Kannada music artist's full workflow:
**compose in Suno.com → mix in Suno Studio / Cubase → master in Cubase → release**.

Eight tools in one page, no build step, no npm install. Files never leave the browser.

## Tools

### 0. Practical EQ (home) — vocal frequency diagnostic
Upload **one vocal recording** and get a frequency report measured from *that*
take. It is an analysis tool, not an EQ plugin: no audio is filtered, modified
or rendered, and nothing is uploaded anywhere — decoding and analysis happen in
the browser via the Web Audio API.

Upload → Analyze → Understand → Mix. The only control is the file picker.

**What it measures.** Frames are taken across the whole file (never a single
moment), Hann-windowed, and binned onto a 1/12-octave grid. Silent frames are
gated out, the fundamental is estimated per frame from the harmonic series, and
the smoothing bandwidth adapts to that fundamental so one engine serves low
male and high female voices without separate templates. Each characteristic is
then judged against **this vocal's own spectral trend** — there is no stored
"ideal vocal curve" anywhere in the code.

Results are grouped into four sections, and a characteristic only appears where
the audio supports it:

| Section | Meaning |
|---|---|
| 🔻 **Decrease** | Measured excess — frequency, detected range, measured deviation, recommended starting cut, working range, Q, confidence, severity, and whether it is persistent / intermittent / transient |
| 🔺 **Increase** | A region measurably low against the same trend |
| 🟢 **Unchanged** | Within ±1.1 dB of the trend — leave it alone |
| ⚪ **Not detected** | Not meaningfully present, or *Insufficient confidence* — never an invented value |

Detectors cover rumble, plosive bursts, boominess, mud, boxiness, hollowness,
nasal, honk, room resonance, harshness, shrillness, sibilance, tizziness, plus
warmth, body, clarity, definition, presence, brightness, brilliance, air and
openness. Narrow peaks that line up with the singer's own harmonic series are
ignored rather than reported as resonances; sibilance and plosives are measured
only on the frames where they actually occur.

Findings are ranked into a **Top priorities** list, and the **frequency graph**
(20 Hz–20 kHz log scale, ±6 dB) is drawn from the same result object — the
measured spectrum sits behind the recommendation curve, every finding is a
clickable/hoverable point with a tooltip, and unchanged regions sit on the 0 dB
line. Graph and report can never disagree. Analysis JSON can be exported.

Files with instruments, multiple sources or heavy noise are still analyzed but
raise a reliability warning; silent, empty, too-short, unsupported and
undecodable files produce plain-language errors.

### 1. Vocal EQ Cheat Sheet
The first page is a clear, web-native **Vocal Mixing EQ Cheat Sheet**. It keeps
the visual frequency map from the studio reference while adding practical
values that can be entered directly in Cubase or another EQ:

- Exact six-band **male and female vocal starting points** (frequency, gain, Q,
  HPF slope and de-esser reduction)
- 20 Hz–20 kHz colour-coded map explaining what every vocal zone changes
- Concrete starter values for rumble, warmth, mud, boxiness, presence,
  sibilance, brightness and air
- Labelled nine-point example curve, a suggested vocal chain and four simple
  mixing reminders
- Responsive layout with a horizontally scrollable frequency table on phones

The full FabFilter-style parametric EQ remains available below the guide in a
collapsed **Optional: open the interactive EQ** section. Its real biquad math,
live audio, spectrum analyzer, eight presets and `window.PRO_EQ` test API are
unchanged.

### 2. ಛಂದಸ್ಸು (Prosody)
Kannada **prosody scanner** (ಮಾತ್ರೆ-ಲಘು-ಗುರು) from the
[ಕನ್ನಡ ದೀವಿಗೆ article](https://kannadadeevige.blogspot.com/2013/11/blog-post_8282.html).
Scan your lyrics live while composing — every syllable is colour-marked with its
mātra value, with the ಷಟ್ಪದಿ rule toggle and preloaded examples.

### 3. Suno Custom Mode Builder
Build the separate fields used by **Suno Custom Mode**: a focused **Style of Music**
prompt, editable **Lyrics** with insertable section templates, an optional title, and
an **Exclude** list for Advanced Options. Choose genre (Carnatic Fusion, Bhavageete,
Devotional…), mood, tempo or exact BPM, key/raga (Hamsadhwani, Mohanam, Kalyani…),
vocal style, language, instruments and production style. Selection limits are enforced,
the output updates live, instrumental settings stay consistent, and the current draft is
preserved locally. Built-in starters cannot be accidentally deleted; saved **recipes**
restore the complete editable form. Concise and detailed modes are available.

### 4. Raga & Scale Reference
A searchable library of **16 Carnatic + Hindustani ragas** (Hamsadhwani, Mohanam,
Kalyani, Shankarabharanam, Hindolam, Abheri, Keeravani, Yaman, Madhuvanti…) mapped
to the Suno → Cubase pipeline. Each raga shows:

- **Ārohana / avarohana** (ascent/descent) in swara notation
- Every swara with its **Western-note equivalent** (Sa = C) so your Cubase session
  can stay in the same key as the Suno vocal
- Mood, rasa, traditional best-time, and 3 practical composition/mixing tips
- A ready-to-paste **Suno snippet** and a **"Use in Suno prompt"** button that
  jumps to the prompt builder with the raga pre-filled
- Search (name, swara like “M2”, mood, rasa) and type filters (Pentatonic /
  Melakarta / Janya / Hindustani), plus a swara → note reference table

The same raga list feeds the Suno Prompt Builder's **Key/Scale** dropdown, so both
tabs stay in sync from one source of truth.

### 5. Mix Check (pre-master)
Drop your **mixdown** (before mastering) and get a "ready for mastering?" verdict:
headroom (integrated ≈ −18 to −14 LUFS, peaks ≤ −6 dBFS), crest factor / DR,
clipping, stereo correlation & phase, low-end buildup, noise floor. Reuses the
same analysis engine with **mixing targets** instead of mastering targets.

### 6. Master Check (audio QA + release checklist)
Drop a master (WAV / FLAC / AIFF / MP3 / OGG…) and get:

| Category | What it checks |
|---|---|
| **File format** | Container, bit depth, sample rate, integrity, lossy vs lossless, size vs duration |
| **Loudness** | Integrated / short-term / momentary LUFS (BS.1770-style), True Peak (dBTP), LRA |
| **Platforms** | Predicted gain for Spotify, Apple Music, YouTube, Tidal, Amazon, CD, EBU R128 |
| **Dynamic range** | DR value, crest factor, genre thresholds, brick-wall detection |
| **Clipping** | Digital overs, inter-sample peaks, severity (None → Critical) |
| **Spectrum** | 20 Hz–20 kHz curve, sub-bass, low-end buildup, HF roll-off, DC offset |
| **Stereo** | Correlation, mono compatibility, Mid/Side, L/R balance, phase issues |
| **Silence & noise** | Head/tail silence, abrupt edges, noise floor, clicks/pops |
| **Metadata** | Title, artist, album, ISRC format, artwork presence |
| **Release-ready** | Lossless source, bit depth/dithering, dBTP ≤ −1, LUFS range, LRA, phase, silence, ISRC, metadata, artwork, noise floor → score /100 + ✅ release verdict |

**Extras:** exact problem timeline (clipping / true-peak / clicks / phase / abrupt
edges as clickable timestamps), waveform + spectrogram with markers, **Mix ↔ Master
comparison** (uses the last mix from the Mix Check tab), JSON or print-to-PDF export.

**Scoring:** weighted average (Loudness 25%, DR 20%, Clipping 20%, Frequency 10%,
Stereo 10%, Silence 10%, Metadata 5%) → grade A–F.

### 7. Song Studio (project registry & workflow)
One card per song tracking **Idea → Composing → Suno → Mixing → Mastering → Released**:

- Song registry with BPM / key / genre / status and Suno links
- **Suno → Cubase export checklist** (stems, naming, sample rate, grid alignment)
- **Mix session checklist** (gain staging, mono check, headroom, bounce)
- **Master / release checklist** (Mix Check first, dBTP ≤ −1, ISRC, artwork, exports)
- Session notes + **version log** (Mix v1, Master v2… with the chain you used)
- Export all songs / one song as JSON, re-import anywhere; stored in localStorage

## Structure

```
raaga-studio/
├── index.html                 # 8-tab UI (practical EQ · vocal EQ · prosody · suno · raga · mix · master · songs)
├── css/
│   ├── style.css              # shared dark studio theme
│   ├── practical-eq.css       # Practical EQ report + frequency graph (home)
│   ├── vocal-eq-cheatsheet.css # cheat sheet layout
│   └── raga-reference.css     # raga & scale reference cards
├── js/
│   ├── practical-eq.js        # Practical EQ analysis engine (home) — STFT, f0, detectors
│   ├── practical-eq-app.js    # Practical EQ UI controller + frequency graph
│   ├── pro-eq.js              # Pro-Q style parametric EQ — biquad DSP + Web Audio
│   ├── prosody.js             # Kannada prosody engine
│   ├── app.js                 # prosody UI controller
│   ├── master-check.js        # audio analysis engine (Web Audio API) + release checklist
│   ├── master-check-app.js    # master check UI controller
│   ├── raga-reference.js      # raga library + shared RAGAS data (feeds Suno key list)
│   ├── suno-prompts.js        # Suno prompt builder + recipe library
│   ├── mix-check.js           # mix-target assessment engine
│   ├── mix-check-app.js       # mix check tab controller
│   ├── song-studio.js         # project registry, checklists, versions
│   └── nav.js                 # shared tab navigation
├── sample_audio/              # optional test fixtures
├── docs/
│   └── features-roadmap.md    # full feature roadmap (19 ideas)
└── test/
    ├── prosody_test.js        # Node prosody suite (33 checks)
    ├── master_check_test.js   # Node unit tests for scoring helpers (23 checks)
    ├── practical_eq_test.js   # Practical EQ engine on synthesized vocals (41 checks)
    └── ui_smoke_test.js       # DOM-stub smoke tests for all controllers (64 checks)
```

## Run

Serve from any static server (no build step, no dependencies):

```bash
python3 -m http.server 8000
# open http://localhost:8000
# deep links: #practical-eq #vocal-eq #suno #raga #mix #master #songs
```

> **Note:** Practical EQ, Mix Check and Master Check need the Web Audio API (modern
> Chrome, Firefox, Safari, Edge). Some codecs (e.g. FLAC) depend on browser decode support.

## Tests

```bash
node test/prosody_test.js
node test/master_check_test.js
node test/practical_eq_test.js
node test/ui_smoke_test.js
```

## Prosody rules implemented

1. **ಲಘು** — short vowels (ಅ ಇ ಉ ಋ ಎ ಒ) and syllables built on them.
2. **ಗುರು** — long vowels (ಆ ಈ ಊ ೠ ಏ ಐ ಓ ಔ) and long-vowel syllables.
3. **ಗುರು** — a syllable with ಅನುಸ್ವಾರ (ಂ) or ವಿಸರ್ಗ (ಃ).
4. **ಗುರು** — the syllable before a ಒತ್ತಕ್ಷರ (geminate): ಕಲ್ಲು → —U.
5. **ಗುರು** — the syllable before a closing (halant) consonant: ಕಲ್ → —.
6. **ಒಂದೇ ಗುರು** even with multiple reasons; **ಪ್ಲುತ** (3) for long vowel + ವಿಸರ್ಗ (ಆಃ).

## License

MIT.
