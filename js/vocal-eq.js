/**
 * vocal-eq.js — Vocal EQ Map: an interactive 20 Hz–20 kHz vocal EQ cheat sheet
 * for mixing engineers. Pure vanilla JS + SVG, no dependencies.
 *
 * Features:
 *   • Logarithmic frequency axis (20 Hz → 20 kHz), gain axis −12 dB → +12 dB
 *   • 15 color-coded frequency zones (Sub/Rumble → Extreme Air/Hiss)
 *   • Separate Male / Female recommended starting EQs (curve, nodes, sliders)
 *   • Male vs Female comparison on one graph
 *   • Click a zone → detailed info panel (character, boost/cut, when to, EQ, Q, problems)
 *   • "If your vocal sounds like this…" troubleshooting cards (13 issues)
 *   • Everything editable in the structured data below (VOCAL_EQ.data).
 *
 * The curve is a superposition of peaking filters (one per zone) so the graph
 * always matches the numbers in the data object and the sliders.
 */
'use strict';

(function () {
  /* ═══════════════════════════ DATA — edit me ═══════════════════════════ */
  var F_MIN = 20, F_MAX = 20000;   // Hz
  var DB_MIN = -12, DB_MAX = 12;   // dB
  var VOICE_COLORS = { male: '#6ee7ff', female: '#ff6fb5' };

  /**
   * gain  = starting cut/boost in dB (negative = cut, positive = boost)
   * freq  = suggested centre frequency for that voice (Hz)
   * q     = suggested Q / bandwidth (higher Q = narrower)
   * tip   = mixing-engineer note for that voice
   */
  var ZONES = [
    {
      id: 'sub', name: 'Sub / Rumble', short: 'SUB', range: [20, 60], color: '#8e7cc3',
      character: 'Sub-sonic rumble, mic proximity boom, pops and plosives. There is almost nothing musical here for a vocal — mostly noise and energy waste.',
      boost: 'Adds chest weight and low power, but almost always turns into rumble, boom and wasted headroom that the kick and bass need.',
      cut: 'Cleans up rumble, plosives and sub-sonic clutter; makes the vocal sit cleaner and tighter on top of the low end.',
      whenBoost: 'Rarely. Only if the vocal sounds weightless in a sparse, sub-heavy arrangement — and even then prefer a low shelf or nothing.',
      whenCut: 'Almost always. High-pass at 70–90 Hz (male) or 90–110 Hz (female) instead of a bell cut for surgical rumble removal.',
      q: 0.7,
      problems: ['Rumble', 'Proximity boom', 'P-pop / plosives', 'Wasted headroom'],
      male:   { freq: 45,  gain: -4,   q: 0.7, tip: 'A 75–85 Hz HPF (24 dB/oct) is the real tool here; the bell is just a safety net.' },
      female: { freq: 50,  gain: -4.5, q: 0.7, tip: 'Female vocals have no useful energy this low — HPF at 90–110 Hz instead.' }
    },
    {
      id: 'low-end', name: 'Low End', short: 'LOW END', range: [60, 100], color: '#5c6bc0',
      character: 'The very bottom of the vocal body — chest resonance and fundamental weight. Male fundamentals reach down here; female vocals rarely do.',
      boost: 'Adds power and chestiness. Too much = boomy, muddy and "too close to the mic".',
      cut: 'Removes boom and proximity thickness; slightly thins the vocal but improves clarity and separation.',
      whenBoost: 'Thin, weak male vocals that need chest weight (+1–2 dB at 80–100 Hz) in a sparse arrangement.',
      whenCut: 'Boomy male vocals; crowded low end (kick/bass); female vocals with proximity boom below their fundamental.',
      q: 1.0,
      problems: ['Boom', 'Mud', 'Proximity effect'],
      male:   { freq: 80,  gain: -1.5, q: 1.0, tip: 'Male fundamental lives ~85–180 Hz — cut gently here only if boomy, keep the chest.' },
      female: { freq: 90,  gain: -2.5, q: 1.1, tip: 'Female fundamentals sit higher; this band is usually just proximity boom — cut.' }
    },
    {
      id: 'warmth', name: 'Warmth / Body', short: 'WARMTH', range: [100, 150], color: '#3f8ef7',
      character: 'Chesty warmth and body — the "full" part of the voice. The difference between a small vocal and a rich one lives here.',
      boost: 'Adds warmth, fullness and intimacy. Too much = muddy, cloudy, chesty and unclear.',
      cut: 'Thins the vocal, reduces mud and clears low-mid congestion against bass, guitar and keys.',
      whenBoost: 'Vocals that sound thin, small or lacking body (boost 110–130 Hz, small amounts).',
      whenCut: 'Already-warm, dense mixes; when the vocal fights the bass and low-mid instruments.',
      q: 1.0,
      problems: ['Thin (if cut too much)', 'Mud (if boosted too much)'],
      male:   { freq: 120,  gain: 2,   q: 1.0, tip: 'Male: 110–130 Hz adds chest without reaching the mud zone below.' },
      female: { freq: 130,  gain: 1.5, q: 1.1, tip: 'Female: less is more here — a little body goes far before it turns boxy.' }
    },
    {
      id: 'mud-body', name: 'Mud / Body', short: 'MUD', range: [150, 250], color: '#2aa9a0',
      character: 'Lower-mid body where "wool" and mud live — first-formant territory. The most common vocal problem zone.',
      boost: 'Adds body and power, but easily becomes muddy, cloudy and unclear — it eats clarity faster than it adds weight.',
      cut: 'The classic de-mud move: cleans the vocal, adds clarity, separation and "expensive" articulation.',
      whenBoost: 'Only for thin, distant vocals in sparse mixes — and rarely more than +1–2 dB.',
      whenCut: 'Muddy, cloudy, boomy vocals; vocals that fight guitars, keys and low brass.',
      q: 1.2,
      problems: ['Mud', 'Cloudiness', 'Lack of clarity', 'Woolly tone'],
      male:   { freq: 210, gain: -3, q: 1.2, tip: 'Male 180–240 Hz: reduce if muddy/boomy; try −2 to −4 dB.' },
      female: { freq: 240, gain: -3, q: 1.3, tip: 'Female 200–300 Hz: reduce if thick/boxy; try −2 to −4 dB.' }
    },
    {
      id: 'boxiness', name: 'Boxiness', short: 'BOX', range: [250, 400], color: '#4caf6e',
      character: 'The "boxy" / "honky" / "singing into a cupboard" coloration — nasal-ish body from cardioid proximity and cheap rooms.',
      boost: 'Adds weight and grit, but quickly sounds boxy, muffled, honky and cheap.',
      cut: 'Opens the vocal up, removes boxiness and chesty honk; one of the fastest ways to "un-muffle" a take.',
      whenBoost: 'Very rarely — maybe to add grit to a lo-fi or telephone effect.',
      whenCut: 'Boxy, muffled vocals; cardioid mic proximity buildup; dense mixes that need the vocal to cut through.',
      q: 1.4,
      problems: ['Boxiness', 'Honk', 'Muffled', 'Cupboard tone'],
      male:   { freq: 300, gain: -2,   q: 1.4, tip: 'Male ~280–320 Hz; sweep 250–400 Hz to find the exact boxy spot.' },
      female: { freq: 330, gain: -2.5, q: 1.5, tip: 'Female ~300–360 Hz; thicker registers usually want a touch more cut.' }
    },
    {
      id: 'low-mid', name: 'Low-Mid / Honk', short: 'LOW-MID', range: [400, 700], color: '#8bc34a',
      character: 'Low-mid honk — where nasality meets body. Also the "meat" of the vocal: cut too much and the voice hollows out.',
      boost: 'Adds power and bite; too much = honky, nasal, aggressive and fatiguing.',
      cut: 'Reduces honk and nasality; can reveal clarity, but over-cutting makes the vocal thin and hollow.',
      whenBoost: 'Vocals buried in dense mixes can take a little low-mid power (+1 dB).',
      whenCut: 'Honky, nasal or aggressive vocals; vocals that seem to sit "in" the music instead of on top.',
      q: 1.5,
      problems: ['Honk', 'Nasality', 'Aggression'],
      male:   { freq: 500, gain: -1.5, q: 1.5, tip: 'Male ~450–550 Hz; small cuts — this band is also vocal power.' },
      female: { freq: 550, gain: -2,   q: 1.6, tip: 'Female ~500–650 Hz; watch for megaphone-like nasality here.' }
    },
    {
      id: 'nasal', name: 'Nasal / Clarity', short: 'NASAL', range: [700, 1000], color: '#d4e157',
      character: 'Upper nasality and "pinched" tone — also a critical zone for vocal definition and cut-through.',
      boost: 'Adds presence and definition, but quickly sounds nasal, pinched and honky.',
      cut: 'Removes nasality and "singer with a cold" tone; often an instant cleaner, more controlled vocal.',
      whenBoost: 'Vocals lost in a busy mix can take a little definition here (careful, small amounts).',
      whenCut: 'Pinched/nasal vocals; recordings with harsh 800 Hz–1 kHz resonances.',
      q: 1.8,
      problems: ['Nasality', 'Pinched tone', 'Harsh resonance'],
      male:   { freq: 850,  gain: -2,   q: 1.8, tip: 'Male ~800–900 Hz; the classic nasal resonance spot.' },
      female: { freq: 950,  gain: -2.5, q: 2.0, tip: 'Female ~900 Hz–1.1 kHz; a narrow cut tames nasal peaks.' }
    },
    {
      id: 'presence', name: 'Vocal Presence / Forwardness', short: 'PRESENCE', range: [1000, 2000], color: '#ffc93c',
      character: 'The forwardness and intelligibility core — where the vocal steps in front of the speakers. The most "vocal" band of all.',
      boost: 'Makes the vocal step forward, clearer, more present and intimate. Too much = harsh, tiring, "radio voice".',
      cut: 'Pushes the vocal back into the mix, softens it and reduces listener fatigue.',
      whenBoost: 'Vocals that sit behind the music; you want more intimacy and presence.',
      whenCut: 'Harsh, aggressive, in-your-face vocals; long listening fatigue at loud levels.',
      q: 1.0,
      problems: ['Lack of presence', 'Fatigue', 'Harshness (if over-boosted)'],
      male:   { freq: 1400, gain: 2,   q: 1.0, tip: 'Male ~1.2–1.6 kHz; the classic male presence bump.' },
      female: { freq: 1800, gain: 1.5, q: 1.2, tip: 'Female ~1.6–2 kHz; presence centre sits slightly higher.' }
    },
    {
      id: 'intelligibility', name: 'Intelligibility / Clarity', short: 'INTELLIG.', range: [2000, 3000], color: '#ffa726',
      character: 'Consonant clarity and diction — the frequency band the human brain uses to read speech. Critical for lyrics.',
      boost: 'Crisper consonants, better diction and mix penetration. Too much = harsh, tiring, sibilant-adjacent.',
      cut: 'Softens harshness and reduces fatigue; too much and diction gets mushy.',
      whenBoost: 'Dull, unclear vocals that disappear in the mix; vocal-heavy songs where lyrics matter.',
      whenCut: 'Harsh male vocals with aggressive 2.5 kHz energy.',
      q: 1.2,
      problems: ['Dullness', 'Harshness', 'Poor diction'],
      male:   { freq: 2400, gain: 1,   q: 1.2, tip: 'Male ~2.2–2.6 kHz: add only if diction is dull; cut if harsh.' },
      female: { freq: 2800, gain: 2,   q: 1.3, tip: 'Female ~2.6–3 kHz: the key clarity zone — boost gently.' }
    },
    {
      id: 'presence-edge', name: 'Presence / Edge', short: 'EDGE', range: [3000, 5000], color: '#ff7043',
      character: 'Presence, edge and "bite" — the most sensitive band of human hearing. Where perceived loudness is won or lost.',
      boost: 'More edge, cut-through and perceived loudness. Too much = harsh, piercing, ear-fatiguing.',
      cut: 'Tames harshness and shrillness; smooths the vocal and makes it easier to listen to for long periods.',
      whenBoost: 'Vocals that lack cut-through in loud mixes — small amounts only.',
      whenCut: 'Piercing, shrill vocals; anything that makes you reach for the volume down.',
      q: 1.4,
      problems: ['Harshness', 'Piercing', 'Shrillness'],
      male:   { freq: 3800, gain: 1.5, q: 1.4, tip: 'Male ~3.5–4 kHz; small boosts only — the ear is hypersensitive here.' },
      female: { freq: 4200, gain: 1,   q: 1.5, tip: 'Female ~4–4.5 kHz; often already present, so boost less.' }
    },
    {
      id: 'sibilance', name: 'Sibilance / Harshness', short: 'SIBIL.', range: [5000, 8000], color: '#ff5252',
      character: 'Sibilance (S, T, SH, CH), breath and edge — the danger zone for harshness and listener fatigue.',
      boost: 'Airy edge and "expensive" detail; too much = harsh, spitty, fatiguing.',
      cut: 'The de-esser zone: tames S/T harshness and smooths the top end.',
      whenBoost: 'Dull, dark vocals that need life (usually better served at 8–12 kHz).',
      whenCut: 'Sibilant, spitty, harsh vocals — a de-esser is often better than a static cut since sibilance moves.',
      q: 2.0,
      problems: ['Sibilance', 'Spittiness', 'Harshness', 'Fatigue'],
      male:   { freq: 6500, gain: -1.5, q: 2.0, tip: 'Male ~6–7 kHz; or use a de-esser tuned 6–8 kHz.' },
      female: { freq: 7000, gain: -2,   q: 2.2, tip: 'Female ~7–8 kHz; de-ess instead if the sibilance moves.' }
    },
    {
      id: 'brightness', name: 'Brightness', short: 'BRIGHT', range: [8000, 10000], color: '#f06292',
      character: 'Brightness, openness and detail — where "expensive" vocal tops live. Adds life without sounding edgy.',
      boost: 'Openness, air, perceived quality. Too much = hissy, brittle and sibilant.',
      cut: 'Removes hiss and brittleness; makes the vocal darker and softer.',
      whenBoost: 'Dark, dated, dull recordings that need modern sheen.',
      whenCut: 'Hissy, brittle recordings; harsh mics; low-bitrate artifacts.',
      q: 1.5,
      problems: ['Hiss', 'Brittleness', 'Dullness (if cut too much)'],
      male:   { freq: 9000,  gain: 1,   q: 1.5, tip: 'Male ~8.5–9.5 kHz; a gentle, shelf-like sheen works well.' },
      female: { freq: 9500,  gain: 1.5, q: 1.5, tip: 'Female ~9–10 kHz; a little more air is natural.' }
    },
    {
      id: 'upper-brightness', name: 'Upper Brightness', short: 'UPPER', range: [10000, 12000], color: '#ba68c8',
      character: 'Upper sheen and sparkle — above most musical content, but audible as "detail".',
      boost: 'Subtle sparkle and perceived clarity. Too much = hissy and artificial.',
      cut: 'Removes hiss and artificial fizz from bright mics or plugins.',
      whenBoost: 'Adding air and sparkle to dull tops (gentle amounts).',
      whenCut: 'Hissy vocal tracks; bright mics that exaggerate the top.',
      q: 1.5,
      problems: ['Hiss', 'Artificial fizz'],
      male:   { freq: 11000, gain: 0.5, q: 1.5, tip: 'Male: tiny amounts — less here than female vocals.' },
      female: { freq: 11000, gain: 1,   q: 1.5, tip: 'Female: a gentle +1 dB air is usually plenty.' }
    },
    {
      id: 'air', name: 'Air', short: 'AIR', range: [12000, 16000], color: '#9575cd',
      character: 'True "air" — space, openness and the feeling of a great room or microphone. The sheen of professional vocals.',
      boost: 'Professional sheen, openness, "expensive" feel. Too much = hissy, thin and brittle.',
      cut: 'Kills hiss and harshness; makes the vocal darker, closer and smaller.',
      whenBoost: 'Close-miked or dull-mic recordings that need room-simulated air.',
      whenCut: 'Noisy or hissy tracks; brightness fatigue.',
      q: 1.2,
      problems: ['Hiss', 'Thinness (if over-boosted)'],
      male:   { freq: 14000, gain: 1,   q: 1.2, tip: 'Male ~13–15 kHz; a high shelf often beats a bell here.' },
      female: { freq: 14500, gain: 1.5, q: 1.2, tip: 'Female ~14–16 kHz; a high shelf works great.' }
    },
    {
      id: 'extreme-air', name: 'Extreme Air / Hiss', short: 'EXT. AIR', range: [16000, 20000], color: '#78909c',
      character: 'The very top octave — mostly hiss, breath noise and codec artifacts. Nothing musical lives here.',
      boost: 'Almost never musical; adds hiss, noise and harshness.',
      cut: 'Removes hiss and noise — usually better as a gentle low-pass at 16–18 kHz.',
      whenBoost: 'Never as a rule. If the vocal lacks air, fix 12–16 kHz instead.',
      whenCut: 'Hissy vocal recordings; lo-fi artifacts — gentle LP at 16–18 kHz.',
      q: 1.5,
      problems: ['Hiss', 'Noise', 'Artifacts'],
      male:   { freq: 18000, gain: 0,   q: 1.5, tip: 'Male: leave flat, or low-pass 17–18 kHz if the track is hissy.' },
      female: { freq: 18000, gain: 0.5, q: 1.5, tip: 'Female: +0.5 dB max; mostly leave this octave alone.' }
    }
  ];

  var TROUBLES = [
    { id: 'muddy', name: 'Muddy', icon: '🫧', symptom: 'Vocals get lost, cloudy, "under a blanket".',
      check: '150–250 Hz (and 250–400 Hz)',
      male: '−2 to −4 dB @ 200–240 Hz · Q ~1.2',
      female: '−2 to −4 dB @ 220–300 Hz · Q ~1.3',
      zones: ['mud-body'] },
    { id: 'boomy', name: 'Boomy', icon: '🥁', symptom: 'Too much chest; every word "booms" on the low notes.',
      check: '60–120 Hz + HPF',
      male: 'HPF 75–85 Hz · −2 to −3 dB @ 80–100 Hz',
      female: 'HPF 95–110 Hz · −2 to −3 dB @ 90–110 Hz',
      zones: ['low-end'] },
    { id: 'boxy', name: 'Boxy', icon: '📦', symptom: 'Like singing into a box or cupboard.',
      check: '250–400 Hz',
      male: '−2 to −3 dB @ 280–320 Hz · Q ~1.4',
      female: '−2 to −3 dB @ 300–360 Hz · Q ~1.5',
      zones: ['boxiness'] },
    { id: 'nasal', name: 'Nasal', icon: '👃', symptom: 'Pinched, "singing through the nose".',
      check: '700 Hz–1.2 kHz (also 400–700 Hz)',
      male: '−2 to −3 dB @ 800–900 Hz · Q ~1.8',
      female: '−2 to −3 dB @ 900 Hz–1.1 kHz · Q ~2.0',
      zones: ['nasal', 'low-mid'] },
    { id: 'hollow', name: 'Hollow', icon: '🕳️', symptom: 'Thin, missing body — a "ghostly" mid-scooped voice.',
      check: '100–250 Hz and 1–3 kHz',
      male: '+2 dB @ 120–180 Hz · +1–2 dB @ 1.2–1.6 kHz',
      female: '+1.5 dB @ 130–200 Hz · +2 dB @ 2–3 kHz',
      zones: ['warmth', 'presence'] },
    { id: 'thin', name: 'Thin', icon: '🪶', symptom: 'Small, weak, no weight or authority.',
      check: '100–250 Hz and 3–5 kHz',
      male: '+2 to +3 dB @ 110–130 Hz · +1.5 dB @ 3.5–4.5 kHz',
      female: '+2 dB @ 130–160 Hz · +1 dB @ 4–5 kHz (watch 5–8 kHz sibilance)',
      zones: ['warmth', 'presence-edge'] },
    { id: 'dull', name: 'Dull', icon: '😴', symptom: 'Dark, buried, boring — no life or sparkle.',
      check: '2–5 kHz',
      male: '+1 to +2 dB @ 2.5–3.5 kHz · Q ~1.3',
      female: '+2 to +3 dB @ 3–4 kHz · Q ~1.4',
      zones: ['intelligibility', 'presence-edge'] },
    { id: 'unclear', name: 'Unclear', icon: '🗣️', symptom: 'Mumbled — you have to strain to understand the lyrics.',
      check: '2–4 kHz',
      male: '+2 dB @ 2.2–2.6 kHz · Q ~1.2',
      female: '+2.5 dB @ 2.8–3.5 kHz · Q ~1.3',
      zones: ['intelligibility'] },
    { id: 'harsh', name: 'Harsh', icon: '⚡', symptom: 'Brittle, unpleasant — the vocal is the first thing to tire you out.',
      check: '2–4 kHz',
      male: '−1 to −3 dB @ 2.5–3.5 kHz · Q ~1.3',
      female: '−1 to −2 dB @ 3–4 kHz · Q ~1.4',
      zones: ['intelligibility', 'presence-edge'] },
    { id: 'aggressive', name: 'Aggressive', icon: '😠', symptom: 'In-your-face and shouty; it fights the whole mix.',
      check: '1–3 kHz',
      male: '−1 to −3 dB @ 1.5–2 kHz · Q ~1.0',
      female: '−1 to −2 dB @ 2–2.5 kHz · Q ~1.1',
      zones: ['presence'] },
    { id: 'sibilant', name: 'Sibilant', icon: '🔊', symptom: 'Harsh S / T / SH / CH — spitty and piercing on consonants.',
      check: '5–8 kHz (de-esser)',
      male: '−2 to −4 dB @ 6–7 kHz · Q ~2, or de-esser 6–8 kHz',
      female: '−2 to −4 dB @ 7–8 kHz · Q ~2.2, or de-esser 7–9 kHz',
      zones: ['sibilance'] },
    { id: 'too-bright', name: 'Too Bright', icon: '🧊', symptom: 'Hissy, icy, brittle top end that never rests.',
      check: '8–12 kHz',
      male: '−1 to −2 dB @ 9–10 kHz · Q ~1.5',
      female: '−2 dB @ 9–11 kHz · Q ~1.5',
      zones: ['brightness', 'upper-brightness'] },
    { id: 'lacking-air', name: 'Lacking Air', icon: '💨', symptom: 'Closed-in and small — no openness or "studio" feel.',
      check: '10–16 kHz',
      male: '+1 to +2 dB @ 12–14 kHz (high shelf)',
      female: '+1.5 to +2.5 dB @ 13–15 kHz (high shelf)',
      zones: ['air'] }
  ];

  /* ═══════════════════════════ STATE ═══════════════════════════ */
  var state = {
    mode: 'male',          // which voice is "active" (edited / emphasized)
    view: 'easy',          // beginner guide first; the full graph is one tap away
    quickProblem: 'muddy',
    showZones: true,
    showCurve: true,
    showMale: true,
    showFemale: false,
    selected: 'mud-body'
  };

  function defaultGains() {
    var g = { male: {}, female: {} };
    ZONES.forEach(function (z) {
      g.male[z.id] = { freq: z.male.freq, gain: z.male.gain, q: z.male.q };
      g.female[z.id] = { freq: z.female.freq, gain: z.female.gain, q: z.female.q };
    });
    return g;
  }
  var gains = defaultGains();

  /* ═══════════════════════════ DOM refs ═══════════════════════════ */
  function $(id) { return document.getElementById(id); }

  var chartEl = $('vq-chart');
  var chipsEl = $('vq-chips');
  var detailEl = $('vq-detail');
  var troublesEl = $('vq-troubles');
  var tableEl = $('vq-table');
  var tooltipEl = $('vq-tooltip');
  var modeMaleBtn = $('vq-mode-male');
  var modeFemaleBtn = $('vq-mode-female');
  var compareBtn = $('vq-compare');
  var resetBtn = $('vq-reset');
  var showZonesChk = $('vq-show-zones');
  var showCurveChk = $('vq-show-curve');
  var showMaleChk = $('vq-show-male');
  var showFemaleChk = $('vq-show-female');
  var voiceBadge = $('vq-voice-badge');
  var easyViewBtn = $('vq-view-easy');
  var advancedViewBtn = $('vq-view-advanced');
  var easyEl = $('vq-easy');
  var advancedEl = $('vq-advanced');
  var easyProblemsEl = $('vq-easy-problems');
  var easyResultEl = $('vq-easy-result');
  var easyStatusEl = $('vq-easy-status');

  var PAD = { top: 22, right: 16, bottom: 42, left: 54 };
  var chartW = 960, chartH = 440;

  function zoneById(id) {
    for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id) return ZONES[i];
    return ZONES[0];
  }

  /* ═══════════════════════════ EQ MATH ═══════════════════════════ */
  function bandDb(f, band) {
    var r = f / band.freq;
    var t = r - 1 / r;
    return band.gain / (1 + Math.pow(band.q * t, 2));
  }
  function curveDb(f, voice) {
    var g = gains[voice], sum = 0;
    ZONES.forEach(function (z) { sum += bandDb(f, g[z.id]); });
    return sum;
  }
  function X(f) {
    return PAD.left + (Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)) * (chartW - PAD.left - PAD.right);
  }
  function Y(db) {
    var plotT = PAD.top, plotB = chartH - PAD.bottom;
    return (plotT + plotB) / 2 - (db / DB_MAX) * ((plotB - plotT) / 2);
  }
  function dbFromY(y) {
    var plotT = PAD.top, plotB = chartH - PAD.bottom;
    var zeroY = (plotT + plotB) / 2;
    var db = ((zeroY - y) / ((plotB - plotT) / 2)) * DB_MAX;
    return Math.max(DB_MIN, Math.min(DB_MAX, Math.round(db * 2) / 2));
  }
  function fmtDB(v) {
    return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + ' dB';
  }
  function fmtFreq(f) { return f >= 1000 ? (f / 1000) + ' kHz' : f + ' Hz'; }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ═══════════════════════════ CHART ═══════════════════════════ */
  var MARKERS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000];
  var drag = null; // { voice, zone } while dragging a node

  function curvePath(voice) {
    var d = '', N = 220;
    for (var i = 0; i <= N; i++) {
      var f = F_MIN * Math.pow(F_MAX / F_MIN, i / N);
      var x = X(f), y = Y(curveDb(f, voice));
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function renderChart() {
    if (!chartEl) return;
    var rect = chartEl.getBoundingClientRect();
    chartW = rect && rect.width ? rect.width : 900;
    /* On a phone the full map pans horizontally with better touch support */
    var isMobile = typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 760;
    if (isMobile) {
      /* Use the actual container width - no minimum - for true responsiveness */
      chartW = Math.max(320, chartW);
      /* Increase padding on mobile so nodes near edges are easier to drag */
      PAD = { top: 22, right: 24, bottom: 44, left: 58 };
    } else {
      PAD = { top: 22, right: 16, bottom: 42, left: 54 };
    }
    /* Make chart height proportional but with reasonable bounds */
    chartH = Math.max(250, Math.min(480, Math.round(chartW * (isMobile ? 0.55 : 0.46))));
    var plotT = PAD.top, plotB = chartH - PAD.bottom, plotL = PAD.left, plotR = chartW - PAD.right;
    var plotH = plotB - plotT, zeroY = (plotT + plotB) / 2;

    var s = '';
    s += '<svg class="vq-svg" viewBox="0 0 ' + chartW + ' ' + chartH + '" role="img" aria-label="Vocal EQ graph, 20 hertz to 20 kilohertz, minus 12 to plus 12 decibels">';

    /* ---- horizontal (gain) grid ---- */
    for (var db = DB_MIN; db <= DB_MAX; db += 3) {
      var y = Y(db);
      var isZero = db === 0;
      s += '<line x1="' + plotL + '" y1="' + y.toFixed(1) + '" x2="' + plotR + '" y2="' + y.toFixed(1) + '" class="vq-hline' + (isZero ? ' zero' : '') + '"/>';
      /* On mobile, show fewer labels to avoid crowding */
      if (isMobile) {
        if (db % 6 === 0 || isZero) {
          s += '<text x="' + (plotL - 7) + '" y="' + (y + 3) + '" class="vq-ylab mobile">' + (db > 0 ? '+' : '') + db + '</text>';
        }
      } else {
        if (db % 6 === 0 || isZero) {
          s += '<text x="' + (plotL - 8) + '" y="' + (y + 3) + '" class="vq-ylab">' + (db > 0 ? '+' : '') + db + '</text>';
        }
      }
    }
    /* Only show axis title on desktop */
    if (!isMobile) {
      s += '<text x="14" y="' + (plotT + 6) + '" class="vq-axis-title">GAIN (dB)</text>';
    }

    /* ---- vertical (frequency) grid ---- */
    MARKERS.forEach(function (f) {
      var x = X(f);
      s += '<line x1="' + x.toFixed(1) + '" y1="' + plotT + '" x2="' + x.toFixed(1) + '" y2="' + plotB + '" class="vq-vline"/>';
      /* On mobile, skip some labels to avoid crowding */
      if (isMobile) {
        /* Only show key frequency markers on mobile */
        if (f === 20 || f === 100 || f === 1000 || f === 10000 || f === 20000) {
          s += '<text x="' + x.toFixed(1) + '" y="' + (chartH - 16) + '" class="vq-xlab mobile">' + (f >= 1000 ? (f / 1000) + 'k' : f) + '</text>';
        }
      } else {
        s += '<text x="' + x.toFixed(1) + '" y="' + (chartH - 18) + '" class="vq-xlab">' + (f >= 1000 ? (f / 1000) + 'k' : f) + '</text>';
      }
    });
    /* Only show the scale info on desktop */
    if (!isMobile) {
      s += '<text x="' + (plotR - 4) + '" y="' + (chartH - 18) + '" class="vq-xlab dim" text-anchor="end">Hz →</text>';
      s += '<text x="' + (plotR - 4) + '" y="' + (chartH - 5) + '" class="vq-xlab dim" text-anchor="end">log scale · ' + F_MIN + ' Hz – ' + (F_MAX / 1000) + ' kHz</text>';
    }

    /* ---- zones ---- */
    if (state.showZones) {
      ZONES.forEach(function (z, i) {
        var x1 = X(z.range[0]), x2 = X(z.range[1]);
        var w = x2 - x1, mid = (x1 + x2) / 2;
        var sel = state.selected === z.id;
        s += '<g class="vq-zone' + (sel ? ' sel' : '') + '" data-zone="' + z.id + '" tabindex="0" role="button" aria-label="' + esc(z.name + ' ' + z.range[0] + ' to ' + z.range[1] + ' hertz') + '">';
        s += '<rect class="vq-zone-bg" x="' + x1.toFixed(1) + '" y="' + plotT + '" width="' + w.toFixed(1) + '" height="' + plotH + '" fill="' + z.color + '" stroke="' + z.color + '" stroke-width="1"/>';
        s += '<rect class="vq-zone-tab" x="' + x1.toFixed(1) + '" y="' + plotT + '" width="' + w.toFixed(1) + '" height="3" fill="' + z.color + '"/>';
        /* On mobile, use shorter labels or rotate to save space */
        if (isMobile) {
          /* For mobile, use short names and rotate if space is tight */
          if (w >= 50) {
            s += '<text x="' + mid.toFixed(1) + '" y="' + (plotT + 14) + '" class="vq-zone-lab mobile" fill="' + z.color + '" text-anchor="middle">' + esc(z.short || z.name) + '</text>';
          } else {
            s += '<text transform="translate(' + (x1 + 3).toFixed(1) + ' ' + (plotT + 38) + ') rotate(90)" class="vq-zone-lab rot mobile" fill="' + z.color + '">' + esc(z.short || z.name) + '</text>';
          }
        } else {
          /* Desktop: use full names */
          if (w >= 74) {
            s += '<text x="' + mid.toFixed(1) + '" y="' + (plotT + 15) + '" class="vq-zone-lab" fill="' + z.color + '" text-anchor="middle">' + esc(z.name) + '</text>';
          } else {
            s += '<text transform="translate(' + (x1 + 4).toFixed(1) + ' ' + (plotT + 46) + ') rotate(90)" class="vq-zone-lab rot" fill="' + z.color + '">' + esc(z.name) + '</text>';
          }
        }
        s += '</g>';
      });
    }

    /* ---- curves ---- */
    if (state.showCurve) {
      ['male', 'female'].forEach(function (voice) {
        if (!state['show' + voice.charAt(0).toUpperCase() + voice.slice(1)]) return;
        var col = VOICE_COLORS[voice];
        var d = curvePath(voice);
        var active = state.mode === voice;
        s += '<g class="vq-curve' + (active ? ' active' : '') + '" data-voice="' + voice + '">';
        s += '<path class="vq-curve-glow" d="' + d + '" stroke="' + col + '"/>';
        s += '<path class="vq-curve-main"' + (active ? ' style="filter:drop-shadow(0 0 5px ' + col + ')"' : '') + ' d="' + d + '" stroke="' + col + '"/>';
        s += '<text x="' + (X(F_MIN) + 5) + '" y="' + (Y(curveDb(F_MIN, voice)) - 5).toFixed(1) + '" class="vq-voice-lab" fill="' + col + '">' + voice.toUpperCase() + (active ? ' ▸' : '') + '</text>';
        s += '</g>';

        /* ---- node handles ---- */
        s += '<g class="vq-nodes" data-voice="' + voice + '">';
        /* Larger touch targets for mobile */
        var hitR = isMobile ? 20 : 9;
        ZONES.forEach(function (z) {
          var b = gains[voice][z.id];
          var x = X(b.freq), y = Y(b.gain);
          /* Larger dots on mobile for better visibility */
          var dotR = isMobile ? 6.5 : (active ? 4.2 : 3.2);
          s += '<g class="vq-node' + (active ? ' active' : '') + '" data-zone="' + z.id + '">';
          s += '<circle class="vq-node-hit" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + hitR + '"/>';
          s += '<circle class="vq-node-dot' + (active ? ' active' : '') + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + dotR + '" fill="' + col + '"/>';
          if (active) {
            /* Adjust text position for mobile */
            var textYOffset = isMobile ? 12 : 9;
            s += '<text x="' + x.toFixed(1) + '" y="' + (y - textYOffset).toFixed(1) + '" class="vq-node-val" text-anchor="middle" fill="' + col + '">' + (b.gain > 0 ? '+' : '') + b.gain.toFixed(1) + '</text>';
          }
          s += '</g>';
        });
        s += '</g>';
      });
    }

    /* ---- hover guide ---- */
    s += '<line class="vq-guide" id="vq-guide" x1="0" y1="' + plotT + '" x2="0" y2="' + plotB + '" hidden="true"/>';
    s += '</svg>';

    chartEl.innerHTML = s;
    /* keep the tooltip inside the positioned chart container */
    if (tooltipEl && chartEl.contains && !chartEl.contains(tooltipEl)) chartEl.appendChild(tooltipEl);
    bindChartEvents();
    syncControls();
  }

  /* ═══════════════════════════ CHART EVENTS ═══════════════════════════ */
  function bindChartEvents() {
    var svg = chartEl.querySelector ? chartEl.querySelector('svg') : null;
    if (!svg) return;

    function toSvgXY(e) {
      var r = svg.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / (r.width || 1)) * chartW,
        y: ((e.clientY - r.top) / (r.height || 1)) * chartH
      };
    }
    function zoneAtX(x) {
      for (var i = 0; i < ZONES.length; i++) {
        if (x >= X(ZONES[i].range[0]) && x <= X(ZONES[i].range[1])) return ZONES[i].id;
      }
      return null;
    }

    /* zone click / keyboard */
    svg.addEventListener('click', function (e) {
      if (drag) return;
      var g = e.target && e.target.closest ? e.target.closest('.vq-zone') : null;
      if (g && g.getAttribute) selectZone(g.getAttribute('data-zone'));
    });
    svg.addEventListener('keydown', function (e) {
      var g = e.target && e.target.closest ? e.target.closest('.vq-zone') : null;
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        selectZone(g.getAttribute('data-zone'));
      }
    });

    svg.addEventListener('pointerleave', function () {
      hideTooltip(svg);
      var zones = svg.querySelectorAll ? svg.querySelectorAll('.vq-zone') : [];
      for (var i = 0; i < zones.length; i++) zones[i].classList.remove('hover');
    });

    /* hover: zone highlight + tooltip + guide */
    var hovered = null;
    svg.addEventListener('pointermove', function (e) {
      var p = toSvgXY(e);
      var zid = state.showZones ? zoneAtX(p.x) : null;
      if (zid !== hovered) {
        hovered = zid;
        var zones = svg.querySelectorAll ? svg.querySelectorAll('.vq-zone') : [];
        for (var i = 0; i < zones.length; i++) {
          zones[i].classList.toggle('hover', zones[i].getAttribute('data-zone') === zid);
        }
      }
      if (drag) {
        var db = dbFromY(p.y);
        var b = gains[drag.voice][drag.zone];
        b.gain = db;
        if (tooltipEl) tooltipEl.hidden = true;
        updateCurveDynamic(svg);
        return;
      }
      var inPlot = p.x >= PAD.left && p.x <= chartW - PAD.right && p.y >= PAD.top && p.y <= chartH - PAD.bottom;
      if (!inPlot || !state.showCurve) { hideTooltip(svg); return; }

      /* guide line + tooltip */
      var guide = svg.querySelector ? svg.querySelector('#vq-guide') : null;
      if (guide) {
        guide.setAttribute('x1', p.x); guide.setAttribute('x2', p.x);
        guide.removeAttribute('hidden');
      }
      if (tooltipEl) {
        var f = F_MIN * Math.pow(F_MAX / F_MIN, (p.x - PAD.left) / (chartW - PAD.left - PAD.right));
        var html = '<span class="vq-tip-f">' + fmtFreq(Math.round(f)) + '</span>';
        var z = zid ? zoneById(zid) : null;
        if (z) html += ' <span class="vq-tip-z">' + esc(z.name) + '</span>';
        html += '<span class="vq-tip-db">';
        if (state.showMale) html += '<span class="m">M ' + fmtDB(curveDb(f, 'male')) + '</span>';
        if (state.showFemale) html += '<span class="f">F ' + fmtDB(curveDb(f, 'female')) + '</span>';
        html += '</span>';
        tooltipEl.innerHTML = html;
        tooltipEl.hidden = false;
        var cRect = chartEl.getBoundingClientRect();
        var tRect = tooltipEl.getBoundingClientRect();
        var tx = p.x + 14, ty = p.y - tRect.height - 12;
        if (tx + (tRect.width || 160) > (cRect.width || chartW)) tx = p.x - (tRect.width || 160) - 14;
        if (ty < 4) ty = p.y + 16;
        tooltipEl.style.left = tx + 'px';
        tooltipEl.style.top = ty + 'px';
      }
    });

    /* node drag (pointer events unify mouse + touch) */
    if (svg.addEventListener && window.PointerEvent) {
      svg.addEventListener('pointerdown', function (e) {
        var node = e.target && e.target.closest ? e.target.closest('.vq-node') : null;
        if (!node || !node.getAttribute) return;
        var voice = node.parentNode ? node.parentNode.getAttribute('data-voice') : null;
        var zone = node.getAttribute('data-zone');
        if (!voice || !zone) return;
        if (voice !== state.mode && !(state.showMale && state.showFemale)) return; // only edit active voice, or either in compare
        drag = { voice: voice, zone: zone };
        try { svg.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      svg.addEventListener('pointerup', function () {
        if (!drag) return;
        drag = null;
        renderAll(); // normalize chart + detail sliders
      });
      svg.addEventListener('pointercancel', function () {
        drag = null;
        renderAll();
      });
    }
  }

  /* fast path during drag: only move curve + node, no full rebuild */
  function updateCurveDynamic(svg) {
    var col = VOICE_COLORS[drag.voice];
    var main = svg.querySelector ? svg.querySelector('.vq-curve[data-voice="' + drag.voice + '"] .vq-curve-main') : null;
    var glow = svg.querySelector ? svg.querySelector('.vq-curve[data-voice="' + drag.voice + '"] .vq-curve-glow') : null;
    var d = curvePath(drag.voice);
    if (main) main.setAttribute('d', d);
    if (glow) glow.setAttribute('d', d);
    var nodes = svg.querySelectorAll ? svg.querySelectorAll('.vq-nodes[data-voice="' + drag.voice + '"] .vq-node') : [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.getAttribute('data-zone') !== drag.zone) continue;
      var b = gains[drag.voice][drag.zone];
      var x = X(b.freq), y = Y(b.gain);
      var circs = n.querySelectorAll ? n.querySelectorAll('circle') : [];
      for (var c = 0; c < circs.length; c++) { circs[c].setAttribute('cx', x); circs[c].setAttribute('cy', y); }
      var txts = n.querySelectorAll ? n.querySelectorAll('text') : [];
      for (var t = 0; t < txts.length; t++) { txts[t].setAttribute('x', x); txts[t].setAttribute('y', y - 7); txts[t].textContent = (b.gain > 0 ? '+' : '') + b.gain.toFixed(1); }
    }
    /* sync sliders + values in the detail panel */
    var gainSl = $('vq-sl-' + drag.voice + '-gain');
    if (gainSl) {
      gainSl.value = b2s(drag);
      var out = $('vq-sl-' + drag.voice + '-gain-o');
      if (out) out.textContent = fmtDB(b2s(drag));
      paintSlider(gainSl);
    }
    function b2s(d) { return String(gains[d.voice][d.zone].gain); }
  }

  function hideTooltip(svg) {
    var guide = svg.querySelector ? svg.querySelector('#vq-guide') : null;
    if (guide) guide.setAttribute('hidden', 'true');
    if (tooltipEl) tooltipEl.hidden = true;
  }

  /* ═══════════════════════════ CHIPS (zone legend) ═══════════════════════════ */
  function renderChips() {
    if (!chipsEl) return;
    var html = '';
    ZONES.forEach(function (z) {
      var b = gains[state.mode][z.id];
      html += '<button type="button" class="vq-chip' + (state.selected === z.id ? ' sel' : '') + '" data-zone="' + z.id + '" style="--zc:' + z.color + '">' +
        '<span class="vq-chip-swatch"></span>' +
        '<span class="vq-chip-name">' + esc(z.name) + '</span>' +
        '<span class="vq-chip-range">' + z.range[0] + '–' + z.range[1] + ' Hz</span>' +
        '<span class="vq-chip-gain">' + (b.gain > 0 ? '+' : '−') + Math.abs(b.gain).toFixed(b.gain % 1 === 0 ? 0 : 1) + ' dB</span>' +
        '</button>';
    });
    chipsEl.innerHTML = html;
  }

  /* ═══════════════════════════ DETAIL PANEL ═══════════════════════════ */
  function sliderRow(voice, z, label, key, min, max, step, unit) {
    var b = gains[voice][z.id];
    var v = b[key];
    var pct = ((v - min) / (max - min)) * 100;
    var val = key === 'gain' ? fmtDB(v) : (key === 'freq' ? fmtFreq(v) : 'Q ' + v.toFixed(1));
    return '<label class="vq-sl" style="--vc:' + VOICE_COLORS[voice] + '">' +
      '<span class="vq-sl-label">' + label + '</span>' +
      '<input class="vq-rng" id="vq-sl-' + voice + '-' + key + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '">' +
      '<output class="vq-sl-val" id="vq-sl-' + voice + '-' + key + '-o">' + val + '</output>' +
      '<span class="vq-sl-fill" style="--fill:' + pct + '%"></span></label>';
  }

  function renderDetail() {
    if (!detailEl) return;
    var z = zoneById(state.selected);
    var idx = ZONES.indexOf(z) + 1;
    var bm = gains.male[z.id], bf = gains.female[z.id];

    var html = '';
    html += '<div class="vq-detail-head">';
    html += '<span class="vq-detail-chip" style="background:' + z.color + '"></span>';
    html += '<div class="vq-detail-titles">';
    html += '<h3>' + esc(z.name) + ' <span class="vq-range">' + z.range[0] + '–' + z.range[1] + ' Hz</span></h3>';
    html += '<p class="vq-detail-sub">Zone ' + idx + ' of ' + ZONES.length + ' · <span class="vq-vt m">Male centre ' + fmtFreq(bm.freq) + '</span> · <span class="vq-vt f">Female centre ' + fmtFreq(bf.freq) + '</span></p>';
    html += '</div></div>';

    html += '<p class="vq-char">' + esc(z.character) + '</p>';

    html += '<div class="vq-four">';
    html += '<div class="vq-mini boost"><h4>Boosting does</h4><p>' + esc(z.boost) + '</p></div>';
    html += '<div class="vq-mini cut"><h4>Cutting does</h4><p>' + esc(z.cut) + '</p></div>';
    html += '<div class="vq-mini whenb"><h4>When to boost</h4><p>' + esc(z.whenBoost) + '</p></div>';
    html += '<div class="vq-mini whenc"><h4>When to cut</h4><p>' + esc(z.whenCut) + '</p></div>';
    html += '</div>';

    html += '<div class="vq-eqcols">';
    ['male', 'female'].forEach(function (voice) {
      var b = gains[voice][z.id];
      var active = state.mode === voice;
      var lo = z.range[0], hi = z.range[1];
      var fstep = (hi - lo) <= 60 ? 1 : 5;
      html += '<div class="vq-eqcol ' + voice + (active ? ' active' : '') + '" style="--vc:' + VOICE_COLORS[voice] + '">';
      html += '<div class="vq-eqhead"><span class="vq-eqdot"></span>Recommended ' + (voice === 'male' ? 'Male' : 'Female') + ' EQ' +
        (active ? '<span class="vq-badge">active</span>' : '') + '</div>';
      html += sliderRow(voice, z, 'Centre freq', 'freq', lo, hi, fstep, 'Hz');
      html += sliderRow(voice, z, 'Gain', 'gain', DB_MIN, DB_MAX, 0.5, 'dB');
      html += sliderRow(voice, z, 'Q / width', 'q', 0.3, 6, 0.1, 'Q');
      html += '<p class="vq-tip">' + esc(b.tip) + '</p>';
      html += '<p class="vq-startlab">Starting point · ' + fmtDB(b.gain) + ' @ ' + fmtFreq(b.freq) + ' · Q ' + b.q.toFixed(1) + '</p>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="vq-problems"><h4>Typical problems in this zone</h4><div class="vq-pchips">';
    z.problems.forEach(function (p) { html += '<span class="vq-pchip">' + esc(p) + '</span>'; });
    html += '</div></div>';

    html += '<p class="vq-startnote">⚠ <b>Starting points, not rules.</b> Sweep the centre frequency around the suggested value, listen in context and make small moves.</p>';
    detailEl.innerHTML = html;

    /* bind sliders */
    ['male', 'female'].forEach(function (voice) {
      ['freq', 'gain', 'q'].forEach(function (key) {
        var sl = $('vq-sl-' + voice + '-' + key);
        if (!sl) return;
        paintSlider(sl);
        sl.addEventListener('input', function () {
          var v = parseFloat(sl.value);
          gains[voice][z.id][key] = v;
          var out = $('vq-sl-' + voice + '-' + key + '-o');
          if (out) out.textContent = key === 'gain' ? fmtDB(v) : (key === 'freq' ? fmtFreq(v) : 'Q ' + v.toFixed(1));
          paintSlider(sl);
          renderChart();      // keep graph in sync
          renderChips();      // gain badges in legend
          renderDetailSilent(voice, z); // keep "starting point" line fresh
        });
      });
    });
  }

  /* re-render just the voice's summary line inside detail (avoids slider re-binding loops) */
  function renderDetailSilent(voice, z) {
    var b = gains[voice][z.id];
    var cols = detailEl.querySelectorAll ? detailEl.querySelectorAll('.vq-eqcol.' + voice) : [];
    for (var i = 0; i < cols.length; i++) {
      var labs = cols[i].querySelectorAll ? cols[i].querySelectorAll('.vq-startlab') : [];
      if (labs.length) labs[0].textContent = 'Starting point · ' + fmtDB(b.gain) + ' @ ' + fmtFreq(b.freq) + ' · Q ' + b.q.toFixed(1);
    }
  }

  function paintSlider(sl) {
    if (!sl) return;
    var min = parseFloat(sl.min || 0), max = parseFloat(sl.max || 1);
    var pct = ((parseFloat(sl.value) - min) / (max - min)) * 100;
    if (sl.style && sl.style.setProperty) sl.style.setProperty('--fill', pct + '%');
  }

  /* ═══════════════════════════ EASY GUIDE ═══════════════════════════ */
  function troubleById(id) {
    for (var i = 0; i < TROUBLES.length; i++) if (TROUBLES[i].id === id) return TROUBLES[i];
    return TROUBLES[0];
  }

  function quickRecipeText() {
    var t = troubleById(state.quickProblem);
    var voice = state.mode === 'female' ? 'Female' : 'Male';
    return voice + ' vocal — ' + t.name + ': ' + t[state.mode] + '. Check ' + t.check + '. Start small and compare with EQ bypassed.';
  }

  function renderEasy() {
    var t = troubleById(state.quickProblem);
    if (easyProblemsEl) {
      var choices = '';
      TROUBLES.forEach(function (problem) {
        var active = problem.id === t.id;
        choices += '<button type="button" class="vq-easy-problem' + (active ? ' active' : '') + '" data-problem="' + problem.id + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
          '<span class="ico" aria-hidden="true">' + problem.icon + '</span>' +
          '<span class="nm">' + esc(problem.name) + '</span></button>';
      });
      easyProblemsEl.innerHTML = choices;
    }

    if (easyResultEl) {
      var voiceName = state.mode === 'female' ? 'Female' : 'Male';
      var recipe = t[state.mode];
      easyResultEl.innerHTML =
        '<div class="vq-result-step"><b>3</b> Try this first</div>' +
        '<div class="vq-result-title"><span class="ico" aria-hidden="true">' + t.icon + '</span><h4>' + esc(t.name) + ' vocal</h4></div>' +
        '<p class="vq-result-symptom">' + esc(t.symptom) + '</p>' +
        '<div class="vq-recipe ' + state.mode + '">' +
          '<span class="vq-recipe-label">' + voiceName + ' vocal · suggested starting move</span>' +
          '<strong class="vq-recipe-value">' + esc(recipe) + '</strong>' +
        '</div>' +
        '<p class="vq-result-check"><b>Listen around:</b> ' + esc(t.check) + '. Start with the first move, keep it gentle, then compare with bypass.</p>' +
        '<div class="vq-result-actions">' +
          '<button type="button" class="vq-easy-action primary" data-easy-action="copy">Copy settings</button>' +
          '<button type="button" class="vq-easy-action" data-easy-action="map">Fine-tune on map</button>' +
        '</div>';
    }
  }

  function setView(view) {
    state.view = view === 'advanced' ? 'advanced' : 'easy';
    var advanced = state.view === 'advanced';
    if (easyEl) easyEl.hidden = advanced;
    if (advancedEl) advancedEl.hidden = !advanced;
    if (easyViewBtn) {
      easyViewBtn.classList.toggle('active', !advanced);
      easyViewBtn.setAttribute('aria-pressed', advanced ? 'false' : 'true');
    }
    if (advancedViewBtn) {
      advancedViewBtn.classList.toggle('active', advanced);
      advancedViewBtn.setAttribute('aria-pressed', advanced ? 'true' : 'false');
    }
    if (advanced) renderChart();
  }

  function copyQuickRecipe() {
    var text = quickRecipeText();
    function success() {
      if (easyStatusEl) easyStatusEl.textContent = '✓ Settings copied — paste them into your session notes.';
    }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        if (ta.select) ta.select();
        if (document.execCommand) document.execCommand('copy');
        if (ta.remove) ta.remove();
        success();
      } catch (err) {
        if (easyStatusEl) easyStatusEl.textContent = 'Could not copy automatically. Press and hold the settings above to copy.';
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(success, fallback);
    } else {
      fallback();
    }
  }

  /* ═══════════════════════════ TROUBLESHOOTING CARDS ═══════════════════════════ */
  function renderTroubles() {
    if (!troublesEl) return;
    var html = '';
    TROUBLES.forEach(function (t) {
      html += '<button type="button" class="vq-tcard" data-trouble="' + t.id + '">' +
        '<span class="vq-tcard-name"><span class="vq-tcard-icon">' + t.icon + '</span>' + esc(t.name) + '</span>' +
        '<span class="vq-tcard-sym">' + esc(t.symptom) + '</span>' +
        '<span class="vq-tcard-row chk"><b>Check</b>' + esc(t.check) + '</span>' +
        '<span class="vq-tcard-row m"><b>Male</b>' + esc(t.male) + '</span>' +
        '<span class="vq-tcard-row f"><b>Female</b>' + esc(t.female) + '</span>' +
        '</button>';
    });
    troublesEl.innerHTML = html;
  }

  /* ═══════════════════════════ QUICK REFERENCE TABLE ═══════════════════════════ */
  function renderTable() {
    if (!tableEl) return;
    var html = '<div class="vq-table-wrap"><table class="vq-table"><thead><tr>' +
      '<th>#</th><th>Range</th><th>Zone</th><th class="m">Male starting EQ</th><th class="f">Female starting EQ</th><th>Q</th>' +
      '</tr></thead><tbody>';
    ZONES.forEach(function (z, i) {
      var bm = gains.male[z.id], bf = gains.female[z.id];
      html += '<tr data-zone="' + z.id + '" tabindex="0">' +
        '<td class="vq-tnum">' + (i + 1) + '</td>' +
        '<td class="vq-trange"><span class="vq-tdot" style="background:' + z.color + '"></span>' + z.range[0] + '–' + z.range[1] + ' Hz</td>' +
        '<td class="vq-tname">' + esc(z.name) + '</td>' +
        '<td class="m">' + fmtDB(bm.gain) + ' @ ' + fmtFreq(bm.freq) + '</td>' +
        '<td class="f">' + fmtDB(bf.gain) + ' @ ' + fmtFreq(bf.freq) + '</td>' +
        '<td>' + (z.q % 1 === 0 ? z.q.toFixed(0) : z.q.toFixed(1)) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    tableEl.innerHTML = html;
  }

  /* ═══════════════════════════ ACTIONS ═══════════════════════════ */
  function selectZone(id) {
    state.selected = id;
    renderChart();
    renderChips();
    renderDetail();
    var head = detailEl && detailEl.querySelector ? detailEl.querySelector('.vq-detail-head') : null;
    if (head && head.scrollIntoView && window.innerWidth < 900) head.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function switchVoice(voice) {
    state.mode = voice;
    state.showMale = voice === 'male';
    state.showFemale = voice === 'female';
    renderAll();
  }

  function setCompare(on) {
    if (on) {
      state.showMale = true;
      state.showFemale = true;
    } else {
      state.showMale = state.mode === 'male';
      state.showFemale = state.mode === 'female';
    }
    renderAll();
  }

  function resetAll() {
    gains = defaultGains();
    state.mode = 'male';
    state.quickProblem = 'muddy';
    state.showZones = true;
    state.showCurve = true;
    state.showMale = true;
    state.showFemale = false;
    renderAll();
  }

  function renderAll() {
    renderEasy();
    renderChart();
    renderChips();
    renderDetail();
    renderTroubles();
    renderTable();
    syncControls();
    setView(state.view);
  }

  function syncControls() {
    if (showZonesChk) showZonesChk.checked = state.showZones;
    if (showCurveChk) showCurveChk.checked = state.showCurve;
    if (showMaleChk) showMaleChk.checked = state.showMale;
    if (showFemaleChk) showFemaleChk.checked = state.showFemale;
    if (modeMaleBtn) {
      modeMaleBtn.classList.toggle('active', state.mode === 'male');
      modeMaleBtn.setAttribute('aria-pressed', state.mode === 'male' ? 'true' : 'false');
    }
    if (modeFemaleBtn) {
      modeFemaleBtn.classList.toggle('active', state.mode === 'female');
      modeFemaleBtn.setAttribute('aria-pressed', state.mode === 'female' ? 'true' : 'false');
    }
    if (compareBtn) compareBtn.classList.toggle('active', state.showMale && state.showFemale);
    if (voiceBadge) {
      var both = state.showMale && state.showFemale;
      voiceBadge.innerHTML = both
        ? '<span class="m">MALE</span> + <span class="f">FEMALE</span> · comparison'
        : '<span class="' + (state.mode === 'male' ? 'm' : 'f') + '">' + state.mode.toUpperCase() + ' VOCAL</span> · editing';
    }
  }

  /* ═══════════════════════════ WIRE UP ═══════════════════════════ */
  function bind() {
    if (modeMaleBtn) modeMaleBtn.addEventListener('click', function () { switchVoice('male'); });
    if (modeFemaleBtn) modeFemaleBtn.addEventListener('click', function () { switchVoice('female'); });
    if (easyViewBtn) easyViewBtn.addEventListener('click', function () { setView('easy'); });
    if (advancedViewBtn) advancedViewBtn.addEventListener('click', function () { setView('advanced'); });
    if (compareBtn) compareBtn.addEventListener('click', function () { setCompare(!(state.showMale && state.showFemale)); });
    if (resetBtn) resetBtn.addEventListener('click', resetAll);

    if (easyProblemsEl) easyProblemsEl.addEventListener('click', function (e) {
      var problem = e.target && e.target.closest ? e.target.closest('.vq-easy-problem') : null;
      if (!problem || !problem.getAttribute) return;
      state.quickProblem = problem.getAttribute('data-problem');
      if (easyStatusEl) easyStatusEl.textContent = '';
      renderEasy();
      if (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 860 && easyResultEl && easyResultEl.scrollIntoView) {
        easyResultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    if (easyResultEl) easyResultEl.addEventListener('click', function (e) {
      var action = e.target && e.target.closest ? e.target.closest('[data-easy-action]') : null;
      if (!action || !action.getAttribute) return;
      if (action.getAttribute('data-easy-action') === 'copy') {
        copyQuickRecipe();
        return;
      }
      if (action.getAttribute('data-easy-action') === 'map') {
        var problem = troubleById(state.quickProblem);
        if (problem.zones && problem.zones.length) state.selected = problem.zones[0];
        state.view = 'advanced';
        renderAll();
        if (advancedEl && advancedEl.scrollIntoView) advancedEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    if (showZonesChk) showZonesChk.addEventListener('change', function () { state.showZones = showZonesChk.checked; renderChart(); });
    if (showCurveChk) showCurveChk.addEventListener('change', function () { state.showCurve = showCurveChk.checked; renderChart(); });
    if (showMaleChk) showMaleChk.addEventListener('change', function () {
      state.showMale = showMaleChk.checked;
      if (!state.showMale && !state.showFemale) state.mode = 'female';
      if (state.showMale && !state.showFemale) state.mode = 'male';
      renderChart();
      syncControls();
    });
    if (showFemaleChk) showFemaleChk.addEventListener('change', function () {
      state.showFemale = showFemaleChk.checked;
      if (!state.showMale && !state.showFemale) state.mode = 'male';
      if (state.showFemale && !state.showMale) state.mode = 'female';
      renderChart();
      syncControls();
    });

    if (chipsEl) chipsEl.addEventListener('click', function (e) {
      var chip = e.target && e.target.closest ? e.target.closest('.vq-chip') : null;
      if (chip && chip.getAttribute) selectZone(chip.getAttribute('data-zone'));
    });

    if (troublesEl) troublesEl.addEventListener('click', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.vq-tcard') : null;
      if (!card || !card.getAttribute) return;
      var t = null;
      for (var i = 0; i < TROUBLES.length; i++) if (TROUBLES[i].id === card.getAttribute('data-trouble')) t = TROUBLES[i];
      if (!t || !t.zones.length) return;
      selectZone(t.zones[0]);
    });

    if (tableEl) tableEl.addEventListener('click', function (e) {
      var row = e.target && e.target.closest ? e.target.closest('tr[data-zone]') : null;
      if (row && row.getAttribute) selectZone(row.getAttribute('data-zone'));
    });
    if (tableEl) tableEl.addEventListener('keydown', function (e) {
      var row = e.target && e.target.closest ? e.target.closest('tr[data-zone]') : null;
      if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectZone(row.getAttribute('data-zone')); }
    });

    var resizeT;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { renderChart(); hideTooltipSilent(); }, 120);
    });
    function hideTooltipSilent() { if (tooltipEl) tooltipEl.hidden = true; }
  }

  /* init */
  bind();
  renderAll();
  window.addEventListener('raaga:tab', function (e) {
    if (e && e.detail === 'vocal-eq') renderChart(); // re-measure when tab becomes visible
  });

  /* export for tests / debugging */
  window.VOCAL_EQ = {
    data: { zones: ZONES, troubles: TROUBLES },
    state: state,
    gains: gains,
    switchVoice: switchVoice,
    selectZone: selectZone,
    setView: setView,
    reset: resetAll,
    fmtDB: fmtDB
  };
})();
