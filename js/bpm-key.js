/**
 * bpm-key.js — Key & BPM Detection Engine, Tap Tempo, and Carnatic/Western Metronome.
 *
 * Exposes window.BPM_KEY
 */
'use strict';

(function (root) {
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Krumhansl-Schmuckler Key Profiles (Major & Minor pitch weightings)
  var MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  // ─── Carnatic & Western Metronome Patterns ────────────────────────────────
  var TALA_PATTERNS = {
    '4/4': { name: '4/4 Common Time', beats: 4, accents: [1.5, 0.8, 1.1, 0.8], subBeats: 1 },
    '3/4': { name: '3/4 Waltz / Tisra', beats: 3, accents: [1.5, 0.8, 0.8], subBeats: 1 },
    '2/4': { name: '2/4 March', beats: 2, accents: [1.5, 0.8], subBeats: 1 },
    '6/8': { name: '6/8 Compound', beats: 6, accents: [1.5, 0.7, 0.7, 1.2, 0.7, 0.7], subBeats: 1 },
    '7/8': { name: '7/8 Odd Meter', beats: 7, accents: [1.5, 0.7, 0.7, 1.2, 0.7, 1.2, 0.7], subBeats: 1 },
    'adi': {
      name: 'ಆದಿ ತಾಳ (Adi Tala — 8 beats: 4 + 2 + 2)',
      beats: 8,
      accents: [1.8, 0.8, 0.8, 0.8, 1.3, 0.8, 1.3, 0.8],
      structure: 'Laghu 4 + Dhrutam 2 + Dhrutam 2'
    },
    'rupaka': {
      name: 'ರೂಪಕ ತಾಳ (Rupaka Tala — 6 beats / 3 counts)',
      beats: 6,
      accents: [1.6, 0.8, 1.2, 0.8, 1.2, 0.8],
      structure: 'Dhrutam 2 + Laghu 4'
    },
    'misra_chapu': {
      name: 'ಮಿಶ್ರ ಚಾಪು (Misra Chapu — 7 counts: 3 + 2 + 2)',
      beats: 7,
      accents: [1.8, 0.7, 0.7, 1.4, 0.7, 1.4, 0.7],
      structure: 'Ta-Ki-Ta (3) + Ta-Ka (2) + Ta-Ka (2)'
    },
    'khanda_chapu': {
      name: 'ಖಂಡ ಚಾಪು (Khanda Chapu — 5 counts: 2 + 3)',
      beats: 5,
      accents: [1.6, 0.8, 1.8, 0.8, 0.8],
      structure: 'Ta-Ka (2) + Ta-Ki-Ta (3)'
    },
    'tisra_eka': {
      name: 'ತಿಸ್ರ ಏಕ ತಾಳ (Tisra Eka — 3 counts)',
      beats: 3,
      accents: [1.7, 0.8, 0.8],
      structure: 'Laghu 3 (Ta-Ki-Ta)'
    }
  };

  // ─── Tap Tempo Tracker ───────────────────────────────────────────────────
  function createTapTempo() {
    var taps = [];
    var maxTaps = 8;
    var timeoutMs = 2500;

    function tap() {
      var now = Date.now();
      if (taps.length && (now - taps[taps.length - 1] > timeoutMs)) {
        taps = [];
      }
      taps.push(now);
      if (taps.length > maxTaps) taps.shift();

      if (taps.length < 2) {
        return { bpm: null, tapsCount: taps.length, tempoName: 'Tap again…' };
      }

      var intervals = [];
      for (var i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      var avgMs = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
      var bpm = Math.round(60000 / avgMs);

      return {
        bpm: bpm,
        ms: Math.round(avgMs),
        tapsCount: taps.length,
        tempoName: getTempoName(bpm)
      };
    }

    function reset() {
      taps = [];
    }

    return { tap: tap, reset: reset };
  }

  function getTempoName(bpm) {
    if (bpm < 60) return 'Largo / ವಿಲಂಬ ಕಾಲ (Slow)';
    if (bpm < 80) return 'Adagio / ಮಂದಗತಿ';
    if (bpm < 108) return 'Andante / ಮಧ್ಯಮ ಕಾಲ (Mid)';
    if (bpm < 132) return 'Moderato / ಆನಂದ ಲಯ';
    if (bpm < 168) return 'Allegro / ದ್ರುತ ಕಾಲ (Fast)';
    return 'Presto / ಅತಿದ್ರುತ ಕಾಲ (Very Fast)';
  }

  // ─── Web Audio Metronome ─────────────────────────────────────────────────
  var Metronome = (function () {
    var audioCtx = null;
    var isRunning = false;
    var bpm = 96;
    var patternKey = '4/4';
    var nextNoteTime = 0.0;
    var currentBeat = 0;
    var timerId = null;
    var onBeatCallback = null;

    function getContext() {
      if (!audioCtx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
      }
      return audioCtx;
    }

    function playClick(time, isAccent, accentLevel) {
      var ctx = getContext();
      if (!ctx) return;

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      // High crisp woodblock / click frequency for accent, lower for regular
      var freq = isAccent ? 1400 : 900;
      var dur = 0.045;
      var vol = (accentLevel || 1.0) * 0.35;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + dur + 0.01);
    }

    function schedule() {
      var ctx = getContext();
      if (!ctx) return;
      var pattern = TALA_PATTERNS[patternKey] || TALA_PATTERNS['4/4'];
      var totalBeats = pattern.beats;

      while (nextNoteTime < ctx.currentTime + 0.1) {
        var beatIdx = currentBeat % totalBeats;
        var accentLevel = pattern.accents ? pattern.accents[beatIdx] : (beatIdx === 0 ? 1.5 : 0.8);
        var isAccent = beatIdx === 0 || accentLevel > 1.2;

        playClick(nextNoteTime, isAccent, accentLevel);

        if (onBeatCallback) {
          (function (b, t) {
            var delayMs = Math.max(0, (t - ctx.currentTime) * 1000);
            setTimeout(function () {
              if (isRunning && onBeatCallback) onBeatCallback(b, totalBeats, isAccent);
            }, delayMs);
          })(beatIdx, nextNoteTime);
        }

        var secondsPerBeat = 60.0 / bpm;
        nextNoteTime += secondsPerBeat;
        currentBeat++;
      }
      timerId = setTimeout(schedule, 25);
    }

    function start(opts) {
      opts = opts || {};
      if (opts.bpm) bpm = opts.bpm;
      if (opts.pattern) patternKey = opts.pattern;
      if (opts.onBeat) onBeatCallback = opts.onBeat;

      var ctx = getContext();
      if (!ctx) return;

      if (isRunning) stop();
      isRunning = true;
      currentBeat = 0;
      nextNoteTime = ctx.currentTime + 0.05;
      schedule();
    }

    function stop() {
      isRunning = false;
      if (timerId) { clearTimeout(timerId); timerId = null; }
    }

    function toggle(opts) {
      if (isRunning) { stop(); return false; }
      else { start(opts); return true; }
    }

    function setBpm(b) { bpm = b; }
    function setPattern(p) { patternKey = p; currentBeat = 0; }
    function getStatus() {
      return { isRunning: isRunning, bpm: bpm, patternKey: patternKey };
    }

    return {
      start: start,
      stop: stop,
      toggle: toggle,
      setBpm: setBpm,
      setPattern: setPattern,
      getStatus: getStatus
    };
  })();

  // ─── Audio File BPM & Pitch/Key Detection Engine ─────────────────────────
  /**
   * analyzeAudioBuffer(audioBuffer) -> { bpm, key, scale, confidence, ragas }
   */
  function analyzeKeyAndBpm(audioBuffer) {
    var sr = audioBuffer.sampleRate;
    var nCh = audioBuffer.numberOfChannels;
    var duration = audioBuffer.duration;
    var n = audioBuffer.length;

    // Mono mixdown
    var mono = new Float32Array(n);
    for (var c = 0; c < nCh; c++) {
      var ch = audioBuffer.getChannelData(c);
      for (var i = 0; i < n; i++) mono[i] += ch[i] / nCh;
    }

    // 1. BPM Detection via Energy Envelope Autocorrelation
    var bpmResult = detectBpm(mono, sr);

    // 2. Key Detection via 12-Semitone Chromagram & Krumhansl-Schmuckler
    var keyResult = detectKey(mono, sr);

    return {
      bpm: bpmResult.bpm,
      bpmConfidence: bpmResult.confidence,
      key: keyResult.key,
      mode: keyResult.mode,
      keyName: keyResult.keyName,
      chroma: keyResult.chroma,
      matchingRagas: keyResult.matchingRagas,
      duration: duration
    };
  }

  function detectBpm(samples, sr) {
    // Downsample to ~2205 Hz for fast tempo envelope calculation
    var hop = Math.max(1, Math.floor(sr / 2205));
    var downsampledLen = Math.floor(samples.length / hop);
    var env = new Float32Array(downsampledLen);

    for (var i = 0; i < downsampledLen; i++) {
      var s = 0;
      var start = i * hop;
      for (var j = 0; j < hop && start + j < samples.length; j++) {
        var v = Math.abs(samples[start + j]);
        if (v > s) s = v;
      }
      env[i] = s;
    }

    // First order difference (onset flux)
    var diff = new Float32Array(downsampledLen);
    for (var k = 1; k < downsampledLen; k++) {
      var d = env[k] - env[k - 1];
      diff[k] = d > 0 ? d : 0;
    }

    var dsSr = sr / hop;
    // Autocorrelation over lag range 60–180 BPM
    var minLag = Math.floor((60 / 190) * dsSr);
    var maxLag = Math.ceil((60 / 60) * dsSr);

    var maxCorr = 0;
    var bestLag = Math.floor((60 / 120) * dsSr);
    var step = 2;

    for (var lag = minLag; lag <= maxLag; lag += step) {
      var sum = 0;
      var limit = Math.min(downsampledLen - lag, 4000);
      for (var p = 0; p < limit; p++) {
        sum += diff[p] * diff[p + lag];
      }
      if (sum > maxCorr) {
        maxCorr = sum;
        bestLag = lag;
      }
    }

    var detectedBpm = Math.round((60 * dsSr) / bestLag);
    if (detectedBpm < 65) detectedBpm *= 2;
    if (detectedBpm > 175) detectedBpm = Math.round(detectedBpm / 2);

    return {
      bpm: detectedBpm,
      confidence: maxCorr > 0 ? 0.85 : 0.4
    };
  }

  function detectKey(samples, sr) {
    // 12 semitone chroma accumulator
    var chroma = new Float64Array(12);
    var fftSize = 4096;
    var half = fftSize / 2;
    var numWindows = Math.min(32, Math.floor(samples.length / fftSize));
    var winStep = Math.max(fftSize, Math.floor(samples.length / (numWindows || 1)));

    var win = new Float32Array(fftSize);
    for (var w = 0; w < fftSize; w++) {
      win[w] = 0.5 * (1 - Math.cos(2 * Math.PI * w / (fftSize - 1)));
    }

    for (var wi = 0; wi < numWindows; wi++) {
      var offset = wi * winStep;
      var re = new Float64Array(fftSize);
      var im = new Float64Array(fftSize);
      for (var j = 0; j < fftSize && offset + j < samples.length; j++) {
        re[j] = samples[offset + j] * win[j];
      }
      fftRadix2(re, im);

      // Accumulate energy into 12 semitone pitch classes (55 Hz to 2000 Hz)
      for (var bin = 5; bin < half; bin++) {
        var freq = bin * sr / fftSize;
        if (freq < 55 || freq > 2000) continue;
        var mag = re[bin] * re[bin] + im[bin] * im[bin];
        // Semitone index relative to C (MIDI note number % 12)
        var midi = 12 * (Math.log(freq / 440) / Math.LN2) + 69;
        var semitone = Math.round(midi) % 12;
        if (semitone < 0) semitone += 12;
        chroma[semitone] += mag;
      }
    }

    // Normalize chroma
    var maxChroma = 0;
    for (var c = 0; c < 12; c++) if (chroma[c] > maxChroma) maxChroma = chroma[c];
    if (maxChroma > 0) {
      for (var c2 = 0; c2 < 12; c2++) chroma[c2] /= maxChroma;
    }

    // Krumhansl-Schmuckler correlation across all 24 keys (12 Major, 12 Minor)
    var bestScore = -Infinity;
    var bestKey = 'C';
    var bestMode = 'Major';

    for (var rootIdx = 0; rootIdx < 12; rootIdx++) {
      // Major
      var majScore = crossCorrelation(chroma, MAJOR_PROFILE, rootIdx);
      if (majScore > bestScore) {
        bestScore = majScore;
        bestKey = NOTE_NAMES[rootIdx];
        bestMode = 'Major';
      }
      // Minor
      var minScore = crossCorrelation(chroma, MINOR_PROFILE, rootIdx);
      if (minScore > bestScore) {
        bestScore = minScore;
        bestKey = NOTE_NAMES[rootIdx];
        bestMode = 'Minor';
      }
    }

    // Find closest Indian Ragas matching this key & mode
    var matchingRagas = findMatchingRagas(bestKey, bestMode);

    return {
      key: bestKey,
      mode: bestMode,
      keyName: bestKey + ' ' + bestMode,
      chroma: Array.prototype.slice.call(chroma),
      matchingRagas: matchingRagas
    };
  }

  function crossCorrelation(chroma, profile, rootIdx) {
    var n = 12;
    var sum = 0;
    for (var i = 0; i < n; i++) {
      var chromaIdx = (rootIdx + i) % n;
      sum += chroma[chromaIdx] * profile[i];
    }
    return sum;
  }

  function findMatchingRagas(key, mode) {
    if (mode === 'Major') {
      return [
        { name: 'Mohanam (ಮೋಹನ)', desc: 'Major Pentatonic (Sa Ri₂ Ga₃ Pa Dha₂)' },
        { name: 'Shankarabharanam (ಶಂಕರಾಭರಣ)', desc: 'Natural Major / Bilawal' },
        { name: 'Hamsadhwani (ಹಂಸಧ್ವನಿ)', desc: 'Auspicious Pentatonic (Sa Ri₂ Ga₃ Pa Ni₃)' },
        { name: 'Kalyani (ಕಲ್ಯಾಣಿ / Yaman)', desc: 'Lydian / Sharp 4th' }
      ];
    } else {
      return [
        { name: 'Natabhairavi (ನಟಭೈರವಿ)', desc: 'Natural Minor / Asavari' },
        { name: 'Shivaranjani (ಶಿವರಂಜನಿ)', desc: 'Melancholic Minor Pentatonic' },
        { name: 'Sindhu Bhairavi (ಸಿಂಧು ಭೈರವಿ)', desc: 'Phrygian Folk Minor' },
        { name: 'Hindolam (ಹಿಂದೋಳ / Malkauns)', desc: 'Meditative Minor Pentatonic' }
      ];
    }
  }

  // Fast in-place radix-2 FFT
  function fftRadix2(re, im) {
    var n = re.length;
    var j = 0;
    for (var i = 0; i < n - 1; i++) {
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
      var k = n >> 1;
      while (k <= j) { j -= k; k >>= 1; }
      j += k;
    }
    for (var size = 2; size <= n; size <<= 1) {
      var half = size >> 1;
      var tableStep = Math.PI * 2 / size;
      for (var i = 0; i < n; i += size) {
        for (var k = 0; k < half; k++) {
          var angle = tableStep * k;
          var wr = Math.cos(angle), wi = -Math.sin(angle);
          var ur = re[i + k], ui = im[i + k];
          var vr = re[i + k + half] * wr - im[i + k + half] * wi;
          var vi = re[i + k + half] * wi + im[i + k + half] * wr;
          re[i + k] = ur + vr;
          im[i + k] = ui + vi;
          re[i + k + half] = ur - vr;
          im[i + k + half] = ui - vi;
        }
      }
    }
  }

  var API = {
    TALA_PATTERNS: TALA_PATTERNS,
    NOTE_NAMES: NOTE_NAMES,
    createTapTempo: createTapTempo,
    Metronome: Metronome,
    analyzeKeyAndBpm: analyzeKeyAndBpm,
    getTempoName: getTempoName
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.BPM_KEY = API;
})(typeof window !== 'undefined' ? window : globalThis);
