/**
 * practical_eq_test.js — Node tests for the Practical EQ analysis engine.
 * Synthesizes different "vocals" (different f0, different spectral problems)
 * and asserts the engine reports DIFFERENT, audio-derived results — never a
 * predefined template.
 */
'use strict';

var PEQ = require('../js/practical-eq.js');

var passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓ ' + msg); }
  else { failed++; console.error('  ✗ ' + msg); }
}

var SR = 48000;

// ─── synthetic vocal generator ─────────────────────────────────────────────
// Harmonic series + breath noise, shaped by simple resonators, with a
// syllabic amplitude envelope and optional sibilant bursts.
function biquadPeak(x, sr, f0, q, gainDb) {
  var A = Math.pow(10, gainDb / 40);
  var w0 = 2 * Math.PI * f0 / sr;
  var alpha = Math.sin(w0) / (2 * q);
  var b0 = 1 + alpha * A, b1 = -2 * Math.cos(w0), b2 = 1 - alpha * A;
  var a0 = 1 + alpha / A, a1 = -2 * Math.cos(w0), a2 = 1 - alpha / A;
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  var y = new Float32Array(x.length);
  var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (var i = 0; i < x.length; i++) {
    var v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function makeVocal(opts) {
  var sec = opts.seconds || 6;
  var n = Math.floor(sec * SR);
  var x = new Float32Array(n);
  var f0 = opts.f0;
  var phase = 0;
  var seed = opts.seed || 1;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; }

  for (var i = 0; i < n; i++) {
    var t = i / SR;
    // syllabic envelope (voiced 70% of the time)
    var env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2.6 * t);
    env = env > 0.25 ? env : 0;
    var vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5.2 * t);
    phase += 2 * Math.PI * f0 * vib / SR;
    var s = 0;
    for (var h = 1; h <= Math.min(40, Math.floor(20000 / f0)); h++) {
      s += Math.pow(h, -(opts.rolloff || 1.4)) * Math.sin(phase * h + h * 0.7);
    }
    s *= env * 0.35;
    s += rnd() * (opts.breath || 0.0015) * env;      // breath
    s += rnd() * (opts.noiseFloor || 0.0002);        // noise floor
    x[i] = s;
  }

  // sibilant bursts
  if (opts.sibilance) {
    var sf = opts.sibilanceFreq || 7000;
    for (var b = 0; b < Math.floor(sec * 1.6); b++) {
      var start = Math.floor((b + 0.4) / 1.6 * SR);
      var len = Math.floor(0.07 * SR);
      var burst = new Float32Array(len);
      for (var j = 0; j < len; j++) burst[j] = rnd();
      burst = biquadPeak(burst, SR, sf, 2.5, 18);
      for (var j2 = 0; j2 < len && start + j2 < n; j2++) {
        var w = Math.sin(Math.PI * j2 / len);
        x[start + j2] += burst[j2] * opts.sibilance * w;
      }
    }
  }

  // resonances / tonal shaping
  (opts.peaks || []).forEach(function (p) {
    x = biquadPeak(x, SR, p[0], p[1], p[2]);
  });

  // rumble
  if (opts.rumble) {
    for (var k = 0; k < n; k++) {
      x[k] += opts.rumble * Math.sin(2 * Math.PI * (opts.rumbleFreq || 42) * k / SR);
    }
  }
  return x;
}

function run(x) { return PEQ.analyzeChannels([x], SR, {}); }
function find(list, id) { return list.filter(function (i) { return i.id === id; })[0]; }
function ids(list) { return list.map(function (i) { return i.id; }); }

console.log('PRACTICAL_EQ engine tests\n');

// ─── Vocal A: male-ish, mud at ~290 Hz, rumble, dull top ───────────────────
var A = run(makeVocal({
  f0: 128, seed: 7, rolloff: 1.7, rumble: 0.02, rumbleFreq: 44,
  peaks: [[290, 1.2, 9], [12000, 0.7, -14]]
}));

// ─── Vocal B: female-ish, resonance ~880 Hz, sibilance at 7.6k, no rumble ──
var B = run(makeVocal({
  f0: 232, seed: 21, rolloff: 1.25, sibilance: 0.14, sibilanceFreq: 7600,
  peaks: [[880, 6, 12]]
}));

console.log('Vocal A decrease:', A.decrease.map(function (d) { return d.characteristic + ' ' + d.frequency + 'Hz ' + d.gain + 'dB'; }).join(' | '));
console.log('Vocal A increase:', A.increase.map(function (d) { return d.characteristic + ' ' + d.frequency + 'Hz ' + d.gain + 'dB'; }).join(' | '));
console.log('Vocal B decrease:', B.decrease.map(function (d) { return d.characteristic + ' ' + d.frequency + 'Hz ' + d.gain + 'dB'; }).join(' | '));
console.log('Vocal B increase:', B.increase.map(function (d) { return d.characteristic + ' ' + d.frequency + 'Hz ' + d.gain + 'dB'; }).join(' | '));
console.log('');

// pitch adaptation
assert(A.voice.fundamental > 110 && A.voice.fundamental < 150, 'Vocal A fundamental ≈128 Hz (got ' + A.voice.fundamental + ')');
assert(B.voice.fundamental > 205 && B.voice.fundamental < 260, 'Vocal B fundamental ≈232 Hz (got ' + B.voice.fundamental + ')');

// results differ between files — the core requirement
var sigA = JSON.stringify(A.decrease.map(function (d) { return [d.id, d.frequency, d.gain]; }));
var sigB = JSON.stringify(B.decrease.map(function (d) { return [d.id, d.frequency, d.gain]; }));
assert(sigA !== sigB, 'different vocals → different DECREASE results');
assert(JSON.stringify(A.priorities) !== JSON.stringify(B.priorities), 'different vocals → different priorities');

// A: low-mid problem found near the injected 290 Hz peak
var lowA = A.decrease.filter(function (d) { return d.frequency >= 200 && d.frequency <= 420; })[0];
assert(!!lowA, 'Vocal A: low-mid build-up detected near the injected 290 Hz peak');
if (lowA) {
  assert(Math.abs(lowA.frequency - 290) < 120, '  measured centre ' + lowA.frequency + ' Hz is near 290 Hz');
  assert(lowA.gain < 0 && lowA.gain > -7, '  recommended cut ' + lowA.gain + ' dB is a sane starting move');
  assert(lowA.range && lowA.range[0] < lowA.frequency && lowA.range[1] > lowA.frequency, '  range brackets the centre');
}
var rumbleA = find(A.decrease, 'rumble');
assert(!!rumbleA, 'Vocal A: rumble detected (44 Hz tone injected)');
assert(!find(B.decrease, 'rumble'), 'Vocal B: no rumble reported (none injected)');

// B: resonance near 880 Hz, and it is not the harmonic series
var resB = B.decrease.filter(function (d) { return d.frequency >= 700 && d.frequency <= 1100; })[0];
assert(!!resB, 'Vocal B: mid resonance detected near injected 880 Hz');
if (resB) assert(Math.abs(resB.frequency - 880) < 180, '  measured centre ' + resB.frequency + ' Hz is near 880 Hz');

var sibB = find(B.decrease, 'sibilance');
assert(!!sibB, 'Vocal B: sibilance detected (bursts injected at 7.6 kHz)');
if (sibB) {
  assert(sibB.frequency > 5000 && sibB.frequency < 11000, '  sibilance centre ' + sibB.frequency + ' Hz measured in range');
  assert(sibB.persistence === 'intermittent' || sibB.persistence === 'transient', '  sibilance flagged as non-continuous');
}
assert(!find(A.decrease, 'sibilance'), 'Vocal A: no sibilance reported (none injected)');

// A: dull top end should surface as an increase opportunity, not a fixed 12 kHz
var hiA = A.increase.filter(function (i) { return i.frequency > 6000; })[0];
assert(!!hiA, 'Vocal A: high-frequency boost opportunity detected (top rolled off)');

// no forced categories
assert(A.notDetected.length > 0, 'Vocal A: some characteristics correctly NOT DETECTED');
assert(B.notDetected.length > 0, 'Vocal B: some characteristics correctly NOT DETECTED');
var total = PEQ.CHARACTERISTICS.length;
assert(A.decrease.length + A.increase.length < total, 'Vocal A: not every category forced into a recommendation');

// structure contract
assert(Array.isArray(A.decrease) && Array.isArray(A.increase) && Array.isArray(A.unchanged) && Array.isArray(A.notDetected),
  'result exposes decrease / increase / unchanged / notDetected');
assert(A.spectrum.length > 100 && A.spectrum[0].f >= 20, 'measured spectrum returned for the graph');
assert(A.decrease.every(function (d) { return d.confidence >= 0.5 && d.confidence <= 1; }), 'confidences within 0.5–1.0');
assert(A.decrease.every(function (d) { return ['Low', 'Medium', 'High', 'Critical'].indexOf(d.severity) >= 0; }), 'severity from the allowed set');
assert(A.decrease.concat(A.increase).every(function (d) { return d.explanation && d.explanation.length > 20; }), 'every finding carries an explanation');
assert(A.decrease.every(function (d) { return d.gainRange && d.gainRange.length === 2; }), 'every cut has a suggested working range');
assert(A.unchanged.every(function (u) { return Math.abs(u.deviation) < 1.2; }), 'unchanged items really are near-zero deviation');

// graph/report share one source of truth: priorities reference real findings
var all = {};
A.decrease.concat(A.increase).forEach(function (f) { all[f.id] = f; });
assert(A.priorities.every(function (p) {
  return all[p.id] && all[p.id].frequency === p.frequency && all[p.id].gain === p.gain;
}), 'priority list values match the underlying findings exactly');

// determinism (same audio → same answer; no randomness anywhere)
var A2 = run(makeVocal({ f0: 128, seed: 7, rolloff: 1.7, rumble: 0.02, rumbleFreq: 44, peaks: [[290, 1.2, 9], [12000, 0.7, -14]] }));
assert(JSON.stringify(A2.decrease) === JSON.stringify(A.decrease), 'analysis is deterministic (no random values)');

// third vocal: clean take should produce far fewer cuts than a problem take
var C = run(makeVocal({ f0: 180, seed: 33, rolloff: 1.35 }));
console.log('Vocal C (clean) decrease:', C.decrease.map(function (d) { return d.characteristic + ' ' + d.frequency + 'Hz'; }).join(' | ') || '(none)');
assert(C.decrease.length <= B.decrease.length, 'clean take yields no more cuts than the problem take');
assert(C.unchanged.length > 0, 'clean take reports balanced regions in UNCHANGED');

// guard rails
var threw = false;
try { PEQ.analyzeChannels([new Float32Array(100)], SR, {}); } catch (e) { threw = /too short/i.test(e.message); }
assert(threw, 'extremely short audio rejected with a friendly message');
threw = false;
try { PEQ.analyzeChannels([new Float32Array(0)], SR, {}); } catch (e) { threw = /no audio samples/i.test(e.message); }
assert(threw, 'empty audio rejected with a friendly message');

// harmonic guard
assert(PEQ._internals.isHarmonic(440, 220, 0.9) === true, 'harmonic detector recognises 2×f0');
assert(PEQ._internals.isHarmonic(517, 220, 0.9) === false, 'harmonic detector rejects a non-harmonic peak');

// ─── edge cases ────────────────────────────────────────────────────────────
threw = false;
try { PEQ.analyzeChannels([new Float32Array(SR * 3)], SR, {}); }
catch (e) { threw = /silent/i.test(e.message); }
assert(threw, 'digital silence rejected instead of producing a recommendation');

var short = run(makeVocal({ f0: 200, seconds: 0.7, seed: 3 }));
assert(short.decrease.concat(short.increase).every(function (f) { return f.confidence >= 0.5; }),
  'short recording still only reports findings it is confident about');

// a "full mix" (vocal + bass + kick + cymbals) must warn, but still analyze
var mix = makeVocal({ f0: 190, seed: 5, seconds: 8 });
(function () {
  var sd = 9;
  function rnd() { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff * 2 - 1; }
  for (var i = 0; i < mix.length; i++) {
    mix[i] += 0.25 * Math.sin(2 * Math.PI * 55 * i / SR) + 0.2 * Math.sin(2 * Math.PI * 110 * i / SR);
    mix[i] += 0.12 * rnd() + 0.15 * Math.sin(2 * Math.PI * 330 * i / SR);
    if (i % Math.floor(SR * 0.5) < 300) mix[i] += 0.5 * Math.sin(2 * Math.PI * 60 * i / SR);
  }
})();
var M = run(mix);
assert(M.warnings.length > 0, 'dense multi-source file raises a reliability warning');
assert(M.decrease.length + M.increase.length + M.unchanged.length > 0, 'dense file is still analyzed, not rejected');

// low sample rate / band-limited file must not recommend boosting empty air
var LO = PEQ.analyzeChannels([makeVocal({ f0: 150, seed: 6, seconds: 5 })], 16000, {});
var airLo = LO.increase.filter(function (i) { return i.frequency > 7500; });
assert(airLo.length === 0, 'band-limited file does not recommend boosting above its bandwidth');

// mono and duplicated-stereo of the same take agree
var one = makeVocal({ f0: 150, seed: 2, seconds: 5 });
var mono = PEQ.analyzeChannels([one], SR, {});
var duped = PEQ.analyzeChannels([one, one], SR, {});
assert(JSON.stringify(mono.decrease) === JSON.stringify(duped.decrease),
  'dual-mono stereo gives the same answer as mono');
assert(duped.warnings.some(function (w) { return w.code === 'stereo'; }),
  'stereo recording raises an informational stereo warning');

// ─── new descriptors (width / behaviour / shape / confidence / quality) ───
var ALL_BEHAVIORS = ['static', 'dynamic', 'persistent', 'intermittent'];
var ALL_WIDTHS = ['very-narrow', 'narrow', 'medium', 'broad', 'very-broad', 'unknown'];
var ALL_SHAPES = ['high-pass', 'low-pass', 'bell-broad', 'bell-medium', 'bell-narrow', 'high-shelf', 'low-shelf', 'dynamic-bell', 'de-ess'];
var ALL_TIERS = ['very-strong', 'strong', 'moderate', 'weak'];

var allFindings = A.decrease.concat(A.increase, B.decrease, B.increase);
assert(allFindings.every(function (f) { return f.widthClass && ALL_WIDTHS.indexOf(f.widthClass) >= 0; }),
  'every finding reports a measured width class');
assert(allFindings.every(function (f) { return f.behavior && ALL_BEHAVIORS.indexOf(f.behavior) >= 0; }),
  'every finding reports a static/dynamic/persistent/intermittent behaviour');
assert(allFindings.every(function (f) { return f.eqShape && ALL_SHAPES.indexOf(f.eqShape) >= 0 && f.eqShapeLabel; }),
  'every finding suggests an EQ shape from the allowed set');
assert(allFindings.every(function (f) { return ALL_TIERS.indexOf(f.confidenceTier) >= 0 && f.confidenceLabel; }),
  'every finding carries a confidence tier and label');
assert(allFindings.every(function (f) { return typeof f.audibleEffect === 'string' && f.audibleEffect.length > 0; }),
  'every finding explains what you may hear');

// confidence must change the result, not decorate it
assert(allFindings.every(function (f) {
  return !(f.confidence < 0.6) || (f.possible === true && f.gain == null && f.verifyByEar === true);
}), 'weak evidence (50–59%) → possible issue, no invented gain, verify by ear');
assert(allFindings.every(function (f) { return !(f.confidence >= 0.6) || f.gain != null; }),
  'confident evidence (≥60%) carries a recommended gain');
assert(B.decrease.some(function (f) { return f.possible; }),
  'Vocal B: a weak-evidence finding is reported as a possible issue');

// temporal classification is data-driven
assert(find(B.decrease, 'sibilance').behavior === 'dynamic', 'sibilance classified DYNAMIC from its temporal behaviour');
assert(find(B.decrease, 'sibilance').eqShape === 'de-ess', 'sibilance suggests a de-esser / dynamic HF control');
var narrowB = B.decrease.filter(function (f) { return f.widthClass === 'narrow' || f.widthClass === 'very-narrow'; });
assert(narrowB.length > 0, 'Vocal B: a narrow-width finding is measured');
assert(narrowB.every(function (f) { return f.behavior === 'persistent' || f.behavior === 'intermittent'; }),
  'narrow features are persistent or intermittent, never static');
assert(narrowB.some(function (f) { return f.eqShape === 'bell-narrow'; }), 'narrow finding suggests Bell — Narrow');

// width classification derives from the measured octave width
assert(PEQ._internals.widthClassOf(0.05).id === 'narrow', 'widthClassOf(0.05 oct) → narrow');
assert(PEQ._internals.widthClassOf(0.7).id === 'broad', 'widthClassOf(0.7 oct) → broad');
assert(PEQ._internals.widthClassOf(1.3).id === 'broad', 'widthClassOf(1.3 oct) → broad');

// behaviour classifier is driven by frames/segments/burstiness
assert(PEQ._internals.classifyBehavior({ frac: 0.8, burstiness: 0.2, segments: 1 }, 0.7) === 'static', 'broad & consistent → static');
assert(PEQ._internals.classifyBehavior({ frac: 0.8, burstiness: 0.2, segments: 3 }, 0.1) === 'persistent', 'narrow & repeated → persistent');
assert(PEQ._internals.classifyBehavior({ frac: 0.2, burstiness: 0.8, segments: 5 }, 0.1) === 'dynamic', 'bursty → dynamic');
assert(PEQ._internals.classifyBehavior({ frac: 0.15, burstiness: 0.1, segments: 1 }, 0.1) === 'intermittent', 'occasional → intermittent');

// EQ shape is derived from the measured characteristic, not hard-coded
assert(PEQ._internals.eqShapeFor({ id: 'mud', dir: 'cut', frequency: 286, widthClass: 'broad', behavior: 'static' }).shape === 'bell-broad', 'broad mud → Bell — Broad');
assert(PEQ._internals.eqShapeFor({ id: 'resonance', dir: 'cut', frequency: 742, widthClass: 'narrow', behavior: 'persistent' }).shape === 'bell-narrow', 'narrow resonance → Bell — Narrow');
assert(PEQ._internals.eqShapeFor({ id: 'air', dir: 'boost', frequency: 13200, widthClass: 'broad', behavior: 'static' }).shape === 'high-shelf', 'air → High Shelf');
assert(PEQ._internals.eqShapeFor({ id: 'sibilance', dir: 'cut', frequency: 7100, widthClass: 'narrow', behavior: 'dynamic' }).shape === 'de-ess', 'sibilance → de-esser');
assert(PEQ._internals.eqShapeFor({ id: 'rumble', dir: 'cut', frequency: 48, widthClass: 'broad', behavior: 'static' }).shape === 'high-pass', 'rumble → High-pass');

// confidence tiers map to the documented 0–100% bands
assert(PEQ._internals.confidenceTier(0.94).id === 'very-strong', '94% → very strong evidence');
assert(PEQ._internals.confidenceTier(0.84).id === 'strong', '84% → strong evidence');
assert(PEQ._internals.confidenceTier(0.68).id === 'moderate', '68% → moderate evidence');
assert(PEQ._internals.confidenceTier(0.54).id === 'weak', '54% → weak evidence');
assert(PEQ._internals.confidenceTier(0.4).id === 'insufficient', '<50% → insufficient confidence');

// vocal fundamental + range + honest confidence
assert(typeof A.voice.confidence === 'number' && A.voice.confidence >= 0 && A.voice.confidence <= 1,
  'voice fundamental confidence is a 0–1 value');
assert(Array.isArray(A.voice.range) && A.voice.range.length === 2, 'voice exposes an estimated vocal range');
assert(typeof A.voice.ambiguous === 'boolean', 'voice flags ambiguous/unstable pitch');

// recording-quality diagnostics
assert(typeof A.quality.clipped === 'boolean' && typeof A.quality.veryLowSignal === 'boolean',
  'quality reports clipping and low-signal flags');
assert(isFinite(A.quality.peakDbFS) && isFinite(A.quality.crestDb), 'quality reports sample peak and crest factor');
assert(A.warnings.every(function (w) { return w.level && w.code && w.text; }), 'warnings carry level/code/text');

// clipped material is flagged as such
var clip = new Float32Array(SR * 2);
for (var ci = 0; ci < clip.length; ci++) clip[ci] = Math.max(-1, Math.min(1, 1.5 * Math.sin(2 * Math.PI * 180 * ci / SR)));
var clippedTake = PEQ.analyzeChannels([clip], SR, {});
assert(clippedTake.quality.clipped === true, 'clipped recording is flagged');

// clipping in a single stereo channel is caught even when the mono downmix cancels it
var clipL = new Float32Array(SR * 2);
var clipR = new Float32Array(SR * 2);
for (var ci2 = 0; ci2 < clipL.length; ci2++) {
  clipL[ci2] = Math.max(-1, Math.min(1, 1.5 * Math.sin(2 * Math.PI * 180 * ci2 / SR)));
  clipR[ci2] = -clipL[ci2] * 0.9;
}
var stereoClip = PEQ.analyzeChannels([clipL, clipR], SR, {});
assert(stereoClip.quality.clipped === true, 'clipping in a single stereo channel is flagged');

// very quiet material is flagged as low signal
var quietSig = new Float32Array(SR * 2);
for (var qi = 0; qi < quietSig.length; qi++) quietSig[qi] = 0.0008 * Math.sin(2 * Math.PI * 160 * qi / SR) + 0.0002 * (Math.sin(qi * 0.7) + Math.sin(qi * 1.3));
var quietTake = PEQ.analyzeChannels([quietSig], SR, {});
assert(quietTake.quality.veryLowSignal === true, 'very low-level recording is flagged');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
