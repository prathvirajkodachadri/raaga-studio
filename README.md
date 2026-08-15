# Raaga Studio · Compose → Mix → Master

A single-page, zero-dependency studio for a Kannada music artist's full workflow:
**compose in Suno.com → mix in Suno Studio / Cubase → master in Cubase → release**.

Six tools in one page, no build step, no npm install. Files never leave the browser.

## Tools

### 0. Vocal EQ Map (home)
The first page you land on: an **interactive vocal EQ cheat sheet** for mixing
engineers, with a real 20 Hz → 20 kHz logarithmic graph (−12 to +12 dB) and
15 color-coded frequency zones (Sub/Rumble → Extreme Air/Hiss).

- The **full interactive vocal EQ graph** opens directly on the first page — no
  extra click needed. Male and female curves are shown together by default.
- A phone-first Easy Guide still exists in the code for safe one-move recipes, but
  the landing page now stays focused on the graph.
- **MALE VOCAL / FEMALE VOCAL modes** with separate recommended starting EQ
  (centre frequency, gain, Q) — curves, zone labels and values all update.
- Click any zone (or chip/table row) for a detail panel: character, boost/cut
  results, when to boost/cut, adjustable Male & Female EQ sliders, Q and
  typical problems.
- **Compare mode** shows both curves on one graph; drag the glowing dots on the
  curve to tweak, hover anywhere for a live frequency/gain readout.
- **"If Your Vocal Sounds Like This…"** — 13 troubleshooting cards (muddy,
  boomy, boxy, nasal, hollow, thin, dull, unclear, harsh, aggressive, sibilant,
  too bright, lacking air) with the range to check and starting EQ moves.
- All data (zones, values, descriptions, troubleshooting) lives in one
  structured object — `window.VOCAL_EQ.data` in `js/vocal-eq.js` — easy to edit.

### 1. ಛಂದಸ್ಸು (Prosody)
Kannada **prosody scanner** (ಮಾತ್ರೆ-ಲಘು-ಗುರು) from the
[ಕನ್ನಡ ದೀವಿಗೆ article](https://kannadadeevige.blogspot.com/2013/11/blog-post_8282.html).
Scan your lyrics live while composing — every syllable is colour-marked with its
mātra value, with the ಷಟ್ಪದಿ rule toggle and preloaded examples.

### 2. Suno Prompt Builder
Assemble a ready-to-paste **Suno.com prompt**: genre (Carnatic Fusion, Bhavageete,
Devotional…), mood, tempo, key/raga (Hamsadhwani, Mohanam, Kalyani…), vocal style,
language, song structure, instruments (tanpura, mridangam, bansuri, veena…) and
production style. Save favourite prompt **recipes** locally and reload them for
every song. Concise or detailed mode.

### 3. Mix Check (pre-master)
Drop your **mixdown** (before mastering) and get a "ready for mastering?" verdict:
headroom (integrated ≈ −18 to −14 LUFS, peaks ≤ −6 dBFS), crest factor / DR,
clipping, stereo correlation & phase, low-end buildup, noise floor. Reuses the
same analysis engine with **mixing targets** instead of mastering targets.

### 4. Master Check (audio QA + release checklist)
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

### 5. Song Studio (project registry & workflow)
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
├── index.html                 # 5-tab UI (prosody · suno · mix · master · songs)
├── css/style.css              # dark studio theme
├── js/
│   ├── prosody.js             # Kannada prosody engine
│   ├── app.js                 # prosody UI controller
│   ├── master-check.js        # audio analysis engine (Web Audio API) + release checklist
│   ├── master-check-app.js    # master check UI controller
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
    └── ui_smoke_test.js       # DOM-stub smoke tests for all controllers (24 checks)
```

## Run

Serve from any static server (no build step, no dependencies):

```bash
python3 -m http.server 8000
# open http://localhost:8000
# deep links: #vocal-eq #suno #mix #master #songs
```

> **Note:** Mix Check and Master Check need the Web Audio API (modern Chrome,
> Firefox, Safari, Edge). Some codecs (e.g. FLAC) depend on browser decode support.

## Tests

```bash
node test/prosody_test.js
node test/master_check_test.js
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
