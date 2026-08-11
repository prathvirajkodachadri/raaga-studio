# Raaga Studio — Feature Roadmap (Compose → Mix → Master → Release)

Workflow this studio supports: **Compose in Suno.com → Mix in Suno Studio / Cubase → Master in Cubase → Release on Spotify, Apple Music & JioSaavn**.

## ✅ Built & Shipped

- **ಛಂದಸ್ಸು & ಸಾಹಿತ್ಯ (Prosody, Ganas & Rhyme)** (#2) — Kannada prosody scanner (ಲಘು/ಗುರು/ಮಾತ್ರೆ), Gana division (ಯಮಾತಾರಾಜಭಾನಸಲಗಂ: ಮ-ಯ-ರ-ಸ-ತ-ಜ-ಭ-ನ & ಮಾತ್ರಾಗಣ), Prasa detection (ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ & ಅಂತ್ಯಪ್ರಾಸ), rhythm balance metrics → *lyric writing & composing*
- **ರಾಗ & ಶೃತಿ (Raga Explorer & Tanpura Drone)** (#5) — 30+ Carnatic & Hindustani ragas with Arohana/Avarohana, swara mapping, Western notes, Rasa/Mood, singing times, famous songs, **Interactive Web Audio Swara Synthesizer**, and continuous **Virtual Acoustic Tanpura Drone** (Pa/Ma/Ni strings, Sa harmonics, adjustable tempo/pitch/volume)
- **BPM, Key Finder & Metronome** (#4) — Live Tap Tempo calculator, **Precision Audio Metronome** with Western meters and **Carnatic Talas** (Adi Tala 8 beats, Rupaka Tala, Misra Chapu, Khanda Chapu, Tisra Eka), and **Audio File Key, Chromagram & BPM Detector** mapping to matching Indian Ragas
- **Suno Prompt Builder** (#1) — Genre/mood/tempo/key-raga/vocals/language/structure/instruments/production → ready-to-paste prompt + recipe library + one-click export to Song Studio
- **Mix Check** (#8) — Pre-master analysis with "ready for mastering?" verdict, headroom/crest/DR/phase/buildup/clipping checks, and quick sample audio loaders
- **Reference Track Comparison** (#9, #12) — Compare your mixdown or master against a commercial reference track: dual player with loudness-matched A/B switching, dual frequency spectrum overlay canvas, and actionable **Match EQ Recommendations**
- **Master Check** — Full master audio QA (LUFS, True Peak dBTP, DR, clipping positions, spectrum curve, spectrogram, stereo correlation over time, silence/noise, exact problem timeline with audio player seek-to-problem), JSON / PDF export
- **Release-Ready Checklist** (#14) — Built into Master Check: dBTP ≤ −1, dithering, ISRC, artwork, LUFS range, phase, noise → score /100 + ✅ release verdict
- **Release Planner & Artwork Validator** (#16) — Cover artwork validator (≥ 3000×3000 px, 1:1 aspect ratio, RGB, file size), **Live Spotify / Apple Music streaming player mockup**, ISRC code generator (`CC-XXX-YY-NNNNN`), release metadata sheet builder, and digital distribution checklist
- **Song Studio & DAW Workflow** (#6, #7, #10, #11, #15) — One card per song: status (Idea → … → Released), Suno links, BPM/key/genre, stem-export / mix / master checklists, **DAW Session Routing Guides** (Cubase, Logic Pro, Studio One, FL Studio), **Mastering Plugin Chain Presets**, session notes, version log, JSON export/import
- **Mix ↔ Master Comparison** — Master Check compares against the last mix analyzed in Mix Check

---

## Phase Breakdown Status

### Phase 1 — Compose (Suno.com)
1. **Suno Prompt Builder** — ✅ Complete
2. **Lyric + Prosody + Gana + Prasa Integration** — ✅ Complete
3. **Key & BPM Finder + Metronome + Tala Cycles** — ✅ Complete
4. **Raga/Scale Reference + Interactive Swara Synth + Tanpura Drone** — ✅ Complete
5. **Song Registry** — ✅ Complete

### Phase 2 — Mix (Suno Studio / Cubase)
6. **Stem Export Checklist** — ✅ Complete
7. **Mix Check (pre-master)** — ✅ Complete
8. **Reference Track Comparison (A/B Matching & Spectrum Overlay)** — ✅ Complete
9. **Session Notes & Versioning** — ✅ Complete
10. **DAW Session Setup Guide** — ✅ Complete

### Phase 3 — Master (Cubase)
11. **A/B Master Compare & Spectrum Overlay** — ✅ Complete
12. **Platform-Specific Normalization Reports** — ✅ Complete
13. **Release-Ready Checklist (Score /100)** — ✅ Complete
14. **Mastering Chain Logger & Presets** — ✅ Complete

### Phase 4 — Release & Distribution
15. **Release Planner & Cover Artwork Validator (3000×3000 px)** — ✅ Complete
16. **ISRC Generator & Manager** — ✅ Complete
17. **Digital Distribution Checklist (Spotify, Apple, JioSaavn, Wynk)** — ✅ Complete
18. **Project Export / Import (JSON)** — ✅ Complete

---

## Architecture Note

Everything runs **100% client-side in the browser** using the Web Audio API, Canvas API, and HTML5 Web APIs with zero external dependencies and zero build step.
