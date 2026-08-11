# Raaga Studio · ಛಂದಸ್ಸು + Master Check

A single-page, zero-dependency studio with two tools:

1. **ಛಂದಸ್ಸು** — Kannada **prosody scanner** (ಮಾತ್ರೆ-ಲಘು-ಗುರು) from the
   [ಕನ್ನಡ ದೀವಿಗೆ article](https://kannadadeevige.blogspot.com/2013/11/blog-post_8282.html).
2. **Master Check** — in-browser **audio master quality analysis** (LUFS, true peak,
   dynamic range, clipping, spectrum, stereo/phase, silence/noise, metadata).

No build step, no npm install. Files never leave the browser.

## Features

### ಛಂದಸ್ಸು (Prosody)

- **Live scanner** — every syllable is colour-marked (ಲಘು green, ಗುರು gold,
  ಪ್ಲುತ purple) with a mātra badge; the symbols-only string and mātra total
  are shown per line.
- **ಷಟ್ಪದಿ toggle** — in the 3rd and 6th lines of a poem the final syllable
  counts as ಗುರು even if it is ಲಘು.
- **Preloaded examples** — the full example table from the article, plus a
  sample Kannada stanza.
- **Rules reference** — an accordion summarising all six rules from the article.

### Master Check (Audio QA)

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

**Scoring:** weighted average (Loudness 25%, DR 20%, Clipping 20%, Frequency 10%,
Stereo 10%, Silence 10%, Metadata 5%) → grade A–F.

**Export:** JSON report or print-to-PDF.

Genre reference modes: Pop/EDM, Rock, Hip-Hop/Trap, Jazz/Classical, General.

## Structure

```
raaga-studio/
├── index.html                 # dual-tab UI (prosody + master check)
├── css/style.css              # dark studio theme
├── js/
│   ├── prosody.js             # Kannada prosody engine
│   ├── app.js                 # prosody UI controller
│   ├── master-check.js        # audio analysis engine (Web Audio API)
│   └── master-check-app.js    # master check UI controller
├── sample_audio/              # optional test fixtures
└── test/
    ├── prosody_test.js        # Node prosody suite (33 checks)
    └── master_check_test.js   # Node unit tests for scoring helpers
```

## Run

Serve from any static server (no build step, no dependencies):

```bash
python3 -m http.server 8000
# open http://localhost:8000
# Master Check tab: http://localhost:8000#master
```

> **Note:** Master Check needs the Web Audio API (modern Chrome, Firefox, Safari, Edge).
> Some codecs (e.g. FLAC) depend on browser decode support.

## Tests

```bash
node test/prosody_test.js
node test/master_check_test.js
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
