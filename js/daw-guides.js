/**
 * daw-guides.js — DAW Session Setup Guide & Professional Mastering Plugin Chain Templates.
 *
 * Exposes window.DAW_GUIDES
 */
'use strict';

(function (root) {
  var DAW_TEMPLATES = {
    cubase: {
      name: 'Cubase Pro / Elements',
      summary: 'Standard Indian music stem routing & mixing session layout for Cubase.',
      steps: [
        { step: '1. Project Setup', text: 'Project → Project Setup (Shift+S): Sample Rate 48.000 kHz, Bit Depth 32-bit Float or 24-bit. Pan Law: -3 dB Equal Power.' },
        { step: '2. Stem Import & Grid Alignment', text: 'File → Import → Audio File. Select all Suno stems. Place each on a dedicated track, name consistently (e.g. Stem_01_Vocals, Stem_02_Mridangam).' },
        { step: '3. Group Busses', text: 'Create 4 Group Channels (Stereo): [GRP Vocals], [GRP Indian Perc], [GRP Drums/Bass], [GRP Melodic/Synths]. Route individual stems to respective groups.' },
        { step: '4. Mixdown Pre-Master', text: 'Route all 4 groups to a [PRE-MASTER] bus before Main Stereo Out. Keep peaks on Pre-Master ≤ −6 dBFS with no limiters.' }
      ]
    },
    logic: {
      name: 'Logic Pro',
      summary: 'Track Stacks & Gain Staging layout for Logic Pro.',
      steps: [
        { step: '1. Audio Preferences', text: 'Settings → Audio: 48 kHz sample rate, 24-bit recording enabled.' },
        { step: '2. Summing Track Stacks', text: 'Select stem groups → Create Track Stack → Summing Stack (Vocals Stack, Percussion Stack, Music Stack).' },
        { step: '3. Pre-Master Bus', text: 'Route all Stacks to Bus 1 (Pre-Master Aux) with Gain plugin checking −18 dBFS RMS.' }
      ]
    },
    studio_one: {
      name: 'Studio One',
      summary: 'Mix console stem busses & VCA faders in Studio One.',
      steps: [
        { step: '1. Song Setup', text: 'Song → Song Setup: 48 kHz / 24-bit.' },
        { step: '2. Bus Channels', text: 'Select tracks → Right Click → Add Bus for Selected Channels.' },
        { step: '3. Project Page', text: 'Send mixed WAV to Studio One Project Page for DDP / Master QA.' }
      ]
    },
    fl_studio: {
      name: 'FL Studio',
      summary: 'Mixer routing & gain structure for FL Studio.',
      steps: [
        { step: '1. Project Settings', text: 'Options → Audio: 48000 Hz, 32-bit float.' },
        { step: '2. Submix Routing', text: 'Route mixer inserts to submix tracks, unlink direct routing to Master, route submixes to Pre-Master insert.' }
      ]
    }
  };

  var MASTERING_CHAINS = [
    {
      id: 'chain_clean_streaming',
      name: 'Clean Streaming Master (Spotify / Apple Music)',
      target: '−14 LUFS / −1.0 dBTP',
      plugins: [
        { order: 1, type: 'Linear Phase EQ', settings: 'High-pass filter @ 25 Hz (18 dB/oct slope) to eliminate rumble; notch narrow boxy resonances @ 300–450 Hz.' },
        { order: 2, type: 'De-Esser / Dynamic EQ', settings: 'Tame harsh vocal sibilance between 5.5 kHz – 7.5 kHz (max 2–3 dB reduction on peaks).' },
        { order: 3, type: 'Bus Compressor (VCA/SSL)', settings: 'Ratio 2:1, Attack 30 ms, Release Auto, 1–2 dB gentle glue gain reduction.' },
        { order: 4, type: 'Harmonic Saturator / Tape', settings: 'Subtle tape warmth or tube sheen (drive ~5–10%) to glue Indian acoustic instruments (bansuri/veena).' },
        { order: 5, type: 'Stereo Imager / Mid-Side', settings: 'Mono-ize everything below 100 Hz (Bass & Kick); subtle +10% width on upper mids.' },
        { order: 6, type: 'True Peak Limiter', settings: 'Ceiling set to −1.0 dBTP, 4× oversampling enabled, slow transient release to preserve punch.' }
      ]
    },
    {
      id: 'chain_warm_devotional',
      name: 'Warm Indian Classical / Devotional Master',
      target: '−16 LUFS / −1.2 dBTP (Dynamic & Natural)',
      plugins: [
        { order: 1, type: 'Corrective Clean EQ', settings: 'Gentle HPF @ 30 Hz; subtle +1 dB dip around 2.8 kHz for smooth non-fatiguing high mids.' },
        { order: 2, type: 'Opto / Vari-Mu Compressor', settings: 'Slow optical leveling to maintain open dynamic range (DR ≥ 10 dB) for Tanpura and Mridangam.' },
        { order: 3, type: 'Pultec-Style Passive EQ', settings: '+1.5 dB broad boost @ 60 Hz for deep mridangam thoppi warmth, +1.5 dB smooth air @ 16 kHz.' },
        { order: 4, type: 'True Peak Limiter', settings: 'Ceiling set to −1.2 dBTP, gentle limiting with minimal gain reduction (< 2 dB).' }
      ]
    },
    {
      id: 'chain_punchy_fusion',
      name: 'High-Energy Carnatic Rock / Fusion Master',
      target: '−11 to −12 LUFS / −1.0 dBTP',
      plugins: [
        { order: 1, type: 'Surgical EQ', settings: 'HPF @ 30 Hz, LPF @ 20 kHz, cut mud @ 250 Hz.' },
        { order: 2, type: 'Multiband Compressor', settings: 'Tighten low-end punch (40–120 Hz) and control harsh electric guitar/violin transients.' },
        { order: 3, type: 'Clipper / Soft Saturation', settings: 'Soft clip transients by 0.8 dB before main limiter to prevent limiter pumping.' },
        { order: 4, type: 'True Peak Limiter', settings: 'Ceiling −1.0 dBTP with fast transient response.' }
      ]
    }
  ];

  var API = {
    DAW_TEMPLATES: DAW_TEMPLATES,
    MASTERING_CHAINS: MASTERING_CHAINS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.DAW_GUIDES = API;
})(typeof window !== 'undefined' ? window : globalThis);
