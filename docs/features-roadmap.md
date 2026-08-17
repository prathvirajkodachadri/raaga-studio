# Raaga Studio — Feature Roadmap (Compose → Mix → Master)

Workflow this site supports: **Compose in Suno.com → Mix in Suno Studio / Cubase →
Master in Cubase**. Everything below is mapped to that pipeline.

## ✅ Built today

- **Practical EQ** (home) — per-recording vocal frequency diagnostic: multi-frame
  STFT, adaptive f0/harmonic-aware analysis, decrease / increase / unchanged /
  not-detected findings with measured frequency, range, confidence and severity,
  ranked priorities and an interactive 20 Hz–20 kHz recommendation graph.
  Each finding also reports a measured static/dynamic/persistent/intermittent
  behavior, octave width + detected range, a suggested EQ shape (bell/shelf/
  high-pass/de-esser derived from the measurement), and an evidence-weighted
  0–100% confidence that weakens or suppresses the recommendation. A vocal
  profile (fundamental + range) and recording-quality summary (clipping, noise
  floor, low-frequency energy, low signal, stereo) lead the report.
  Analysis only — no EQ is ever applied to the audio.
- **ಛಂದಸ್ಸು** — Kannada prosody scanner (ಲಘು/ಗುರು/ಮಾತ್ರೆ) → *lyric writing*
- **Suno Custom Mode Builder** (#1) — genre/mood/tempo/key-raga/vocals/language/
  instruments/production → separate Style, Lyrics and Exclude fields + full-state recipe library
- **Raga & Scale Reference** (#5) — searchable library of 16 ragas with ārohana/
  avarohana, Western-note mapping (Sa = C), mood/time/rasa, composition tips and a
  Suno snippet per raga; feeds the Suno Prompt Builder's Key/Scale list
- **Mix Check** (#8) — pre-master analysis with "ready for mastering?" verdict
- **Master Check** — full audio QA (LUFS, dBTP, DR, clipping, spectrum, stereo,
  silence/noise, metadata) with grade A–F, exact problem timeline, JSON/PDF export
- **Release-ready checklist** (#14) — built into Master Check: dBTP ≤ −1, dithering,
  ISRC, artwork, LUFS range, phase, noise → score /100 + ✅ release verdict
- **Song Registry** (#6) — one card per song: status (Idea → … → Released), Suno
  links, BPM/key/genre, stem-export / mix / master checklists, session notes,
  version log, JSON export/import
- **Mix ↔ Master comparison** (#12-lite) — Master Check compares against the last mix
  analyzed in Mix Check

## Remaining ideas

---

## Phase 1 — Compose (Suno.com)

| # | Feature | Description | Notes |
|---|---------|-------------|-------|
| 1 | Suno Prompt Builder | Form (genre, mood, tempo, structure, vocal style, language, key) → ready-to-paste prompt | Store favorite "prompt recipes" |
| 2 | Lyric + Prosody integration | Rhyme-pair detection, line-length balance, mātra count per line | Reuses existing prosody engine |
| 3 | Song Structure Planner | Intro/Verse/Chorus/Bridge arrangement with timestamps | Feeds into the Suno prompt |
| 4 | Key & BPM Finder | Upload/tap reference → detect tempo + key | Keeps Suno prompt and Cubase session in same key |
| 5 | Raga/Scale Reference | Carnatic raga → note/scale lookup | ✅ Built — "Raga Reference" tab |
| 6 | Song Registry | One page per song: prompt, Suno link, stems, BPM/key, status | Ties all phases together |

## Phase 2 — Mix (Suno Studio / Cubase)

| # | Feature | Description | Notes |
|---|---------|-------------|-------|
| 7 | Stem Export Checklist | Which stems to download, naming, gain staging (-18 dBFS, -6 dB peaks) | Interactive checklist |
| 8 | Mix Check (pre-master) | Run the master engine on the **mix**: loudness, phase, buildup, clipping | Reuse Master Check code |
| 9 | Reference Compare | Overlay reference track spectrum/loudness vs. your mix | A/B style comparison |
| 10 | Session Notes & Versioning | Mix log per song with version tags (mix v2…) | Exportable |
| 11 | Cubase Session Setup Guide | Sample rate, bit depth, routing, stem placement template | Reference content |

## Phase 3 — Master (Cubase)

| # | Feature | Description | Notes |
|---|---------|-------------|-------|
| 12 | A/B Master Compare | Before/after master loudness + spectrum side-by-side | |
| 13 | Platform-specific reports | Spotify / Apple / YouTube / Tidal target presets | Extends existing platform gains |
| 14 | Release-ready checklist | dBTP ≤ -1, dithering, ISRC, metadata | |
| 15 | Mastering Chain Logger | Record EQ/comp/limiter settings per master version | Repeatable chains |

## Phase 4 — Release & everything else

| # | Feature | Description | Notes |
|---|---------|-------------|-------|
| 16 | Release Planner | Platforms, artwork checker (3000×3000 JPG), ISRC manager, distribution checklist | |
| 17 | Portfolio / Sharing | Publish finished tracks + reports as shareable pages | |
| 18 | Project Export/Import | One JSON per song with everything above | Matches existing JSON export |
| 19 | Suno API integration | Generate a track from the prompt builder directly | **Needs a backend** — others are 100% in-browser |

---

## Status of the original priority list

1. **Suno Prompt Builder** (1) — ✅ built
2. **Mix Check** (8) — ✅ built
3. **Release-ready checklist** (14) — ✅ built (inside Master Check)
4. **Song Registry** (6) — ✅ built (Song Studio tab)
5. **Reference Compare** (9) — 🕑 next up — medium effort, big mixing value

## Suggested next steps

1. **Reference Compare** (9) — load a favourite song, overlay its spectrum/loudness vs. your mix.
2. **Key & BPM Finder** (4) — tap/upload a reference to detect tempo + key.
3. **Stem Export Checklist** (7) — already inside Song Studio; could become a standalone wizard.
4. **Release Planner** (16) — platforms, artwork dimension checker, distribution checklist.

## Architecture note

Everything except **Suno API integration (19)** works fully in-browser with no
backend — consistent with the current zero-dependency design. Feature 19 would
require a small server/proxy layer to hold the Suno API key.
