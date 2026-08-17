/**
 * practical-eq.js — Practical EQ analysis engine (no DOM, no audio processing).
 *
 * Pipeline:
 *   Audio Loader (analyzeFile)      → decode with Web Audio, read container info
 *     → Feature Extraction          → STFT frames, log-band grid, f0/harmonics,
 *                                     tilt fit, octave envelope, temporal stats
 *     → Characteristic Detector     → measures each candidate region/peak on THIS vocal
 *     → Recommendation Engine       → decrease / increase / unchanged / notDetected
 *     → Analysis Result (plain data consumed by the UI *and* the graph)
 *
 * Nothing here modifies, renders or filters audio. It only measures.
 * Every frequency, range, gain, confidence and severity is computed from the
 * uploaded samples — the constants below are only *candidate search regions*
 * and statistical thresholds, never output values.
 *
 * Exposes window.PRACTICAL_EQ (and module.exports for the Node test suite).
 */
'use strict';

(function (root) {

  // ─── small helpers ────────────────────────────────────────────────────────
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function db(x) { return 10 * Math.log10(Math.max(x, 1e-20)); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function median(arr) {
    if (!arr || !arr.length) return NaN;
    var a = Array.prototype.slice.call(arr).filter(isNum).sort(function (x, y) { return x - y; });
    if (!a.length) return NaN;
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function percentile(arr, p) {
    var a = Array.prototype.slice.call(arr).filter(isNum).sort(function (x, y) { return x - y; });
    if (!a.length) return NaN;
    var idx = clamp(Math.round((a.length - 1) * p), 0, a.length - 1);
    return a[idx];
  }

  function fmtHz(f) {
    if (!isNum(f)) return '—';
    if (f >= 10000) return (f / 1000).toFixed(1) + ' kHz';
    if (f >= 1000) return (f / 1000).toFixed(2).replace(/0$/, '') + ' kHz';
    return Math.round(f) + ' Hz';
  }

  function fmtGain(g) {
    if (!isNum(g)) return '—';
    return (g > 0 ? '+' : g < 0 ? '−' : '') + Math.abs(g).toFixed(1) + ' dB';
  }

  // ─── FFT (in-place radix-2) ───────────────────────────────────────────────
  function fftRadix2(re, im) {
    var n = re.length, i, j = 0, k, m, t;
    for (i = 0; i < n - 1; i++) {
      if (i < j) {
        t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
      k = n >> 1;
      while (k <= j) { j -= k; k >>= 1; }
      j += k;
    }
    for (m = 1; m < n; m <<= 1) {
      var step = m << 1;
      var theta = -Math.PI / m;
      var wr = Math.cos(theta), wi = Math.sin(theta);
      for (var g = 0; g < n; g += step) {
        var cr = 1, ci = 0;
        for (var p = 0; p < m; p++) {
          var i1 = g + p, i2 = i1 + m;
          var tr = cr * re[i2] - ci * im[i2];
          var ti = cr * im[i2] + ci * re[i2];
          re[i2] = re[i1] - tr; im[i2] = im[i1] - ti;
          re[i1] += tr; im[i1] += ti;
          var nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }

  // ─── configuration (search regions & statistics only) ─────────────────────
  var BANDS_PER_OCTAVE = 12;
  var F_MIN = 20;
  var F_MAX = 20000;
  var MAX_FRAMES = 420;          // frames spread across the WHOLE file
  var MIN_ACTIVE_FRAMES = 6;
  var GATE_BELOW_PEAK_DB = 32;   // frame gate relative to loudest frame
  var BALANCED_DB = 1.1;         // |deviation| under this → already balanced
  var MIN_CONFIDENCE = 0.5;      // below this we refuse to invent a value

  /**
   * Candidate characteristics. `lo`/`hi` are *search* regions only — the
   * reported centre frequency and range always come from the measured
   * deviation inside the region. `f0lo`/`f0hi` (multiples of the detected
   * fundamental) make the search region adapt to the singer's voice.
   */
  var CHARACTERISTICS = [
    // ── LOW ────────────────────────────────────────────────────────────────
    { id: 'rumble', label: 'Rumble', group: 'Low', kind: 'sub', dir: 'cut',
      lo: 20, hi: 90, f0hi: 0.6,
      why: 'Low-frequency energy below the voice’s fundamental — stands, HVAC, traffic or handling noise.' },
    { id: 'plosive', label: 'Plosive energy', group: 'Low', kind: 'plosive', dir: 'cut',
      lo: 20, hi: 140, f0hi: 0.9,
      why: 'Short bursts of low-frequency energy on P/B sounds hitting the capsule.' },
    { id: 'boominess', label: 'Boominess', group: 'Low', kind: 'broad', dir: 'cut',
      lo: 70, hi: 300, f0lo: 0.75, f0hi: 1.9,
      why: 'Excess energy right around the fundamental — the voice sounds boomy/tubby.' },
    { id: 'warmth', label: 'Warmth', group: 'Low-mid', kind: 'broad', dir: 'boost',
      lo: 110, hi: 260, f0lo: 0.9, f0hi: 2.0,
      why: 'The lower body of the voice — too little of it and the vocal sounds thin.' },
    { id: 'body', label: 'Body', group: 'Low-mid', kind: 'broad', dir: 'boost',
      lo: 150, hi: 600, f0lo: 1.5, f0hi: 3.5,
      why: 'The first harmonics that give the voice weight and size.' },

    // ── LOW MID ────────────────────────────────────────────────────────────
    { id: 'mud', label: 'Mud', group: 'Low-mid', kind: 'broad', dir: 'cut',
      lo: 160, hi: 420, f0lo: 1.15,
      why: 'Low-mid build-up that clouds the vocal and eats space from the mix.' },
    { id: 'boxiness', label: 'Boxiness', group: 'Low-mid', kind: 'broad', dir: 'cut',
      lo: 340, hi: 720,
      why: 'Small-room / cardboard character from a boxy recording space.' },
    { id: 'hollow', label: 'Hollow character', group: 'Low-mid', kind: 'broad', dir: 'boost',
      lo: 300, hi: 700,
      why: 'A scooped low-mid region leaves the vocal hollow and phasey.' },

    // ── MID ────────────────────────────────────────────────────────────────
    { id: 'nasal', label: 'Nasal', group: 'Mid', kind: 'peak', dir: 'cut',
      lo: 680, hi: 1350,
      why: 'Narrow concentration in the nasal region, separate from the normal harmonic series.' },
    { id: 'honk', label: 'Honk', group: 'Mid', kind: 'broad', dir: 'cut',
      lo: 800, hi: 1900,
      why: 'Broad mid push that makes the delivery honky and forward.' },
    { id: 'resonance', label: 'Resonance', group: 'Mid', kind: 'resonance', dir: 'cut',
      lo: 180, hi: 6000,
      why: 'A persistent narrow peak that is not part of the voice’s harmonic series — usually the room or the mic.' },

    // ── UPPER MID ──────────────────────────────────────────────────────────
    { id: 'clarity', label: 'Clarity', group: 'Upper-mid', kind: 'broad', dir: 'boost',
      lo: 1500, hi: 3000,
      why: 'Consonant articulation — the region that lets words cut through.' },
    { id: 'definition', label: 'Definition', group: 'Upper-mid', kind: 'broad', dir: 'boost',
      lo: 2500, hi: 4500,
      why: 'Edge and intelligibility of the delivery.' },
    { id: 'presence', label: 'Presence', group: 'Upper-mid', kind: 'broad', dir: 'boost',
      lo: 3200, hi: 6000,
      why: 'How close and in-front-of-the-speaker the voice feels.' },
    { id: 'harshness', label: 'Harshness', group: 'Upper-mid', kind: 'broad', dir: 'cut',
      lo: 2000, hi: 4000,
      why: 'Aggressive upper-mid energy that becomes fatiguing at mix level.' },
    { id: 'shrillness', label: 'Shrillness', group: 'Upper-mid', kind: 'broad', dir: 'cut',
      lo: 4000, hi: 6500,
      why: 'Thin, piercing energy above the presence region.' },

    // ── HIGH ───────────────────────────────────────────────────────────────
    { id: 'sibilance', label: 'Sibilance', group: 'High', kind: 'sibilance', dir: 'cut',
      lo: 4500, hi: 11000,
      why: 'Intermittent S/T/SH bursts measured only on the frames where they actually occur.' },
    { id: 'tizziness', label: 'Tizziness', group: 'High', kind: 'broad', dir: 'cut',
      lo: 8000, hi: 12500,
      why: 'Fizzy, grainy top end (often mic self-noise or a bright capsule).' },
    { id: 'brightness', label: 'Brightness', group: 'High', kind: 'broad', dir: 'boost',
      lo: 6000, hi: 10000,
      why: 'Overall high-frequency openness of the recording.' },
    { id: 'brilliance', label: 'Brilliance', group: 'High', kind: 'broad', dir: 'boost',
      lo: 10000, hi: 14000,
      why: 'Sheen above the sibilant region.' },
    { id: 'air', label: 'Air', group: 'High', kind: 'broad', dir: 'boost',
      lo: 12000, hi: 18000,
      why: 'Breath and space at the very top of the spectrum.' },
    { id: 'openness', label: 'Openness', group: 'High', kind: 'broad', dir: 'boost',
      lo: 8000, hi: 16000,
      why: 'How open and unrestricted the top octave feels.' }
  ];

  // ─── 1. Feature extraction ────────────────────────────────────────────────

  function buildBandGrid() {
    var bands = [];
    var n = Math.ceil(Math.log2(F_MAX / F_MIN) * BANDS_PER_OCTAVE);
    for (var i = 0; i <= n; i++) {
      var f = F_MIN * Math.pow(2, i / BANDS_PER_OCTAVE);
      if (f > F_MAX) break;
      bands.push({
        f: f,
        lo: f / Math.pow(2, 0.5 / BANDS_PER_OCTAVE),
        hi: f * Math.pow(2, 0.5 / BANDS_PER_OCTAVE)
      });
    }
    return bands;
  }

  function downmix(channels, maxSamples) {
    var nCh = channels.length;
    var n = channels[0].length;
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var c = 0; c < nCh; c++) s += channels[c][i];
      out[i] = s / nCh;
    }
    return out;
  }

  /**
   * extractFrames — STFT over frames spread across the WHOLE file (never a
   * single moment), Hann windowed, energy stored on a 1/12-octave grid.
   */
  function extractFrames(mono, sr, bands) {
    var fftSize = sr >= 88000 ? 8192 : 4096;
    if (mono.length < fftSize) fftSize = Math.pow(2, Math.max(8, Math.floor(Math.log2(mono.length))));
    var half = fftSize >> 1;
    var hop = Math.max(1, fftSize >> 1);
    var nBands = bands.length;

    var win = new Float32Array(fftSize);
    for (var i = 0; i < fftSize; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));

    var totalFrames = Math.max(1, Math.floor((mono.length - fftSize) / hop) + 1);
    var stride = Math.max(1, Math.ceil(totalFrames / MAX_FRAMES));

    // Map each FFT bin to a band index once.
    var binBand = new Int16Array(half);
    var binFreq = new Float32Array(half);
    for (var k = 0; k < half; k++) {
      var f = k * sr / fftSize;
      binFreq[k] = f;
      binBand[k] = (f < bands[0].lo || f > bands[nBands - 1].hi || k === 0)
        ? -1
        : clamp(Math.round(Math.log2(f / F_MIN) * BANDS_PER_OCTAVE), 0, nBands - 1);
    }

    var frames = [];
    var re = new Float64Array(fftSize);
    var im = new Float64Array(fftSize);
    var counts = new Float32Array(nBands);
    for (var b = 0; b < nBands; b++) counts[b] = 0;
    for (var k2 = 0; k2 < half; k2++) if (binBand[k2] >= 0) counts[binBand[k2]]++;

    for (var fi = 0; fi < totalFrames; fi += stride) {
      var start = fi * hop;
      if (start + fftSize > mono.length) break;

      var sum2 = 0;
      for (var j = 0; j < fftSize; j++) {
        var x = mono[start + j];
        sum2 += x * x;
        re[j] = x * win[j];
        im[j] = 0;
      }
      var rms = Math.sqrt(sum2 / fftSize);

      fftRadix2(re, im);

      var power = new Float32Array(half);
      for (var k3 = 1; k3 < half; k3++) {
        power[k3] = (re[k3] * re[k3] + im[k3] * im[k3]) / (fftSize * fftSize);
      }

      var bandPow = new Float32Array(nBands);
      for (var k4 = 1; k4 < half; k4++) {
        var bi = binBand[k4];
        if (bi >= 0) bandPow[bi] += power[k4];
      }
      // Bands narrower than one FFT bin get an interpolated density instead of 0.
      for (var b2 = 0; b2 < nBands; b2++) {
        if (counts[b2] === 0) {
          var kk = clamp(Math.round(bands[b2].f * fftSize / sr), 1, half - 1);
          bandPow[b2] = power[kk] * Math.max(0.25, (bands[b2].hi - bands[b2].lo) / (sr / fftSize));
        }
      }

      frames.push({
        t: start / sr,
        rms: rms,
        rmsDb: db(rms * rms),
        bandPow: bandPow,
        power: power
      });
    }

    return { frames: frames, fftSize: fftSize, half: half, binFreq: binFreq, nyquist: sr / 2 };
  }

  /** Active (voiced/played) frames only — silence must not skew the average. */
  function gateFrames(frames) {
    if (!frames.length) return [];
    var peak = -Infinity;
    for (var i = 0; i < frames.length; i++) peak = Math.max(peak, frames[i].rmsDb);
    var floor = percentile(frames.map(function (f) { return f.rmsDb; }), 0.1);
    // Never let the gate rise above the signal itself: on a heavily compressed
    // take the 10th-percentile "floor" sits just under the peak, and floor+8
    // would otherwise exclude the entire file.
    var gate = Math.min(Math.max(peak - GATE_BELOW_PEAK_DB, floor + 8, -80), peak - 6);
    var active = frames.filter(function (f) { return f.rmsDb >= gate; });
    if (active.length < Math.min(MIN_ACTIVE_FRAMES, frames.length)) {
      active = frames.slice().sort(function (a, b) { return b.rmsDb - a.rmsDb; })
        .slice(0, Math.min(frames.length, Math.max(MIN_ACTIVE_FRAMES, Math.ceil(frames.length * 0.5))));
    }
    return { active: active, gateDb: gate, peakDb: peak, floorDb: floor };
  }

  /** Harmonic-product-style f0 estimate per frame, from the frame's spectrum. */
  function estimateF0(frame, sr, fftSize, half) {
    var best = 0, bestScore = -Infinity, scores = [];
    var steps = 240;
    var loF = 60, hiF = 520;
    for (var s = 0; s < steps; s++) {
      var f0 = loF * Math.pow(hiF / loF, s / (steps - 1));
      var score = 0, used = 0;
      for (var h = 1; h <= 6; h++) {
        var f = f0 * h;
        if (f > Math.min(5000, sr / 2 - 50)) break;
        var k = f * fftSize / sr;
        var k0 = Math.floor(k);
        if (k0 < 1 || k0 + 1 >= half) break;
        // local max over ±1 bin so slight detuning doesn't kill the score
        var p = Math.max(frame.power[k0 - 1], frame.power[k0], frame.power[k0 + 1]);
        score += db(p) / h;
        used += 1 / h;
      }
      if (!used) continue;
      score /= used;
      scores.push(score);
      if (score > bestScore) { bestScore = score; best = f0; }
    }
    if (!scores.length) return { f0: null, strength: 0 };
    var med = median(scores);
    var spread = percentile(scores, 0.95) - med;
    return { f0: best, strength: spread > 0 ? clamp((bestScore - med) / Math.max(spread, 1), 0, 2) / 2 : 0 };
  }

  function analyzeVoice(active, sr, fftSize, half) {
    var f0s = [], strengths = [];
    var step = Math.max(1, Math.floor(active.length / 60));
    for (var i = 0; i < active.length; i += step) {
      var e = estimateF0(active[i], sr, fftSize, half);
      if (e.f0 && e.strength > 0.15) { f0s.push(e.f0); strengths.push(e.strength); }
    }
    var f0 = f0s.length >= 3 ? median(f0s) : null;
    var strength = strengths.length ? median(strengths) : 0;
    // Spread of f0 over time tells singing vs speech vs non-pitched material.
    var lowQ = f0s.length ? percentile(f0s, 0.1) : NaN;
    var hiQ = f0s.length ? percentile(f0s, 0.9) : NaN;
    var semitoneRange = (isNum(lowQ) && isNum(hiQ) && lowQ > 0) ? 12 * Math.log2(hiQ / lowQ) : 0;

    // Fundamental confidence: per-frame harmonic-match strength, how many
    // frames contributed, and how consistent those strengths were. A weak or
    // unstable match is reported honestly rather than as a precise F0.
    var strengthMed = strengths.length ? median(strengths) : 0;
    var strengthSpread = strengths.length > 2
      ? percentile(strengths, 0.9) - percentile(strengths, 0.1) : 1;
    var strengthStability = clamp(1 - strengthSpread, 0, 1);
    var f0Confidence = clamp(0.55 * strengthMed + 0.25 * clamp(f0s.length / 20, 0, 1) + 0.20 * strengthStability, 0, 0.97);

    var label = 'Unknown range';
    if (f0) {
      if (f0 < 110) label = 'Low male range';
      else if (f0 < 165) label = 'Male range';
      else if (f0 < 210) label = 'High male / low female range';
      else if (f0 < 300) label = 'Female range';
      else label = 'High female range';
    }

    return {
      f0: f0,
      f0Confidence: f0Confidence,
      f0Frames: f0s.length,
      f0Lo: isNum(lowQ) && lowQ > 0 ? lowQ : null,
      f0Hi: isNum(hiQ) && hiQ > 0 ? hiQ : null,
      semitoneRange: semitoneRange,
      delivery: !f0 ? 'unclear' : semitoneRange > 5 ? 'sung' : 'spoken / steady',
      label: label
    };
  }

  /** Aggregate spectrum + per-frame band statistics. */
  function aggregate(active, bands) {
    var nBands = bands.length;
    var meanPow = new Float64Array(nBands);
    for (var i = 0; i < active.length; i++) {
      var bp = active[i].bandPow;
      for (var b = 0; b < nBands; b++) meanPow[b] += bp[b];
    }
    for (var b2 = 0; b2 < nBands; b2++) meanPow[b2] /= Math.max(1, active.length);

    var specDb = new Float64Array(nBands);
    for (var b3 = 0; b3 < nBands; b3++) specDb[b3] = db(meanPow[b3]);

    // Broadband reference of the voice itself (100 Hz – 8 kHz energy).
    var refPow = 0, refN = 0;
    for (var b4 = 0; b4 < nBands; b4++) {
      if (bands[b4].f >= 100 && bands[b4].f <= 8000) { refPow += meanPow[b4]; refN++; }
    }
    var refDb = db(refPow / Math.max(1, refN));

    var rel = new Float64Array(nBands);
    for (var b5 = 0; b5 < nBands; b5++) rel[b5] = specDb[b5] - refDb;

    return { meanPow: meanPow, specDb: specDb, rel: rel, refDb: refDb };
  }

  /** Gaussian smoothing over the log-frequency grid (width in octaves). */
  function smoothOctaves(arr, octaves) {
    var n = arr.length;
    var sigma = Math.max(0.5, octaves * BANDS_PER_OCTAVE / 2.355);
    var radius = Math.ceil(sigma * 2.5);
    var kern = [];
    for (var i = -radius; i <= radius; i++) kern.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
    var out = new Float64Array(n);
    for (var b = 0; b < n; b++) {
      var s = 0, w = 0;
      for (var k = -radius; k <= radius; k++) {
        var idx = b + k;
        if (idx < 0 || idx >= n) continue;
        var kw = kern[k + radius];
        s += arr[idx] * kw; w += kw;
      }
      out[b] = s / Math.max(w, 1e-9);
    }
    return out;
  }

  /** Same Gaussian window, but applied to power before converting to dB —
   *  keeps individual resolved harmonics from spiking the reference curve. */
  function smoothPowerDb(meanPow, refDb, octaves) {
    var n = meanPow.length;
    var sigma = Math.max(0.5, octaves * BANDS_PER_OCTAVE / 2.355);
    var radius = Math.ceil(sigma * 2.5);
    var kern = [];
    for (var i = -radius; i <= radius; i++) kern.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
    var out = new Float64Array(n);
    for (var b = 0; b < n; b++) {
      var s = 0, w = 0;
      for (var k = -radius; k <= radius; k++) {
        var idx = clamp(b + k, 0, n - 1);   // replicate edges
        var kw = kern[k + radius];
        s += meanPow[idx] * kw; w += kw;
      }
      out[b] = db(s / Math.max(w, 1e-9)) - refDb;
    }
    return out;
  }

  /**
   * Harmonic-aware power smoothing.
   *
   * Below a few multiples of the fundamental, a fixed 1/2-octave window sits
   * *between* resolved harmonics, so the reading swings wildly with the note
   * being sung. Here the window widens wherever it would otherwise be
   * narrower than `harmonics` × f0, so every measurement integrates a
   * comparable number of harmonics no matter the pitch or the region. This is
   * what lets one engine serve low male and high female voices without
   * separate templates.
   */
  function smoothPowerAdaptive(bands, meanPow, refDb, refDb2, minOct, f0, harmonics) {
    var n = bands.length;
    var out = new Float64Array(n);
    for (var b = 0; b < n; b++) {
      var f = bands[b].f;
      var oct = minOct;
      // Widening only makes sense where there IS harmonic structure to average
      // over, i.e. at and above the fundamental. Below f0 the spectrum is
      // smooth already, and widening there would drag vocal energy down into
      // the sub region and fake a rumble reading.
      if (f0 > 0 && harmonics > 0 && f >= f0) {
        var need = harmonics * f0;
        var cap = minOct + 1.6;
        while (oct < cap && f * (Math.pow(2, oct) - Math.pow(2, -oct)) < need) oct += 0.05;
      }
      var radius = Math.max(1, Math.round(oct * BANDS_PER_OCTAVE));
      var sigma = Math.max(0.6, radius / 2);
      var sum = 0, w = 0;
      for (var k = -radius; k <= radius; k++) {
        var idx = clamp(b + k, 0, n - 1);
        var kw = Math.exp(-(k * k) / (2 * sigma * sigma));
        sum += meanPow[idx] * kw; w += kw;
      }
      out[b] = db(sum / Math.max(w, 1e-9)) - refDb;
    }
    return out;
  }

  /**
   * Running median of the dB spectrum over a log-frequency window.
   * A median ignores both the harmonic spikes and the inter-harmonic valleys,
   * so it tracks the vocal's own broad trend without being dragged by either.
   */
  function medianSmoothDb(rel, octaves) {
    var n = rel.length;
    var radius = Math.max(1, Math.round(octaves * BANDS_PER_OCTAVE / 2));
    var out = new Float64Array(n);
    for (var b = 0; b < n; b++) {
      var win = [];
      for (var k = -radius; k <= radius; k++) {
        win.push(rel[clamp(b + k, 0, n - 1)]);
      }
      out[b] = median(win);
    }
    return out;
  }

  /** Median level of the (relative dB) spectrum across a band index range. */
  function regionMedian(rel, i0, i1) {
    var win = [];
    for (var b = i0; b <= i1; b++) win.push(rel[b]);
    return median(win);
  }

  /**
   * Weighted log-linear tilt of THIS vocal — the adaptive reference used for
   * broad tonal-balance judgements. No stored "ideal vocal curve" exists.
   */
  function fitTilt(bands, smoothRel, loF, hiF) {
    var sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var b = 0; b < bands.length; b++) {
      var f = bands[b].f;
      if (f < loF || f > hiF) continue;
      var y = smoothRel[b];
      if (!isFinite(y)) continue;
      var x = Math.log2(f / 1000);
      sw += 1; sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    var denom = sw * sxx - sx * sx;
    if (sw < 4 || Math.abs(denom) < 1e-12) return { slope: 0, intercept: 0, at: function () { return 0; } };
    var slope = clamp((sw * sxy - sx * sy) / denom, -16, 3);
    var intercept = (sy - slope * sx) / sw;
    return {
      slope: slope,
      intercept: intercept,
      loF: loF,
      hiF: hiF,
      // outside the fitted span the line is held flat so extrapolation can’t
      // invent a huge expected level below f0 or above the file's bandwidth
      at: function (f) {
        var ff = clamp(f, loF, hiF);
        return intercept + slope * Math.log2(ff / 1000);
      }
    };
  }

  // ─── 2. Measurement helpers ───────────────────────────────────────────────

  function bandIndexRange(bands, lo, hi) {
    var i0 = -1, i1 = -1;
    for (var b = 0; b < bands.length; b++) {
      if (bands[b].f >= lo && i0 < 0) i0 = b;
      if (bands[b].f <= hi) i1 = b;
    }
    if (i0 < 0 || i1 < i0) return null;
    return [i0, i1];
  }

  /**
   * Per-band noise floor: the 10th-percentile level each band reaches across
   * the whole file, expressed like the rest of the analysis (dB relative to
   * the vocal's broadband reference). Used so "is there anything real here?"
   * is judged band by band instead of against a broadband RMS.
   */
  function bandNoiseFloor(allFrames, nBands, refDb) {
    var out = new Float64Array(nBands);
    var m = allFrames.length;
    if (!m) { for (var i = 0; i < nBands; i++) out[i] = -200; return out; }
    var col = new Float64Array(m);
    for (var b = 0; b < nBands; b++) {
      for (var f = 0; f < m; f++) col[f] = allFrames[f].bandPow[b];
      var sorted = Array.prototype.slice.call(col).sort(function (x, y) { return x - y; });
      var idx = clamp(Math.floor(m * 0.1), 0, m - 1);
      out[b] = db(sorted[idx]) - refDb;
    }
    return out;
  }

  /** Mean of the smoothed relative curve across a band index range. */
  function smoothRegion(smoothRel, i0, i1) {
    var s = 0, n = 0;
    for (var b = i0; b <= i1; b++) { s += smoothRel[b]; n++; }
    return s / Math.max(1, n);
  }

  /** Energy-average of relative dB across a band index range. */
  function regionLevel(meanPow, i0, i1, refDb) {
    var p = 0;
    for (var b = i0; b <= i1; b++) p += meanPow[b];
    return db(p / Math.max(1, i1 - i0 + 1)) - refDb;
  }

  /**
   * Absolute level of a band range in one frame (dB re the take's reference).
   * Burst detection (plosives, sibilance) must use this rather than a ratio —
   * during quiet frames a constant noise/hum looks "relatively" huge.
   */
  function frameBandLevelAbs(frame, i0, i1, refDb) {
    var p = 0;
    for (var b = i0; b <= i1; b++) p += frame.bandPow[b];
    return db(p / Math.max(1, i1 - i0 + 1)) - refDb;
  }

  /** Same measurement on a single frame (for temporal consistency). */
  function frameRegionLevel(frame, i0, i1, refI0, refI1) {
    var p = 0, r = 0;
    for (var b = i0; b <= i1; b++) p += frame.bandPow[b];
    for (var b2 = refI0; b2 <= refI1; b2++) r += frame.bandPow[b2];
    return db(p / Math.max(1, i1 - i0 + 1)) - db(r / Math.max(1, refI1 - refI0 + 1));
  }

  /**
   * Centre of gravity of the *deviation* inside a region, plus the measured
   * half-prominence range. This is what makes 286 Hz ≠ 412 Hz between files.
   */
  function deviationCentre(bands, dev, i0, i1, sign) {
    var peakVal = -Infinity, peakIdx = -1;
    for (var b = i0; b <= i1; b++) {
      var v = dev[b] * sign;
      if (v > peakVal) { peakVal = v; peakIdx = b; }
    }
    if (peakIdx < 0 || peakVal <= 0) return null;

    var half = peakVal * 0.5;
    var lo = peakIdx, hi = peakIdx;
    while (lo > i0 && dev[lo - 1] * sign >= half) lo--;
    while (hi < i1 && dev[hi + 1] * sign >= half) hi++;

    // energy-of-deviation weighted centroid over the half-prominence span
    var num = 0, den = 0;
    for (var b2 = lo; b2 <= hi; b2++) {
      var w = Math.max(0, dev[b2] * sign);
      num += w * Math.log2(bands[b2].f);
      den += w;
    }
    var centre = den > 0 ? Math.pow(2, num / den) : bands[peakIdx].f;

    return {
      centre: centre,
      peak: peakVal,
      lo: bands[lo].lo,
      hi: bands[hi].hi,
      loIdx: lo,
      hiIdx: hi,
      widthOct: Math.log2(bands[hi].hi / bands[lo].lo)
    };
  }

  /**
   * Temporal profile of a finding across the active frames. Returns how much
   * of the take agrees (frac), how the energy is concentrated in time
   * (burstiness), and how many separate phrase segments it spans (segments).
   * This is the raw material for the STATIC / DYNAMIC / PERSISTENT /
   * INTERMITTENT classification and part of the confidence score.
   */
  function profileFromSeries(excess, thresh) {
    var n = excess.length;
    if (!n) return { frac: 0, burstiness: 0, segments: 0, series: [] };
    var present = new Uint8Array(n);
    var agree = 0;
    for (var i = 0; i < n; i++) if (excess[i] >= thresh) { present[i] = 1; agree++; }
    var frac = agree / n;

    // temporal concentration: share of the total excess held by the busiest 15%
    var sorted = Array.prototype.slice.call(excess).sort(function (a, b) { return b - a; });
    var total = 0, top = 0, topN = Math.max(1, Math.ceil(n * 0.15));
    for (var j = 0; j < n; j++) { total += sorted[j]; if (j < topN) top += sorted[j]; }
    var share = total > 0 ? top / total : 0;
    var burstiness = clamp((share - 0.15) / 0.85, 0, 1);

    // persistence across phrases: contiguous agreeing runs (1-frame gap tolerated)
    var segments = 0, run = false, gap = 0;
    for (var k = 0; k < n; k++) {
      if (present[k]) { if (!run) { segments++; run = true; } gap = 0; }
      else if (run) { gap++; if (gap > 1) run = false; }
    }

    return { frac: frac, burstiness: burstiness, segments: segments, series: excess };
  }

  /** Per-frame behaviour of a region-based finding (band range vs reference). */
  function temporalProfile(active, i0, i1, refRange, expected, deviation) {
    var n = active.length;
    if (!n || !isNum(deviation) || Math.abs(deviation) < 1e-6) {
      return { frac: 0, burstiness: 0, segments: 0, series: [] };
    }
    var sign = deviation > 0 ? 1 : -1;
    var excess = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var v = frameRegionLevel(active[i], i0, i1, refRange[0], refRange[1]) - expected;
      excess[i] = Math.max(0, v * sign);
    }
    return profileFromSeries(excess, Math.abs(deviation) * 0.4);
  }

  /** Fraction of active frames that agree with the aggregate finding. */
  function temporalConsistency(active, i0, i1, refRange, expected, deviation) {
    return temporalProfile(active, i0, i1, refRange, expected, deviation).frac;
  }

  function severityOf(magnitude, confidence) {
    var s = magnitude * (0.6 + 0.4 * confidence);
    if (s >= 5.5) return 'Critical';
    if (s >= 3.4) return 'High';
    if (s >= 2.0) return 'Medium';
    return 'Low';
  }

  function roundHz(f) {
    if (!isNum(f)) return null;
    if (f >= 10000) return Math.round(f / 100) * 100;
    if (f >= 1000) return Math.round(f / 10) * 10;
    return Math.round(f);
  }

  // ─── 2b. Derived descriptors (width / behaviour / EQ shape / confidence) ──

  /** Width classification from the *measured* deviation width in octaves. */
  var WIDTH_CLASSES = [
    { id: 'very-narrow', label: 'Very narrow', max: 0.04 },
    { id: 'narrow', label: 'Narrow', max: 0.4 },
    { id: 'medium', label: 'Medium', max: 0.7 },
    { id: 'broad', label: 'Broad', max: 1.6 },
    { id: 'very-broad', label: 'Very broad', max: Infinity }
  ];
  function widthClassOf(widthOct) {
    if (!isNum(widthOct) || widthOct <= 0) return { id: 'unknown', label: '—' };
    for (var i = 0; i < WIDTH_CLASSES.length; i++) {
      if (widthOct < WIDTH_CLASSES[i].max) return WIDTH_CLASSES[i];
    }
    return WIDTH_CLASSES[WIDTH_CLASSES.length - 1];
  }

  var BEHAVIOR_META = {
    static: { label: 'Static', meaning: 'Present relatively consistently across active vocal sections.' },
    dynamic: { label: 'Dynamic', meaning: 'Appears strongly only during certain moments rather than continuously.' },
    persistent: { label: 'Persistent', meaning: 'A narrow feature that appears repeatedly across many vocal sections.' },
    intermittent: { label: 'Intermittent', meaning: 'Appears only occasionally in the recording.' }
  };

  /**
   * STATIC / DYNAMIC / PERSISTENT / INTERMITTENT — computed from the measured
   * frame-to-frame behaviour, never from the characteristic's name.
   */
  function classifyBehavior(profile, widthOct) {
    var frac = profile ? (profile.frac || 0) : 0;
    var burst = profile ? (profile.burstiness || 0) : 0;
    var segs = profile ? (profile.segments || 1) : 1;
    var narrow = isNum(widthOct) && widthOct < 0.4;

    if (burst >= 0.55 && (segs >= 2 || frac < 0.6)) return 'dynamic';
    if (frac < 0.25) return 'intermittent';
    if (narrow) return frac >= 0.6 ? 'persistent' : 'intermittent';
    return 'static';
  }

  var EQ_SHAPES = {
    'high-pass': 'High-pass',
    'low-pass': 'Low-pass',
    'bell-broad': 'Bell — Broad',
    'bell-medium': 'Bell — Medium',
    'bell-narrow': 'Bell — Narrow',
    'high-shelf': 'High Shelf',
    'low-shelf': 'Low Shelf',
    'dynamic-bell': 'Dynamic Bell / Dynamic EQ',
    'de-ess': 'Dynamic EQ / De-esser'
  };

  /** Suggested EQ move type, derived from measured width/location/behaviour. */
  function eqShapeFor(o) {
    var f = isNum(o.frequency) ? o.frequency : 0;
    var wc = o.widthClass || 'unknown';
    var isCut = o.dir === 'cut';
    var narrow = wc === 'very-narrow' || wc === 'narrow';
    var medium = wc === 'medium';

    if (o.id === 'sibilance') {
      return { shape: 'de-ess', reason: 'High-frequency bursts occur mainly during consonant events, so a dynamic high-frequency control (de-esser) is more musical than a static cut.' };
    }
    if (o.id === 'rumble' || (isCut && f > 0 && f < 95)) {
      return { shape: 'high-pass', reason: 'Low-frequency energy extends below the useful vocal range — a high-pass filter removes it without touching the voice.' };
    }
    if (o.id === 'plosive') {
      return { shape: 'dynamic-bell', reason: 'Low-frequency bursts only hit on P/B sounds, so a dynamic low band keeps the body intact between bursts.' };
    }
    if (!isCut && f >= 10000) {
      return { shape: 'high-shelf', reason: 'The upper octave is relatively subdued — a gentle high shelf lifts the whole top end evenly.' };
    }
    if (!isCut && f <= 140) {
      return { shape: 'low-shelf', reason: 'The low body is relatively subdued — a low shelf adds weight evenly.' };
    }
    if ((o.behavior === 'dynamic' || o.behavior === 'intermittent') && (narrow || medium)) {
      return { shape: 'dynamic-bell', reason: 'The problem comes and goes, so a static EQ move would dull the moments that are fine — a dynamic EQ only engages when the excess actually appears.' };
    }
    if (narrow) return { shape: 'bell-narrow', reason: 'A narrow, well-defined problem region — a narrow bell targets it precisely with minimal collateral change.' };
    if (medium) return { shape: 'bell-medium', reason: 'A moderate-width problem region — a medium bell matches its measured width.' };
    return { shape: 'bell-broad', reason: 'A broad problem region — a wide bell matches its measured width across the whole area.' };
  }

  /**
   * Evidence-weighted confidence (0–1). Every term is measurable from the
   * uploaded audio: deviation strength, frame consistency, recording quality,
   * amount of material, peak prominence, temporal stability and harmonic
   * separation. The result drives the recommendation tier, not just display.
   */
  function computeConfidence(o) {
    var mag = clamp(Math.abs(o.deviation) / 6, 0, 1);
    var cons = clamp(isNum(o.consistency) ? o.consistency : 0, 0, 1);
    var qual = clamp(isNum(o.quality) ? o.quality : 0, 0, 1);
    var frameFactor = clamp((o.frames || 0) / 60, 0.2, 1);
    var prominence = clamp(isNum(o.prominence) ? o.prominence : mag, 0, 1);
    var stability = clamp(isNum(o.stability) ? o.stability : 0.5, 0, 1);
    var harmonicSep = clamp(isNum(o.harmonicSeparation) ? o.harmonicSeparation : 0.5, 0, 1);
    var c = 0.10 + 0.20 * mag + 0.24 * cons + 0.14 * qual + 0.10 * frameFactor +
      0.10 * prominence + 0.08 * stability + 0.04 * harmonicSep;
    return clamp(c, 0, 0.98);
  }

  function confidenceTier(c) {
    if (c >= 0.90) return { id: 'very-strong', label: 'Very strong evidence' };
    if (c >= 0.75) return { id: 'strong', label: 'Strong evidence' };
    if (c >= 0.60) return { id: 'moderate', label: 'Moderate evidence' };
    if (c >= 0.50) return { id: 'weak', label: 'Weak evidence' };
    return { id: 'insufficient', label: 'Insufficient confidence' };
  }

  /** Descriptive "what you may hear" text — descriptive only, never EQ values. */
  var AUDIBLE = {
    rumble: { hears: 'Low rumble or room thud underneath the voice.' },
    plosive: { hears: 'Thumpy P/B pops hitting the microphone.' },
    boominess: { hears: 'Tubby, boomy low end.' },
    warmth: { hearsAfter: 'More body and warmth in the voice.' },
    body: { hearsAfter: 'More weight and size in the voice.' },
    mud: { hears: 'Cloudy, congested low-mids that eat space in the mix.' },
    boxiness: { hears: 'Cardboard, small-room character.' },
    hollow: { hearsAfter: 'A fuller, less scooped midrange.' },
    nasal: { hears: 'Pinched, honky nasal tone.' },
    honk: { hears: 'Forward, honky delivery.' },
    resonance: { hears: 'Roomy, ringing, tonal resonance.' },
    clarity: { hearsAfter: 'More articulation and word clarity.' },
    definition: { hearsAfter: 'More edge and intelligibility.' },
    presence: { hearsAfter: 'A closer, more in-front voice.' },
    harshness: { hears: 'Fatiguing, aggressive upper-mid edge.' },
    shrillness: { hears: 'Thin, piercing high-mids.' },
    sibilance: { hears: 'Sharp S / SH sounds.' },
    tizziness: { hears: 'Fizzy, grainy top end.' },
    brightness: { hearsAfter: 'More high-frequency openness.' },
    brilliance: { hearsAfter: 'More sheen above the sibilant range.' },
    air: { hearsAfter: 'More openness and breath.' },
    openness: { hearsAfter: 'A more open, unrestricted top octave.' }
  };

  // ─── 3. Characteristic detection ──────────────────────────────────────────

  function detectAll(ctx) {
    var bands = ctx.bands, rel = ctx.rel, meanPow = ctx.meanPow, refDb = ctx.refDb;
    var active = ctx.active, f0 = ctx.voice.f0 || 150;
    var results = [];

    var refRange = bandIndexRange(bands, 100, 8000) || [0, bands.length - 1];

    // deviation vs the vocal's own broad envelope (for peaks / narrow finds)
    var envelope = ctx.envelope;
    var devEnv = new Float64Array(bands.length);
    for (var b = 0; b < bands.length; b++) devEnv[b] = ctx.smoothRel[b] - envelope[b];

    // deviation vs the vocal's own fitted tilt (for broad tonal balance)
    var devTilt = new Float64Array(bands.length);
    for (var b2 = 0; b2 < bands.length; b2++) devTilt[b2] = ctx.narrowRel[b2] - ctx.broadTrend[b2];

    var hfCutoff = ctx.quality.hfCutoff;

    CHARACTERISTICS.forEach(function (ch) {
      var lo = ch.lo, hi = ch.hi;
      if (ch.f0lo) lo = Math.max(lo, f0 * ch.f0lo);
      if (ch.f0hi) hi = Math.min(hi, Math.max(f0 * ch.f0hi, lo * 1.25));
      if (hi <= lo * 1.05) { hi = lo * 1.25; }
      hi = Math.min(hi, ctx.nyquist * 0.92, F_MAX);
      if (hi <= lo) {
        results.push(notDetected(ch, 'Search region falls outside this file’s bandwidth.'));
        return;
      }

      var idx = bandIndexRange(bands, lo, hi);
      if (!idx) { results.push(notDetected(ch, 'No spectral data in this region.')); return; }

      var found;
      switch (ch.kind) {
        case 'sub': found = detectSub(ch, ctx, idx, lo, hi, refRange); break;
        case 'plosive': found = detectPlosive(ch, ctx, idx, lo, hi, refRange); break;
        case 'peak': found = detectPeak(ch, ctx, idx, devEnv, refRange); break;
        case 'resonance': found = detectResonance(ch, ctx, idx, devEnv, refRange); break;
        case 'sibilance': found = detectSibilance(ch, ctx, idx, refRange); break;
        default: found = detectBroad(ch, ctx, idx, devTilt, refRange, hfCutoff); break;
      }
      results.push(found);
    });

    return results;
  }

  function notDetected(ch, reason) {
    return { id: ch.id, characteristic: ch.label, group: ch.group, status: 'notDetected', reason: reason };
  }

  function balanced(ch, measured, extra) {
    var o = {
      id: ch.id, characteristic: ch.label, group: ch.group, status: 'unchanged',
      frequency: extra && extra.frequency != null ? extra.frequency : null,
      range: extra && extra.range ? extra.range : null,
      deviation: measured,
      note: 'Measured within ' + BALANCED_DB.toFixed(1) + ' dB of this vocal’s own spectral trend.'
    };
    return o;
  }

  /** Build a decrease/increase finding from a measured deviation. */
  function finding(ch, ctx, opts) {
    var dev = opts.deviation;
    var mag = Math.abs(dev);

    var profile = opts.profile || { frac: opts.consistency != null ? opts.consistency : 0.5, burstiness: 0, segments: 1 };
    var frac = opts.consistency != null ? clamp(opts.consistency, 0, 1) : (profile.frac || 0);
    var width = widthClassOf(opts.widthOct);
    var behavior = opts.behavior || classifyBehavior({ frac: frac, burstiness: profile.burstiness || 0, segments: profile.segments || 1 }, opts.widthOct);

    var conf = computeConfidence({
      deviation: dev,
      consistency: frac,
      quality: ctx.quality.factor,
      frames: ctx.active.length,
      prominence: opts.prominence,
      stability: opts.stability != null ? opts.stability : 1 - (profile.burstiness || 0),
      harmonicSeparation: opts.harmonicSeparation
    });
    var tier = confidenceTier(conf);

    if (mag < BALANCED_DB) {
      return balanced(ch, dev, { frequency: roundHz(opts.centre), range: opts.range });
    }
    if (conf < MIN_CONFIDENCE) {
      return {
        id: ch.id, characteristic: ch.label, group: ch.group, status: 'notDetected',
        reason: 'Insufficient confidence — the measured ' + fmtGain(dev) +
          ' deviation was not consistent enough across the recording. No EQ recommendation generated.',
        insufficient: true
      };
    }

    var isCut = ch.dir === 'cut';
    // Weak evidence (50–59%) → a possible issue only; no precise move is
    // invented, and the engineer is told to verify by ear first.
    var possible = conf < 0.60;
    var verifyByEar = conf < 0.75;

    var gain = null, gainRange = null;
    if (!possible) {
      // Recommended starting move: a partial correction of what was measured,
      // never the full deviation, and never below the audible-change floor.
      var k = isCut ? (opts.narrow ? 0.62 : 0.52) : 0.46;
      var maxMove = isCut ? 6.5 : 3.2;
      var gainMag = clamp(mag * k, 0.8, maxMove);
      gain = isCut ? -gainMag : gainMag;
      var tol = clamp(gainMag * 0.35, 0.4, 1.4);
      gainRange = [Math.round((gain - (isCut ? tol : -tol)) * 10) / 10, Math.round((gain + (isCut ? tol : -tol)) * 10) / 10];
      gain = Math.round(gain * 10) / 10;
    }

    var centre = roundHz(opts.centre);
    var shape = eqShapeFor({
      id: ch.id, dir: isCut ? 'cut' : 'boost', frequency: centre,
      widthClass: width.id, behavior: behavior
    });
    var bMeta = BEHAVIOR_META[behavior] || { label: behavior, meaning: '' };
    var audible = AUDIBLE[ch.id];
    var audibleEffect = audible
      ? (isCut ? (audible.hears || audible.hearsAfter) : (audible.hearsAfter || audible.hears))
      : null;

    return {
      id: ch.id,
      characteristic: ch.label,
      group: ch.group,
      status: isCut ? 'decrease' : 'increase',
      frequency: centre,
      range: opts.range ? [roundHz(opts.range[0]), roundHz(opts.range[1])] : null,
      measuredDeviation: Math.round(dev * 10) / 10,
      gain: gain,
      gainRange: gainRange,
      q: opts.q != null ? Math.round(opts.q * 10) / 10 : null,
      widthOctaves: opts.widthOct != null ? Math.round(opts.widthOct * 100) / 100 : null,
      widthClass: width.id,
      widthLabel: width.label,
      behavior: behavior,
      behaviorLabel: bMeta.label,
      behaviorMeaning: bMeta.meaning,
      eqShape: shape.shape,
      eqShapeLabel: EQ_SHAPES[shape.shape],
      eqReason: shape.reason,
      confidence: Math.round(conf * 100) / 100,
      confidenceTier: tier.id,
      confidenceLabel: tier.label,
      verifyByEar: verifyByEar,
      possible: possible,
      severity: isCut ? severityOf(mag, conf) : null,
      consistency: Math.round(clamp(frac, 0, 1) * 100) / 100,
      persistence: opts.persistence || (frac > 0.6 ? 'persistent' : frac > 0.25 ? 'intermittent' : 'transient'),
      explanation: opts.explanation || ch.why,
      audibleEffect: audibleEffect,
      score: mag * conf * (isCut ? 1.15 : 1)
    };
  }

  function qFromWidth(widthOct) {
    if (!isNum(widthOct) || widthOct <= 0) return null;
    var w = clamp(widthOct, 0.12, 3);
    return Math.sqrt(Math.pow(2, w)) / (Math.pow(2, w) - 1);
  }

  // Rumble — everything below the fundamental that the voice itself cannot
  // have produced. Voiced speech has essentially no energy below f0, and it
  // rolls off very steeply there, so the expected level at f < f0 is modelled
  // from THIS voice's own measured level at its fundamental. Anything sitting
  // above that model is non-vocal: stands, HVAC, traffic, handling noise.
  function detectSub(ch, ctx, idx, lo, hi, refRange) {
    var bands = ctx.bands, f0 = ctx.voice.f0;
    if (!f0 || ctx.voice.f0Confidence < 0.2) {
      // no reliable fundamental → fall back to the body region
      f0 = 150;
    }
    var ROLLOFF = 24;   // dB/octave — conservative for voiced speech
    // …but never expect a level that is already inaudible under the voice.
    // Every recording has some LF noise floor; it only matters once it comes
    // within ~30 dB of the fundamental, which is where it starts eating
    // headroom and muddying a mix.
    var AUDIBLE_FLOOR = 30;

    var f0Idx = bandIndexRange(bands, f0 * 0.85, f0 * 1.6);
    if (!f0Idx) return notDetected(ch, 'Could not locate the voice’s fundamental region.');
    var f0Level = smoothRegion(ctx.narrowRel, f0Idx[0], f0Idx[1]);

    // strongest excess anywhere below the fundamental
    var bestDev = -Infinity, bestIdx = -1;
    for (var b = idx[0]; b <= idx[1]; b++) {
      var f = bands[b].f;
      if (f >= f0 * 0.85) break;
      var expected = Math.max(f0Level - ROLLOFF * Math.log2(f0 / f), f0Level - AUDIBLE_FLOOR);
      var d = ctx.narrowRel[b] - expected;
      if (d > bestDev) { bestDev = d; bestIdx = b; }
    }
    if (bestIdx < 0) return notDetected(ch, 'No analysable band below the detected fundamental (' + fmtHz(f0) + ').');
    if (bestDev < BALANCED_DB) {
      return notDetected(ch, 'No significant rumble — energy below the fundamental (' + fmtHz(f0) +
        ') stays within this voice’s own low-frequency roll-off.');
    }

    // measured extent: bands that also exceed the model by at least half
    var lo2 = bestIdx, hi2 = bestIdx;
    function devAt(b) {
      var f = bands[b].f;
      return ctx.narrowRel[b] - Math.max(f0Level - ROLLOFF * Math.log2(f0 / f), f0Level - AUDIBLE_FLOOR);
    }
    while (lo2 > idx[0] && devAt(lo2 - 1) >= bestDev * 0.5) lo2--;
    while (hi2 < idx[1] && bands[hi2 + 1].f < f0 * 0.85 && devAt(hi2 + 1) >= bestDev * 0.5) hi2++;

    // energy-weighted centre of the offending band
    var num = 0, den = 0;
    for (var b2 = lo2; b2 <= hi2; b2++) {
      var w = ctx.meanPow[b2];
      num += w * Math.log2(bands[b2].f); den += w;
    }
    var centre = den > 0 ? Math.pow(2, num / den) : bands[bestIdx].f;

    // Is it stationary? Rumble does not follow the syllabic envelope.
    var subS = ctx.allFrames.map(function (fr) { return frameBandLevelAbs(fr, lo2, hi2, ctx.refDb); });
    var stationarity = clamp(1 - (percentile(subS, 0.9) - percentile(subS, 0.1)) / 24, 0, 1);

    return finding(ch, ctx, {
      deviation: bestDev,
      centre: centre,
      range: [bands[lo2].lo, bands[hi2].hi],
      widthOct: Math.log2(bands[hi2].hi / bands[lo2].lo),
      q: 0.8,
      consistency: Math.max(stationarity, 0.4),
      profile: { frac: 0.5 + 0.5 * stationarity, burstiness: 1 - stationarity, segments: 1 },
      stability: stationarity,
      persistence: stationarity > 0.6 ? 'persistent' : 'intermittent',
      explanation: 'Energy at ' + fmtHz(centre) + ' measures ' + fmtGain(bestDev) +
        ' above what this voice’s own roll-off below its fundamental (' + fmtHz(f0) +
        ') can account for, so it is not the voice. A high-pass filter around ' +
        fmtHz(Math.min(f0 * 0.8, bands[hi2].hi)) + ' is usually the cleanest fix.'
    });
  }

  // Plosives — intermittent LF bursts, measured only on the frames they hit.
  function detectPlosive(ch, ctx, idx, lo, hi, refRange) {
    var active = ctx.active, bands = ctx.bands;
    if (active.length < 8) return notDetected(ch, 'Recording too short to judge plosives.');
    var series = active.map(function (fr) { return frameBandLevelAbs(fr, idx[0], idx[1], ctx.refDb); });
    var med = median(series);
    var top = percentile(series, 0.98);
    var burst = top - med;
    var thr = med + Math.max(9, burst * 0.7);
    var hits = series.filter(function (v) { return v > thr; }).length;
    var frac = hits / series.length;

    // A plosive is a rare, large, short low-frequency event. Anything common
    // or small is ordinary programme material, not a plosive.
    if (burst < 12 || hits < 2) {
      return notDetected(ch, 'No plosive-style low-frequency bursts detected.');
    }
    if (frac > 0.12) {
      return notDetected(ch, 'Low-frequency energy here is continuous rather than plosive — see rumble/boominess.');
    }

    // Where did those bursts sit?
    var pow = new Float64Array(bands.length);
    var used = 0;
    for (var i = 0; i < active.length; i++) {
      if (series[i] <= thr) continue;
      used++;
      for (var b = idx[0]; b <= idx[1]; b++) pow[b] += active[i].bandPow[b];
    }
    var num = 0, den = 0;
    for (var b2 = idx[0]; b2 <= idx[1]; b2++) { num += pow[b2] * Math.log2(bands[b2].f); den += pow[b2]; }
    var centre = den > 0 ? Math.pow(2, num / den) : bands[idx[0]].f;

    var dev = clamp((burst - 12) * 0.5, 0, 8);
    if (dev < BALANCED_DB) return notDetected(ch, 'Low-frequency bursts are present but too small to act on.');

    // Burst profile for behaviour/confidence — plosives are concentrated in time.
    var pExcess = series.map(function (v) { return Math.max(0, v - med); });
    var pProfile = profileFromSeries(pExcess, Math.max(9, burst * 0.7));

    var f = finding(ch, ctx, {
      deviation: dev,
      centre: centre,
      range: [bands[idx[0]].lo, bands[idx[1]].hi],
      widthOct: Math.log2(bands[idx[1]].hi / bands[idx[0]].lo),
      q: 0.9,
      consistency: clamp(frac * 12, 0.2, 1),
      profile: pProfile,
      persistence: 'transient',
      explanation: Math.round(frac * 1000) / 10 + '% of the analysed frames show a low-frequency burst up to ' +
        fmtGain(burst) + ' above the typical low end, centred near ' + fmtHz(centre) + '. A high-pass or a short dip on those words is usually enough.'
    });
    return f;
  }

  // Narrow peak inside a region, measured against the vocal's own envelope,
  // ignoring peaks that are simply the voice's harmonics.
  function detectPeak(ch, ctx, idx, devEnv, refRange) {
    var bands = ctx.bands, f0 = ctx.voice.f0;
    var cand = deviationCentre(bands, devEnv, idx[0], idx[1], 1);
    if (!cand || cand.peak < 1.5) {
      return notDetected(ch, 'No concentrated ' + ch.label.toLowerCase() + ' peak stands out from this vocal’s own spectral envelope.');
    }
    if (isHarmonic(cand.centre, f0, ctx.voice.f0Confidence) && cand.widthOct < 0.25) {
      return notDetected(ch, 'The strongest peak here (' + fmtHz(cand.centre) + ') lines up with this voice’s harmonic series, so it is left alone.');
    }
    var i0 = cand.loIdx, i1 = cand.hiIdx;
    var expectedRel = 0;
    var measured = regionLevel(ctx.meanPow, i0, i1, ctx.refDb);
    var envRef = 0, n = 0;
    for (var b = i0; b <= i1; b++) { envRef += ctx.envelope[b]; n++; }
    envRef /= Math.max(1, n);
    var dev = measured - envRef;
    var profile = temporalProfile(ctx.active, i0, i1, refRange,
      envRef + (regionLevel(ctx.meanPow, refRange[0], refRange[1], ctx.refDb)), dev);

    return finding(ch, ctx, {
      deviation: dev,
      centre: cand.centre,
      range: [cand.lo, cand.hi],
      widthOct: cand.widthOct,
      q: qFromWidth(cand.widthOct),
      consistency: profile.frac,
      profile: profile,
      prominence: clamp((cand.peak - 1.5) / 8, 0, 1),
      narrow: true,
      explanation: 'A ' + (cand.widthOct < 0.4 ? 'narrow' : 'moderately wide') + ' concentration at ' + fmtHz(cand.centre) +
        ' measures ' + fmtGain(dev) + ' above the surrounding spectral envelope of this vocal.'
    });
  }

  function isHarmonic(f, f0, f0conf) {
    if (!f0 || !f0conf || f0conf < 0.35) return false;
    var r = f / f0;
    if (r < 0.8) return false;
    var nearest = Math.round(r);
    if (nearest < 1) return false;
    return Math.abs(r - nearest) / nearest < 0.045;
  }

  // The single most prominent persistent non-harmonic peak anywhere in range.
  function detectResonance(ch, ctx, idx, devEnv, refRange) {
    var bands = ctx.bands;
    var best = null;
    for (var b = idx[0] + 1; b < idx[1]; b++) {
      if (devEnv[b] <= devEnv[b - 1] || devEnv[b] < devEnv[b + 1]) continue;
      if (devEnv[b] < 2.0) continue;
      var span = deviationCentre(bands, devEnv, Math.max(idx[0], b - 8), Math.min(idx[1], b + 8), 1);
      if (!span || span.widthOct > 0.7) continue;
      if (isHarmonic(span.centre, ctx.voice.f0, ctx.voice.f0Confidence)) continue;
      // persistence: how often is this exact band above its own neighbourhood?
      var i0 = span.loIdx, i1 = span.hiIdx;
      var hits = 0;
      for (var i = 0; i < ctx.active.length; i++) {
        var loN = Math.max(0, i0 - 14), hiN = Math.min(bands.length - 1, i1 + 14);
        var v = frameRegionLevel(ctx.active[i], i0, i1, loN, hiN);
        if (v > 1.5) hits++;
      }
      var persist = hits / Math.max(1, ctx.active.length);
      var score = span.peak * (0.4 + 0.6 * persist);
      if (!best || score > best.score) {
        best = { span: span, persist: persist, score: score, peak: span.peak };
      }
    }
    if (!best) return notDetected(ch, 'No persistent non-harmonic resonance found between 180 Hz and 6 kHz.');
    if (best.persist < 0.35) {
      return notDetected(ch, 'The strongest non-harmonic peak (' + fmtHz(best.span.centre) + ') appears in only ' +
        Math.round(best.persist * 100) + '% of frames — treated as a passing note, not a resonance.');
    }

    var span = best.span;
    var envRef = 0, n = 0;
    for (var b2 = span.loIdx; b2 <= span.hiIdx; b2++) { envRef += ctx.envelope[b2]; n++; }
    envRef /= Math.max(1, n);
    var dev = regionLevel(ctx.meanPow, span.loIdx, span.hiIdx, ctx.refDb) - envRef;
    var rProfile = temporalProfile(ctx.active, span.loIdx, span.hiIdx, refRange,
      envRef + regionLevel(ctx.meanPow, refRange[0], refRange[1], ctx.refDb), dev);

    return finding(ch, ctx, {
      deviation: dev,
      centre: span.centre,
      range: [span.lo, span.hi],
      widthOct: span.widthOct,
      q: qFromWidth(span.widthOct),
      consistency: best.persist,
      profile: rProfile,
      prominence: clamp((best.peak - 2) / 10, 0, 1),
      harmonicSeparation: 0.65,
      narrow: true,
      persistence: best.persist > 0.7 ? 'persistent' : 'intermittent',
      explanation: 'A narrow peak at ' + fmtHz(span.centre) + ' sits ' + fmtGain(dev) +
        ' above the local envelope and is present in ' + Math.round(best.persist * 100) +
        '% of the analysed frames, and it is not a harmonic of the detected fundamental (' +
        (ctx.voice.f0 ? fmtHz(ctx.voice.f0) : 'unclear') + ').'
    });
  }

  // Sibilance — measured on the frames where the S sounds actually happen.
  function detectSibilance(ch, ctx, idx, refRange) {
    var active = ctx.active, bands = ctx.bands;
    if (active.length < 8) return notDetected(ch, 'Recording too short to judge sibilance.');
    if (ctx.quality.hfCutoff && ctx.quality.hfCutoff < 5000) {
      return notDetected(ch, 'File bandwidth ends near ' + fmtHz(ctx.quality.hfCutoff) + ' — nothing to measure up here.');
    }
    var series = active.map(function (fr) { return frameBandLevelAbs(fr, idx[0], idx[1], ctx.refDb); });
    var med = median(series);
    var top = percentile(series, 0.95);
    var burst = top - med;
    if (burst < 7) {
      return notDetected(ch, 'High-frequency energy is even across the take — no sibilant peaks stand out.');
    }

    var thresh = med + burst * 0.6;
    var pow = new Float64Array(bands.length);
    var refPow = 0, used = 0;
    for (var i = 0; i < active.length; i++) {
      if (series[i] < thresh) continue;
      used++;
      for (var b = idx[0]; b <= idx[1]; b++) pow[b] += active[i].bandPow[b];
      for (var b2 = refRange[0]; b2 <= refRange[1]; b2++) refPow += active[i].bandPow[b2];
    }
    if (used < 2) return notDetected(ch, 'No sibilant frames isolated.');
    var num = 0, den = 0, peakIdx = idx[0], peakV = -Infinity;
    for (var b3 = idx[0]; b3 <= idx[1]; b3++) {
      num += pow[b3] * Math.log2(bands[b3].f); den += pow[b3];
      if (pow[b3] > peakV) { peakV = pow[b3]; peakIdx = b3; }
    }
    var centre = den > 0 ? Math.pow(2, num / den) : bands[peakIdx].f;

    // How far above the rest of the vocal do those frames push the S band?
    var sibLevel = db(den / Math.max(1, idx[1] - idx[0] + 1) / used);
    var vocLevel = db(refPow / Math.max(1, refRange[1] - refRange[0] + 1) / used);
    var relSib = sibLevel - vocLevel;
    var tiltExpect = smoothRegion(ctx.broadTrend, idx[0], idx[1]);
    var dev = Math.min(relSib - tiltExpect, (burst - 6) * 0.8);
    var frac = used / active.length;

    if (dev < BALANCED_DB) {
      return dev < -4
        ? notDetected(ch, 'Sibilant frames measure below this vocal’s own spectral trend — de-essing would only dull it.')
        : balanced(ch, dev, { frequency: roundHz(centre), range: null });
    }

    var half = deviationCentre(bands, (function () {
      var d = new Float64Array(bands.length);
      for (var b4 = 0; b4 < bands.length; b4++) d[b4] = db(pow[b4] / Math.max(1, used)) - vocLevel - ctx.broadTrend[b4];
      return d;
    })(), idx[0], idx[1], 1);

    // Temporal profile: sibilance is intermittent by nature — verify from data.
    var sExcess = series.map(function (v) { return Math.max(0, v - med); });
    var sProfile = profileFromSeries(sExcess, burst * 0.6);

    return finding(ch, ctx, {
      deviation: dev,
      centre: centre,
      range: half ? [half.lo, half.hi] : [bands[idx[0]].lo, bands[idx[1]].hi],
      widthOct: half ? half.widthOct : null,
      q: half ? qFromWidth(half.widthOct) : 3,
      consistency: clamp(frac * 3.5, 0, 1),
      profile: sProfile,
      narrow: true,
      persistence: 'intermittent',
      explanation: 'Sibilant frames (' + Math.round(frac * 100) + '% of the take) peak at ' + fmtHz(centre) +
        ', measuring ' + fmtGain(dev) + ' above this vocal’s own high-frequency trend. A de-esser or a dynamic dip at that frequency is more musical than a static cut.'
    });
  }

  // Broad tonal-balance region vs the vocal's own fitted tilt.
  function detectBroad(ch, ctx, idx, devTilt, refRange, hfCutoff) {
    var bands = ctx.bands;
    var centreF = Math.sqrt(bands[idx[0]].f * bands[idx[1]].f);

    if (hfCutoff && bands[idx[0]].f > hfCutoff * 0.95) {
      return notDetected(ch, 'This file has no usable content above ' + fmtHz(hfCutoff) +
        (ch.dir === 'boost' ? ' — boosting here would only raise noise.' : '.'));
    }

    var measured = smoothRegion(ctx.narrowRel, idx[0], idx[1]);
    var noise = regionMedian(ctx.bandNoise, idx[0], idx[1]);
    if (measured < noise + 5) {
      return notDetected(ch, 'Energy in ' + fmtHz(bands[idx[0]].f) + '–' + fmtHz(bands[idx[1]].f) +
        ' is within 5 dB of this recording’s noise floor — nothing reliable to judge.');
    }

    // expected = this vocal's own broad spectral trend across the same region
    var exp = smoothRegion(ctx.broadTrend, idx[0], idx[1]);
    var dev = measured - exp;

    var wantSign = ch.dir === 'cut' ? 1 : -1;
    if (dev * wantSign < BALANCED_DB) {
      // measured, but not in the direction this characteristic describes
      if (Math.abs(dev) < BALANCED_DB) {
        return balanced(ch, dev, { frequency: roundHz(centreF), range: [roundHz(bands[idx[0]].lo), roundHz(bands[idx[1]].hi)] });
      }
      return notDetected(ch, ch.dir === 'cut'
        ? 'No excess here — this region measures ' + fmtGain(dev) + ' relative to the vocal’s own trend.'
        : 'This region already measures ' + fmtGain(dev) + ' relative to the vocal’s own trend, so a boost is not indicated.');
    }

    var span = deviationCentre(bands, devTilt, idx[0], idx[1], wantSign);
    var bI0 = span ? span.loIdx : idx[0];
    var bI1 = span ? span.hiIdx : idx[1];
    var bProfile = temporalProfile(ctx.active, bI0, bI1, refRange, exp, dev);

    var centre = span ? span.centre : centreF;
    var range = span ? [span.lo, span.hi] : [bands[idx[0]].lo, bands[idx[1]].hi];
    var widthOct = span ? span.widthOct : Math.log2(bands[idx[1]].hi / bands[idx[0]].lo);

    return finding(ch, ctx, {
      deviation: dev,
      centre: centre,
      range: range,
      widthOct: widthOct,
      q: qFromWidth(widthOct),
      consistency: bProfile.frac,
      profile: bProfile,
      explanation: (ch.dir === 'cut'
        ? 'This vocal measures ' + fmtGain(dev) + ' above its own spectral trend across ' + fmtHz(range[0]) + '–' + fmtHz(range[1]) + ', peaking near ' + fmtHz(centre) + '. '
        : 'This vocal measures ' + fmtGain(dev) + ' relative to its own spectral trend across ' + fmtHz(range[0]) + '–' + fmtHz(range[1]) + ', with the deepest point near ' + fmtHz(centre) + '. ') + ch.why
    });
  }

  // ─── 4. Recording quality / content classification ────────────────────────

  function analyzeQuality(ctx, mono, sr, channels) {
    var bands = ctx.bands, rel = ctx.rel, meanPow = ctx.meanPow;

    // noise floor: quietest 10% of frames, broadband
    var frames = ctx.allFrames;
    var quiet = frames.slice().sort(function (a, b) { return a.rmsDb - b.rmsDb; }).slice(0, Math.max(1, Math.floor(frames.length * 0.1)));
    var noiseDb = median(quiet.map(function (f) { return f.rmsDb; }));
    var peakDb = Math.max.apply(null, frames.map(function (f) { return f.rmsDb; }));
    var snr = peakDb - noiseDb;

    // digital clipping / near-clipping, measured on the actual samples of every
    // channel (a clipped channel can partially cancel in the mono downmix).
    var peakSample = 0, clipped = 0, nearClip = 0;
    var srcs = channels && channels.length ? channels : [mono];
    for (var s = 0; s < srcs.length; s++) {
      var sc = srcs[s];
      var cClipped = 0, cNear = 0;
      for (var i = 0; i < sc.length; i++) {
        var a = sc[i] < 0 ? -sc[i] : sc[i];
        if (a > peakSample) peakSample = a;
        if (a >= 0.999) cClipped++;
        else if (a >= 0.97) cNear++;
      }
      clipped = Math.max(clipped, cClipped);
      nearClip = Math.max(nearClip, cNear);
    }
    var peakDbFS = peakSample > 0 ? db(peakSample * peakSample) : -120;
    var clippedFlag = clipped / mono.length > 1e-4 || nearClip / mono.length > 0.002;

    // crest factor of the active frames (how much the take's level swings)
    var activeRms = ctx.active.map(function (f) { return f.rms; });
    var meanRms = activeRms.length
      ? activeRms.reduce(function (a2, b2) { return a2 + b2; }, 0) / activeRms.length : 0;
    var crestDb = (meanRms > 0 && isFinite(peakDb)) ? peakDb - db(meanRms * meanRms) : 0;

    var activeFraction = ctx.allFrames.length ? ctx.active.length / ctx.allFrames.length : 0;

    // bandwidth / codec cutoff: highest band still within 25 dB of the 2–6 kHz level
    var midIdx = bandIndexRange(bands, 2000, 6000);
    var midLevel = midIdx ? regionLevel(meanPow, midIdx[0], midIdx[1], ctx.refDb) : 0;
    var hfCutoff = null;
    for (var b = bands.length - 1; b >= 0; b--) {
      if (bands[b].f < 4000) break;
      if (ctx.smoothRel[b] > midLevel - 28) { hfCutoff = bands[b].hi; break; }
    }
    if (hfCutoff && hfCutoff > sr / 2 * 0.9) hfCutoff = null;

    // spectral flatness of the average spectrum (tonal vs dense/full mix)
    var logSum = 0, linSum = 0, cnt = 0;
    for (var b2 = 0; b2 < bands.length; b2++) {
      if (bands[b2].f < 60 || bands[b2].f > 12000) continue;
      logSum += Math.log(Math.max(meanPow[b2], 1e-20));
      linSum += meanPow[b2];
      cnt++;
    }
    var flatness = cnt ? Math.exp(logSum / cnt) / (linSum / cnt) : 0;

    // sustained sub-100 Hz energy (bass instruments / kick)
    var lowIdx = bandIndexRange(bands, 25, 80);
    var lowRel = lowIdx ? regionLevel(meanPow, lowIdx[0], lowIdx[1], ctx.refDb) : -60;

    // spectral centroid & rolloff
    var num = 0, den = 0;
    for (var b3 = 0; b3 < bands.length; b3++) { num += meanPow[b3] * bands[b3].f; den += meanPow[b3]; }
    var centroid = den > 0 ? num / den : 0;

    var noiseRelDb = noiseDb - ctx.refDb - 6;

    var quality = clamp((snr - 18) / 30, 0, 1) * 0.6 + clamp(ctx.active.length / 120, 0, 1) * 0.25 +
      clamp(ctx.voice.f0Confidence, 0, 1) * 0.15;

    return {
      snr: Math.round(snr * 10) / 10,
      noiseFloorDb: Math.round(noiseDb * 10) / 10,
      noiseRelDb: noiseRelDb,
      hfCutoff: hfCutoff,
      flatness: Math.round(flatness * 1000) / 1000,
      lowRel: Math.round(lowRel * 10) / 10,
      centroid: Math.round(centroid),
      factor: clamp(quality, 0, 1),
      peakDb: Math.round(peakDb * 10) / 10,
      peakDbFS: Math.round(peakDbFS * 10) / 10,
      clipped: clippedFlag,
      clippedSamples: clipped,
      nearClipFraction: Math.round(nearClip / mono.length * 1e6) / 1e6,
      crestDb: Math.round(crestDb * 10) / 10,
      veryLowSignal: peakDb < -30,
      activeFraction: Math.round(activeFraction * 100) / 100
    };
  }

  function contentWarnings(ctx) {
    var w = [];
    var q = ctx.quality, v = ctx.voice;

    if (q.clipped) {
      w.push({ level: 'warn', code: 'clipping', text: 'Possible clipping detected. Some frequency recommendations may be less reliable.' });
    }
    if (q.veryLowSignal) {
      w.push({ level: 'warn', code: 'low-signal', text: 'The vocal level is very low. Analysis confidence may be reduced.' });
    }
    if (q.snr < 24) {
      w.push({ level: 'warn', code: 'noise-floor', text: 'High noise floor detected (' + q.snr.toFixed(0) + ' dB SNR). High-frequency analysis may be less reliable.' });
    }
    if (q.lowRel > -6) {
      w.push({ level: 'warn', code: 'lf-noise', text: 'Strong low-frequency environmental energy detected. Possible sources: HVAC / traffic / handling noise / room vibration.' });
    }
    if (ctx.active.length < 10 || q.activeFraction < 0.25) {
      w.push({ level: 'warn', code: 'few-frames', text: 'Not enough consistent vocal material was detected. Some characteristics cannot be determined reliably.' });
    }

    var busy = 0;
    if (q.flatness > 0.16) busy++;
    if (q.lowRel > -4) busy++;
    if (v.f0Confidence < 0.35) busy++;
    if (q.centroid > 3500) busy++;
    if (busy >= 2) {
      w.push({
        level: 'warn', code: 'multi-source',
        text: 'This recording may contain additional sound sources. Practical EQ is optimized for isolated vocal recordings. Results may be less reliable.'
      });
    }

    if (ctx.channels > 1) {
      w.push({ level: 'info', code: 'stereo', text: 'Stereo recording detected. Analysis is based on the combined vocal signal.' });
    }
    if (q.hfCutoff && q.hfCutoff < 17000) {
      w.push({ level: 'info', code: 'hf-cutoff', text: 'Content stops around ' + fmtHz(q.hfCutoff) + ' (typical of lossy encoding). Air/brilliance findings above that point are suppressed.' });
    }
    if (!v.f0) {
      w.push({ level: 'info', code: 'no-f0', text: 'No stable vocal fundamental was found, so harmonic-aware checks fall back to spectral-envelope measurements only.' });
    }
    return w;
  }

  // ─── 5. Recommendation assembly ───────────────────────────────────────────

  function dedupe(list) {
    var out = [];
    list.forEach(function (item) {
      if (item.frequency == null) { out.push(item); return; }
      var clash = out.find(function (o) {
        return o.frequency != null && Math.abs(Math.log2(item.frequency / o.frequency)) < 0.28;
      });
      if (!clash) { out.push(item); return; }
      // keep the stronger finding, remember what it absorbed
      if (item.score > clash.score) {
        item.alsoMatched = (clash.alsoMatched || []).concat([clash.characteristic]);
        out[out.indexOf(clash)] = item;
      } else {
        clash.alsoMatched = (clash.alsoMatched || []).concat([item.characteristic]);
      }
    });
    return out;
  }

  function assemble(findings, ctx) {
    var decrease = findings.filter(function (f) { return f.status === 'decrease'; });
    var increase = findings.filter(function (f) { return f.status === 'increase'; });
    var unchanged = findings.filter(function (f) { return f.status === 'unchanged'; });
    var notDet = findings.filter(function (f) { return f.status === 'notDetected'; });

    decrease.sort(function (a, b) { return b.score - a.score; });
    increase.sort(function (a, b) { return b.score - a.score; });

    decrease = dedupe(decrease).slice(0, 6);
    increase = dedupe(increase).slice(0, 4);

    // anything dropped by dedupe/limits still belongs somewhere sensible
    var kept = {};
    decrease.concat(increase).forEach(function (f) { kept[f.id] = true; });
    findings.forEach(function (f) {
      if ((f.status === 'decrease' || f.status === 'increase') && !kept[f.id]) {
        notDet.push({
          id: f.id, characteristic: f.characteristic, group: f.group, status: 'notDetected',
          reason: 'Overlaps a stronger finding at ' + fmtHz(f.frequency) + ' — handled there.'
        });
      }
    });

    unchanged.sort(function (a, b) { return Math.abs(a.deviation || 0) - Math.abs(b.deviation || 0); });

    var priorities = decrease.concat(increase)
      .slice()
      .filter(function (f) { return !f.possible; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 5)
      .map(function (f, i) {
        return {
          rank: i + 1,
          id: f.id,
          characteristic: f.characteristic,
          frequency: f.frequency,
          gain: f.gain,
          direction: f.status,
          severity: f.severity,
          confidence: f.confidence
        };
      });

    return { decrease: decrease, increase: increase, unchanged: unchanged, notDetected: notDet, priorities: priorities };
  }

  // ─── 6. Public analysis entry points ──────────────────────────────────────

  /**
   * analyzeChannels(channels, sampleRate, opts) → structured analysis result.
   * Pure measurement; safe to run in Node for tests.
   */
  function analyzeChannels(channels, sampleRate, opts) {
    opts = opts || {};
    var report = opts.onStage || function () {};

    if (!channels || !channels.length || !channels[0].length) {
      throw new Error('This file contains no audio samples.');
    }
    var duration = channels[0].length / sampleRate;
    if (duration < 0.4) {
      throw new Error('Recording is too short to analyze — please use at least half a second of vocal.');
    }

    report(0.42, 'Extracting spectral frames…');
    var bands = buildBandGrid();
    var mono = downmix(channels);
    var stft = extractFrames(mono, sampleRate, bands);
    if (!stft.frames.length) throw new Error('Could not extract any analysis frames from this file.');

    var gated = gateFrames(stft.frames);
    var active = gated.active;
    if (!active.length) throw new Error('This file appears to be silent.');
    // Digital silence / near-silence must never yield a recommendation.
    if (!isFinite(gated.peakDb) || gated.peakDb < -75) {
      throw new Error('This file appears to be silent (peak level ' +
        (isFinite(gated.peakDb) ? gated.peakDb.toFixed(0) + ' dBFS' : 'none') +
        '). Please upload a vocal recording with audible signal.');
    }

    report(0.55, 'Estimating fundamental and harmonics…');
    var voice = analyzeVoice(active, sampleRate, stft.fftSize, stft.half);

    report(0.65, 'Averaging the spectrum across the whole take…');
    var agg = aggregate(active, bands);
    var smoothRel = smoothPowerDb(agg.meanPow, agg.refDb, 0.45);
    var envelope = smoothPowerDb(agg.meanPow, agg.refDb, 1.9);
    var f0h = voice.f0 && voice.f0Confidence > 0.25 ? voice.f0 : 0;
    var broadTrend = smoothPowerAdaptive(bands, agg.meanPow, agg.refDb, 0, 1.5, f0h, 12);
    var narrowRel = smoothPowerAdaptive(bands, agg.meanPow, agg.refDb, 0, 0.42, f0h, 4);
    (function calibrate() {
      var diffs = [];
      for (var b = 0; b < bands.length; b++) {
        var f = bands[b].f;
        if (f < Math.max(110, (voice.f0 || 150) * 0.9) || f > Math.min(14000, sampleRate / 2 * 0.8)) continue;
        diffs.push(narrowRel[b] - broadTrend[b]);
      }
      var bias = diffs.length ? median(diffs) : 0;
      for (var b2 = 0; b2 < bands.length; b2++) broadTrend[b2] += bias;
    })();
    var tiltCurve = smoothPowerDb(agg.meanPow, agg.refDb, 1.0);
    var tiltLo = Math.max(120, (voice.f0 || 150) * 1.1);
    var tiltHi = Math.min(11000, sampleRate / 2 * 0.8);
    var tilt = fitTilt(bands, tiltCurve, tiltLo, Math.max(tiltHi, tiltLo * 4));

    var ctx = {
      bands: bands, rel: agg.rel, smoothRel: smoothRel, meanPow: agg.meanPow, refDb: agg.refDb, specDb: agg.specDb,
      envelope: envelope, broadTrend: broadTrend, narrowRel: narrowRel, tilt: tilt, active: active, allFrames: stft.frames,
      voice: voice, nyquist: sampleRate / 2, sampleRate: sampleRate, duration: duration, channels: channels.length
    };
    ctx.bandNoise = bandNoiseFloor(stft.frames, bands.length, agg.refDb);
    ctx.quality = analyzeQuality(ctx, mono, sampleRate, channels);

    report(0.78, 'Detecting resonance, mud, sibilance and presence…');
    var findings = detectAll(ctx);

    report(0.9, 'Ranking recommendations…');
    var grouped = assemble(findings, ctx);

    // Spectrum for the graph — the SAME measured data the findings came from.
    var spectrum = [];
    for (var b = 0; b < bands.length; b++) {
      spectrum.push({ f: Math.round(bands[b].f * 10) / 10, db: Math.round(agg.rel[b] * 100) / 100 });
    }
    var envCurve = [];
    for (var b2 = 0; b2 < bands.length; b2++) {
      envCurve.push({ f: Math.round(bands[b2].f * 10) / 10, db: Math.round(broadTrend[b2] * 100) / 100 });
    }

    return {
      decrease: grouped.decrease,
      increase: grouped.increase,
      unchanged: grouped.unchanged,
      notDetected: grouped.notDetected,
      priorities: grouped.priorities,
      spectrum: spectrum,
      trend: envCurve,
      voice: {
        fundamental: voice.f0 ? Math.round(voice.f0 * 10) / 10 : null,
        confidence: Math.round(voice.f0Confidence * 100) / 100,
        label: voice.label,
        delivery: voice.delivery,
        pitchRangeSemitones: Math.round(voice.semitoneRange * 10) / 10,
        range: (voice.f0 && voice.f0Lo && voice.f0Hi)
          ? [Math.round(voice.f0Lo), Math.round(voice.f0Hi)] : null,
        ambiguous: !voice.f0 || voice.f0Confidence < 0.6
      },
      quality: ctx.quality,
      warnings: contentWarnings(ctx),
      analysis: {
        frames: stft.frames.length,
        activeFrames: active.length,
        fftSize: stft.fftSize,
        bandsPerOctave: BANDS_PER_OCTAVE,
        tiltDbPerOctave: Math.round(tilt.slope * 100) / 100,
        gateDb: Math.round(gated.gateDb * 10) / 10,
        duration: duration,
        sampleRate: sampleRate,
        channels: channels.length,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  // ─── Browser file loader ──────────────────────────────────────────────────

  function getAudioContext() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) throw new Error('Web Audio API is not available in this browser.');
    return new AC();
  }

  function parseWavHeader(buffer) {
    try {
      var view = new DataView(buffer);
      if (view.byteLength < 44) return null;
      function tag(o) {
        return String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
      }
      if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
      var offset = 12, out = null;
      while (offset + 8 <= view.byteLength) {
        var id = tag(offset);
        var size = view.getUint32(offset + 4, true);
        if (id === 'fmt ') {
          out = {
            formatTag: view.getUint16(offset + 8, true),
            channels: view.getUint16(offset + 10, true),
            sampleRate: view.getUint32(offset + 12, true),
            bitsPerSample: view.getUint16(offset + 22, true)
          };
        }
        offset += 8 + size + (size % 2);
        if (id === 'data') break;
      }
      return out;
    } catch (e) { return null; }
  }

  function parseAiffHeader(buffer) {
    try {
      var view = new DataView(buffer);
      function tag(o) {
        return String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
      }
      if (tag(0) !== 'FORM') return null;
      var type = tag(8);
      if (type !== 'AIFF' && type !== 'AIFC') return null;
      var offset = 12;
      while (offset + 8 <= view.byteLength) {
        var id = tag(offset);
        var size = view.getUint32(offset + 4, false);
        if (id === 'COMM') {
          var channels = view.getUint16(offset + 8, false);
          var bits = view.getUint16(offset + 14, false);
          // 80-bit IEEE extended sample rate
          var expo = view.getUint16(offset + 16, false);
          var hiMant = view.getUint32(offset + 18, false);
          var loMant = view.getUint32(offset + 22, false);
          var e = expo - 16383;
          var sr = (hiMant * Math.pow(2, e - 31)) + (loMant * Math.pow(2, e - 63));
          return { channels: channels, bitsPerSample: bits, sampleRate: Math.round(sr) };
        }
        offset += 8 + size + (size % 2);
      }
      return null;
    } catch (e) { return null; }
  }

  function detectContainer(file, buffer) {
    var name = (file && file.name) || 'audio';
    var ext = (name.split('.').pop() || '').toLowerCase();
    var u8 = new Uint8Array(buffer.slice(0, 16));
    var info = { format: ext.toUpperCase() || 'UNKNOWN', bitDepth: null, containerSampleRate: null, containerChannels: null, lossy: false };

    if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {
      var w = parseWavHeader(buffer);
      info.format = 'WAV';
      if (w) {
        info.bitDepth = w.bitsPerSample;
        info.containerSampleRate = w.sampleRate;
        info.containerChannels = w.channels;
        if (w.formatTag === 3) info.format = 'WAV (32-bit float)';
      }
    } else if (u8[0] === 0x46 && u8[1] === 0x4F && u8[2] === 0x52 && u8[3] === 0x4D) {
      var a = parseAiffHeader(buffer);
      info.format = 'AIFF';
      if (a) { info.bitDepth = a.bitsPerSample; info.containerSampleRate = a.sampleRate; info.containerChannels = a.channels; }
    } else if (u8[0] === 0x66 && u8[1] === 0x4C && u8[2] === 0x61 && u8[3] === 0x43) {
      info.format = 'FLAC';
    } else if ((u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) || (u8[0] === 0xFF && (u8[1] & 0xE0) === 0xE0)) {
      info.format = 'MP3'; info.lossy = true;
    } else if (u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) {
      info.format = 'M4A / AAC'; info.lossy = true;
    } else if (u8[0] === 0x4F && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) {
      info.format = 'OGG'; info.lossy = true;
    }
    if (/mp3|m4a|aac|ogg|opus|wma/.test(ext)) info.lossy = true;
    return info;
  }

  function idle(ms) {
    return new Promise(function (res) { setTimeout(res, ms || 0); });
  }

  /**
   * analyzeFile(file, { onProgress }) → Promise<{ source, result }>
   * The file is decoded and measured locally; it is never uploaded anywhere
   * and never modified.
   */
  function analyzeFile(file, options) {
    options = options || {};
    var onProgress = options.onProgress || function () {};

    return Promise.resolve().then(function () {
      if (!file) throw new Error('No file selected.');
      if (file.size === 0) throw new Error('This file is empty.');
      if (file.size > 400 * 1024 * 1024) throw new Error('This file is very large (over 400 MB). Please bounce a shorter section of the vocal.');
      onProgress(0.05, 'Reading file…');
      return file.arrayBuffer();
    }).then(function (buffer) {
      onProgress(0.12, 'Reading audio format…');
      var container = detectContainer(file, buffer);
      onProgress(0.18, 'Decoding audio…');
      var ctx = getAudioContext();
      var copy = buffer.slice(0);
      return new Promise(function (resolve, reject) {
        var done = false;
        var p = ctx.decodeAudioData(copy,
          function (ab) { if (!done) { done = true; resolve(ab); } },
          function () { if (!done) { done = true; reject(new Error('decode')); } });
        if (p && typeof p.then === 'function') {
          p.then(function (ab) { if (!done) { done = true; resolve(ab); } },
                 function () { if (!done) { done = true; reject(new Error('decode')); } });
        }
      }).then(function (audioBuffer) {
        try { ctx.close(); } catch (e) {}
        return { audioBuffer: audioBuffer, container: container };
      }, function () {
        try { ctx.close(); } catch (e) {}
        throw new Error('Unable to analyze this file. Please try a WAV, MP3, AIFF, M4A or FLAC file that your browser can decode.');
      });
    }).then(function (bundle) {
      var ab = bundle.audioBuffer;
      var channels = [];
      for (var c = 0; c < ab.numberOfChannels; c++) channels.push(ab.getChannelData(c));

      var source = {
        fileName: (file && file.name) || 'audio',
        fileSize: file ? file.size : null,
        format: bundle.container.format,
        lossy: bundle.container.lossy,
        bitDepth: bundle.container.bitDepth,
        duration: ab.duration,
        sampleRate: ab.sampleRate,
        containerSampleRate: bundle.container.containerSampleRate,
        channels: ab.numberOfChannels,
        channelLabel: ab.numberOfChannels === 1 ? 'Mono' : ab.numberOfChannels === 2 ? 'Stereo' : ab.numberOfChannels + ' channels'
      };

      if (ab.duration < 0.4) throw new Error('This recording is too short to analyze (' + ab.duration.toFixed(2) + ' s). Please use at least half a second of vocal.');

      onProgress(0.3, 'Analyzing waveform…');
      // Long files: analyse the loudest contiguous 180 s so huge WAVs stay snappy.
      var maxSec = 180;
      if (ab.duration > maxSec) {
        var n = Math.floor(maxSec * ab.sampleRate);
        var offset = Math.floor((ab.length - n) / 2);
        channels = channels.map(function (ch) { return ch.subarray(offset, offset + n); });
        source.analyzedSeconds = maxSec;
      }

      return idle(30).then(function () {
        var stages = [
          [0.42, 'Detecting resonance…'],
          [0.58, 'Analyzing low-mid balance…'],
          [0.72, 'Analyzing sibilance…'],
          [0.86, 'Analyzing presence…'],
          [0.95, 'Finalizing recommendations…']
        ];
        var si = 0;
        var result = analyzeChannels(channels, ab.sampleRate, {
          onStage: function (p, msg) {
            var s = stages[Math.min(si++, stages.length - 1)];
            onProgress(s[0], s[1] || msg);
          }
        });
        onProgress(1, 'Done');
        return { source: source, result: result };
      });
    });
  }

  var API = {
    CHARACTERISTICS: CHARACTERISTICS,
    analyzeChannels: analyzeChannels,
    analyzeFile: analyzeFile,
    fmtHz: fmtHz,
    fmtGain: fmtGain,
    severityOf: severityOf,
    _internals: {
      fftRadix2: fftRadix2,
      buildBandGrid: buildBandGrid,
      smoothOctaves: smoothOctaves,
      fitTilt: fitTilt,
      deviationCentre: deviationCentre,
      isHarmonic: isHarmonic,
      detectContainer: detectContainer,
      widthClassOf: widthClassOf,
      classifyBehavior: classifyBehavior,
      eqShapeFor: eqShapeFor,
      computeConfidence: computeConfidence,
      confidenceTier: confidenceTier,
      temporalProfile: temporalProfile
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.PRACTICAL_EQ = API;

})(typeof window !== 'undefined' ? window : globalThis);
