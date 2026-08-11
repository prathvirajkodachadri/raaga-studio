# Raaga Studio · Compose → Mix → Master → Release

A single-page, zero-dependency studio workstation for a Kannada & Indian music artist's full workflow:
**compose in Suno.com → mix in Suno Studio / Cubase → master in Cubase → release on Spotify, Apple Music & JioSaavn**.

Eight professional tools in one page, zero build step, no npm install. Files never leave the browser.

---

## Studio Tools

### 1. ಛಂದಸ್ಸು & ಸಾಹಿತ್ಯ (Prosody, Ganas & Rhyme Scanner)
Kannada **prosody scanner** (ಮಾತ್ರೆ-ಲಘು-ಗುರು) based on classical metrics:
- Live syllable color-coding (Laghu U, Guru —, Pluta 3, Halant ·)
- **ಗಣ ವಿಭಾಗ (Gana Division)**: 3-akshara ganas (ಯಮಾತಾರಾಜಭಾನಸಲಗಂ: ಮ-ಯ-ರ-ಸ-ತ-ಜ-ಭ-ನ) and Matra Ganas
- **ಪ್ರಾಸ ಶೋಧಕ (Prasa / Rhyme schemes)**: Checks **ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ** (2nd syllable consonant rhyme) and **ಅಂತ್ಯಪ್ರಾಸ** (End rhyme) across lines
- **ಲಯ ಗಣಕ (Rhythm stats)**: Line count, total mātras, average mātras per line, rhythm variance
- **1-Click "Send Lyrics to Suno Prompt"** integration

### 2. ರಾಗ & ಶೃತಿ (Raga Explorer & Acoustic Tanpura Drone)
30+ Indian classical Carnatic & Hindustani ragas (Hamsadhwani, Mohanam, Kalyani, Shankarabharanam, Charukesi, Hindolam, Revati, Sindhu Bhairavi, Madhuvanti, Shivaranjani, etc.):
- Arohana & Avarohana swaras with Kannada names and Western scale note equivalents
- Rasa / Mood, traditional singing time, and famous compositions
- **Interactive Swara Synthesizer**: Click any swara to play its synthesized pitch in real time, or click **Play Scale** to audition the full raga
- **Virtual Acoustic Tanpura Drone**: Real-time 4-string acoustic tanpura simulation (Pa/Ma/Ni strings, middle Sa, lower Sa) with harmonic bridge buzz and adjustable pitch/tempo/volume that plays continuously in the background across all tabs
- **1-Click "Use in Suno Prompt"** and **"Tune Tanpura"** buttons

### 3. BPM, Key & Metronome (ಲಯ & ಶೃತಿ)
- **ಲಯ ಗಣಕ (Tap Tempo)**: Tap along to the beat or press Spacebar for instant BPM, ms interval, and tempo classification (Largo, Andante, Allegro, etc.)
- **ಆಡಿಯೋ ಮೆಟ್ರೋನೋಮ್ & ತಾಳ (Metronome & Talas)**: Web Audio precision scheduler with Western meters (4/4, 3/4, 6/8, 7/8) and classical **Carnatic Talas** (Adi Tala 8 beats, Rupaka Tala, Misra Chapu 7 beats, Khanda Chapu 5 beats, Tisra Eka) with primary/secondary accents and visual pulsing beat balls
- **Audio Key & BPM Detector**: Drop any audio file to automatically calculate its BPM and 12-semitone Chromagram Pitch Profile using Krumhansl-Schmuckler harmonic correlation, and suggest matching Indian Ragas!

### 4. Suno Prompt Builder
Assemble ready-to-paste **Suno.com prompts**:
- Genre (Carnatic Fusion, Bhavageete, Sugama Sangeetha, Folk/Janapada, Carnatic Rock, Hip-Hop/Rap…), mood, tempo, key/raga, vocal style, language, song structure, instruments, and production style
- Concise or detailed prompt generation modes
- **Local Recipe Library**: Save custom prompt recipes with local storage and one-click recall
- Direct export to Song Studio

### 5. Mix Check (Pre-Master QA & Reference Track Comparison)
Drop your **mixdown** (before mastering) to test against pre-master mixing targets:
- Headroom (integrated ≈ −18 to −14 LUFS, true peak ≤ −3 dBTP / −6 dBFS)
- Crest factor & dynamic range (DR ≥ 8 dB)
- Clipping detection, stereo correlation & mono phase compatibility, low-end buildup (< 30 Hz), noise floor
- **Quick-Load Sample Mixes** (Good mix, Clipped mix, Over-compressed mix)
- **Reference Track Comparison**: Load a commercial reference track alongside your mix to A/B audition with loudness matching, overlay dual frequency spectra, and get actionable **Match EQ Suggestions**!

### 6. Master Check (Audio QA + Release Checklist)
Drop a master (WAV / FLAC / AIFF / MP3 / OGG…) for full master audio QA:

| Category | What it checks |
|---|---|
| **File format** | Container, bit depth, sample rate, integrity, lossy vs lossless, size vs duration |
| **Loudness** | Integrated / short-term / momentary LUFS (BS.1770), True Peak (dBTP), LRA |
| **Platforms** | Predicted gain for Spotify, Apple Music, YouTube, Tidal, Amazon, CD, EBU R128 |
| **Dynamic range** | DR value, crest factor, genre thresholds, brick-wall / sausage detection |
| **Clipping** | Digital overs, inter-sample peaks, severity (None → Critical) |
| **Spectrum** | 20 Hz–20 kHz curve, sub-bass, low-end buildup, HF roll-off, DC offset |
| **Stereo** | Correlation, mono compatibility, Mid/Side, L/R balance, phase issues |
| **Silence & noise** | Head/tail silence, abrupt edges, noise floor, clicks/pops |
| **Metadata** | Title, artist, album, ISRC format, artwork presence |
| **Release-ready** | Lossless source, bit depth/dithering, dBTP ≤ −1, LUFS range, LRA, phase, silence, ISRC, metadata, artwork, noise floor → score /100 + ✅ release verdict |

**Extras:** Sample-accurate problem timeline (clickable timestamps for clipping, true-peak overs, clicks/pops, phase issues, abrupt edges), interactive waveform + spectrogram with multi-colored markers, **Mix ↔ Master comparison**, JSON / PDF export.

### 7. Release Planner & Artwork Validator
Prepare your release for digital distribution (Spotify, Apple Music, JioSaavn, Wynk, YouTube Content ID):
- **Cover Artwork Validator**: Drag & drop album cover art to verify dimensions (≥ 3000×3000 px), aspect ratio (1:1 square), file format (JPG/PNG), and file size (< 10 MB)
- **Streaming Platform Mockup**: Live Spotify / Apple Music player card preview showing cover art with Title & Artist
- **ISRC Generator**: Standard ISRC code generation (`CC-XXX-YY-NNNNN`) with auto-incrementing serials and validation
- **Metadata Sheet**: Copy-ready metadata tags for distributors (DistroKid, TuneCore, CD Baby, Believe Digital)
- **Digital Release Distribution Checklist** for Indian and global streaming stores

### 8. Song Studio & DAW Workflow
One card per song tracking **Idea → Composing → Suno → Mixing → Mastering → Released**:
- Song registry with BPM, key, genre, status, Suno links, and session notes
- **Suno → Cubase export checklist** (stems, naming, sample rate, grid alignment)
- **Mix session checklist** (gain staging, mono check, headroom, bounce)
- **Master / release checklist** (Mix Check first, dBTP ≤ −1, ISRC, artwork, exports)
- **DAW Session Routing Guides** (Cubase Pro/Elements, Logic Pro, Studio One, FL Studio)
- **Mastering Plugin Chain Presets** (Clean Streaming Master, Warm Indian Classical/Devotional, High-Energy Carnatic Rock/Fusion)
- Version log (Mix v1, Master v2… with one-click chain recording)
- JSON project export / import; stored in localStorage

---

## Directory Structure

```
raaga-studio/
├── index.html                 # 8-tab studio interface
├── css/style.css              # dark studio theme & responsive layout
├── js/
│   ├── prosody.js             # Kannada prosody engine (mātra, ganas, prasa, rhythm)
│   ├── app.js                 # prosody & lyrics UI controller
│   ├── ragas.js               # 30+ Ragas DB + Swara synthesizer + Tanpura drone engine
│   ├── raga-app.js            # raga explorer & tanpura tab controller
│   ├── bpm-key.js             # Key & BPM detector + metronome & tap tempo engine
│   ├── bpm-key-app.js         # BPM, key & metronome tab controller
│   ├── ref-compare.js         # Reference track comparator & Match EQ engine
│   ├── release-planner.js     # Artwork validator, ISRC generator, release distribution
│   ├── release-planner-app.js # Release planner tab controller
│   ├── daw-guides.js          # DAW session templates & mastering chain presets
│   ├── master-check.js        # Audio analysis engine (LUFS, dBTP, DR, clipping)
│   ├── master-check-app.js    # Master check UI controller
│   ├── suno-prompts.js        # Suno prompt builder & recipe library
│   ├── mix-check.js           # Mix-target assessment engine
│   ├── mix-check-app.js       # Mix check UI controller
│   ├── song-studio.js         # Song registry, checklists, versions
│   └── nav.js                 # Shared tab navigation
├── sample_audio/              # Test fixtures (good_master, clipped, over_compressed)
├── docs/
│   └── features-roadmap.md    # Feature roadmap & architecture
└── test/
    ├── prosody_test.js        # Prosody, ganas, prasa & rhythm test suite (40 checks)
    ├── master_check_test.js   # Master check scoring helpers unit tests (23 checks)
    ├── raga_bpm_test.js       # Raga, BPM/Key, ISRC, Ref Compare tests (25 checks)
    └── ui_smoke_test.js       # DOM-stub smoke tests for all 8 controllers (34 checks)
```

---

## Run

Serve from any static server (zero build step, zero dependencies):

```bash
python3 -m http.server 8000
# open http://localhost:8000
# deep links: #prosody #raga #bpm #suno #mix #master #release #songs
```

## Tests

Run the complete test suite (122 checks across 4 test runners):

```bash
node test/prosody_test.js
node test/master_check_test.js
node test/raga_bpm_test.js
node test/ui_smoke_test.js
```

## License

MIT.
