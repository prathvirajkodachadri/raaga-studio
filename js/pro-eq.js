/**
 * pro-eq.js — Raaga Pro-EQ: a practical FabFilter Pro-Q style parametric EQ
 * for the first page. Pure vanilla JS + SVG + Canvas + Web Audio, no deps.
 *
 * Practical features:
 *   • Real biquad filter math (RBJ cookbook) — the curve you see is the exact
 *     magnitude response of the filters applied to the audio.
 *   • Band types: Bell, Low Shelf, High Shelf, Low Cut, High Cut, Notch.
 *     Cut filters support 12/24/36/48 dB/oct Butterworth slopes.
 *   • Drag dots to change freq/gain, mouse-wheel over a dot to change Q,
 *     double-click empty display to add a band, arrow keys nudge.
 *   • Live audio: pink noise or the bundled sample files (or load your own),
 *     played through real BiquadFilterNodes with a real-time spectrum
 *     analyzer drawn behind the EQ curve.
 *   • Presets (Male Vocal, Female Vocal, De-Mud, Air & Sparkle, Podcast,
 *     Telephone FX), global bypass, selectable ±6/±12/±30 dB display range.
 *
 * Engine exported as window.PRO_EQ for tests and console tinkering.
 */
'use strict';

(function () {
  /* ═════════════════════════ constants / data ═════════════════════════ */
  var F_MIN = 20, F_MAX = 20000;      // display range, Hz (3 decades)
  var FS = 48000;                     // sample rate used for curve math
  var N_POINTS = 220;                 // curve resolution
  var PAD = { l: 12, r: 46, t: 10, b: 26 };

  var BAND_COLORS = ['#e8c15a', '#4fc3f7', '#ab7df6', '#ff8a5c',
                     '#5ad19a', '#ff6fa5', '#c9d24f', '#7f8cff'];

  var TYPES = [
    { id: 'bell',      name: 'Bell' },
    { id: 'lowshelf',  name: 'Low Shelf' },
    { id: 'highshelf', name: 'High Shelf' },
    { id: 'lowcut',    name: 'Low Cut' },
    { id: 'highcut',   name: 'High Cut' },
    { id: 'notch',     name: 'Notch' }
  ];
  var SLOPES = [12, 24, 36, 48];

  function band(type, freq, gain, q, slope) {
    return { type: type, freq: freq, gain: gain || 0, q: q || 1,
             slope: slope || 24, on: true };
  }

  var PRESETS = [
    { id: 'default', name: 'Default — Vocal Start', bands: [
      band('lowcut', 80, 0, 0.71, 24),
      band('bell', 200, -2.5, 1.2),
      band('bell', 3000, 2, 1.0),
      band('highshelf', 10000, 1.5, 0.71)
    ]},
    { id: 'flat', name: 'Flat (empty)', bands: [] },
    { id: 'male-vocal', name: 'Male Vocal', bands: [
      band('lowcut', 80, 0, 0.71, 24),
      band('bell', 210, -3, 1.2),
      band('bell', 850, -2, 1.8),
      band('bell', 3000, 2.5, 1.0),
      band('highshelf', 10000, 2, 0.71)
    ]},
    { id: 'female-vocal', name: 'Female Vocal', bands: [
      band('lowcut', 100, 0, 0.71, 24),
      band('bell', 240, -3, 1.3),
      band('bell', 950, -2.5, 2.0),
      band('bell', 3500, 2.5, 1.0),
      band('highshelf', 12000, 2, 0.71)
    ]},
    { id: 'de-mud', name: 'De-Mud', bands: [
      band('lowcut', 90, 0, 0.71, 24),
      band('bell', 220, -4, 1.4),
      band('bell', 350, -2, 1.6)
    ]},
    { id: 'air', name: 'Air & Sparkle', bands: [
      band('bell', 5000, 1.5, 1.0),
      band('highshelf', 11000, 3, 0.71)
    ]},
    { id: 'podcast', name: 'Podcast Voice', bands: [
      band('lowcut', 90, 0, 0.71, 36),
      band('bell', 300, -2, 1.3),
      band('bell', 2500, 2, 1.1),
      band('bell', 7500, -2, 3.0),
      band('highcut', 16000, 0, 0.71, 24)
    ]},
    { id: 'telephone', name: 'Telephone FX', bands: [
      band('lowcut', 300, 0, 0.71, 48),
      band('bell', 1700, 4, 1.2),
      band('highcut', 3400, 0, 0.71, 48)
    ]}
  ];

  /* ═════════════════════════ biquad math (RBJ) ═════════════════════════ */

  /** Butterworth Q values for a cascade of n 2nd-order stages. */
  function butterQs(n) {
    var qs = [];
    for (var k = 0; k < n; k++) qs.push(1 / (2 * Math.sin(Math.PI * (2 * k + 1) / (4 * n))));
    return qs;
  }

  /** RBJ biquad coefficients for one 2nd-order section. */
  function coeffs(type, freq, gainDb, q) {
    var w0 = 2 * Math.PI * Math.min(freq, FS / 2 - 10) / FS;
    var cw = Math.cos(w0), sw = Math.sin(w0);
    var A = Math.pow(10, gainDb / 40);
    var alpha = sw / (2 * Math.max(q, 0.025));
    var b0, b1, b2, a0, a1, a2, sqA = Math.sqrt(A);
    switch (type) {
      case 'bell':
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
        a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
      case 'lowshelf':
        b0 = A * ((A + 1) - (A - 1) * cw + 2 * sqA * alpha);
        b1 = 2 * A * ((A - 1) - (A + 1) * cw);
        b2 = A * ((A + 1) - (A - 1) * cw - 2 * sqA * alpha);
        a0 = (A + 1) + (A - 1) * cw + 2 * sqA * alpha;
        a1 = -2 * ((A - 1) + (A + 1) * cw);
        a2 = (A + 1) + (A - 1) * cw - 2 * sqA * alpha; break;
      case 'highshelf':
        b0 = A * ((A + 1) + (A - 1) * cw + 2 * sqA * alpha);
        b1 = -2 * A * ((A - 1) + (A + 1) * cw);
        b2 = A * ((A + 1) + (A - 1) * cw - 2 * sqA * alpha);
        a0 = (A + 1) - (A - 1) * cw + 2 * sqA * alpha;
        a1 = 2 * ((A - 1) - (A + 1) * cw);
        a2 = (A + 1) - (A - 1) * cw - 2 * sqA * alpha; break;
      case 'lowcut': // highpass section
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2;
        a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'highcut': // lowpass section
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2;
        a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'notch':
        b0 = 1; b1 = -2 * cw; b2 = 1;
        a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      default:
        b0 = a0 = 1; b1 = b2 = a1 = a2 = 0;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  }

  /** All 2nd-order sections for a band (cut filters cascade for slope). */
  function bandSections(b) {
    if (b.type === 'lowcut' || b.type === 'highcut') {
      var n = Math.max(1, Math.round(b.slope / 12));
      return butterQs(n).map(function (q) {
        // multiply the Butterworth Q by the band's resonance factor
        return coeffs(b.type, b.freq, 0, q * (b.q / 0.7071));
      });
    }
    return [coeffs(b.type, b.freq, b.gain, b.q)];
  }

  /** Magnitude (dB) of one biquad section at frequency f. */
  function sectionDb(c, f) {
    var w = 2 * Math.PI * f / FS;
    var c1 = Math.cos(w), s1 = Math.sin(w);
    var c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    var reN = c.b0 + c.b1 * c1 + c.b2 * c2, imN = -(c.b1 * s1 + c.b2 * s2);
    var reD = 1 + c.a1 * c1 + c.a2 * c2,  imD = -(c.a1 * s1 + c.a2 * s2);
    var num = reN * reN + imN * imN, den = reD * reD + imD * imD;
    if (den < 1e-24) den = 1e-24;
    return 10 * Math.log10(Math.max(num / den, 1e-12));
  }

  /** Response in dB of a single band at frequency f. */
  function bandDb(b, f) {
    if (!b.on) return 0;
    var secs = bandSections(b), db = 0;
    for (var i = 0; i < secs.length; i++) db += sectionDb(secs[i], f);
    return db;
  }

  /** Total response in dB of a set of bands at frequency f. */
  function totalDb(bands, f) {
    var db = 0;
    for (var i = 0; i < bands.length; i++) db += bandDb(bands[i], f);
    return db;
  }

  /* ═════════════════════════ state ═════════════════════════ */
  var state = {
    bands: [],
    sel: -1,
    range: 12,          // display ± dB
    bypass: false,
    spectrum: true,
    playing: false,
    source: 'pink',
    outGain: 0,         // dB
    preset: 'default'
  };

  function clonePreset(id) {
    var p = null;
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) p = PRESETS[i];
    if (!p) p = PRESETS[0];
    return p.bands.map(function (b) {
      return { type: b.type, freq: b.freq, gain: b.gain, q: b.q, slope: b.slope, on: true };
    });
  }

  /* ═════════════════════════ dom refs ═════════════════════════ */
  function $(id) { return document.getElementById(id); }
  var displayEl, svgHost, canvasEl, tooltipEl, controlsEl, toolbarEl, audioBarEl, readoutEl;
  var W = 800, H = 360;

  /* ═════════════════════════ geometry ═════════════════════════ */
  function fx(f) { // freq → x
    return PAD.l + (Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)) * (W - PAD.l - PAD.r);
  }
  function xf(x) { // x → freq
    var t = (x - PAD.l) / (W - PAD.l - PAD.r);
    return clamp(F_MIN * Math.pow(F_MAX / F_MIN, t), F_MIN, F_MAX);
  }
  function gy(db) { // dB → y
    var R = state.range;
    return PAD.t + (1 - (db + R) / (2 * R)) * (H - PAD.t - PAD.b);
  }
  function yg(y) { // y → dB
    var R = state.range;
    return clamp((1 - (y - PAD.t) / (H - PAD.t - PAD.b)) * 2 * R - R, -R, R);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function fmtF(f) {
    if (f >= 10000) return (f / 1000).toFixed(1).replace(/\.0$/, '') + ' kHz';
    if (f >= 1000) return (f / 1000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + ' kHz';
    return Math.round(f) + ' Hz';
  }
  function fmtDb(db) { return (db > 0 ? '+' : '') + db.toFixed(1) + ' dB'; }

  /* ═════════════════════════ svg render ═════════════════════════ */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function gridSvg() {
    var s = '';
    var majors = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    var minors = [30, 40, 60, 70, 80, 90, 300, 400, 600, 700, 800, 900,
                  3000, 4000, 6000, 7000, 8000, 9000];
    minors.forEach(function (f) {
      var x = fx(f);
      s += '<line x1="' + x + '" y1="' + PAD.t + '" x2="' + x + '" y2="' + (H - PAD.b) + '" class="peq-grid minor"/>';
    });
    majors.forEach(function (f) {
      var x = fx(f);
      s += '<line x1="' + x + '" y1="' + PAD.t + '" x2="' + x + '" y2="' + (H - PAD.b) + '" class="peq-grid"/>';
      var lab = f >= 1000 ? (f / 1000) + 'k' : String(f);
      s += '<text x="' + x + '" y="' + (H - 8) + '" class="peq-xlab">' + lab + '</text>';
    });
    var R = state.range, step = R / 2;
    for (var db = -R; db <= R; db += step) {
      var y = gy(db);
      s += '<line x1="' + PAD.l + '" y1="' + y + '" x2="' + (W - PAD.r) + '" y2="' + y +
           '" class="peq-grid' + (db === 0 ? ' zero' : '') + '"/>';
      s += '<text x="' + (W - PAD.r + 8) + '" y="' + (y + 3.5) + '" class="peq-ylab">' +
           (db > 0 ? '+' : '') + db + '</text>';
    }
    return s;
  }

  function curvePath(fn) {
    var d = '';
    for (var i = 0; i <= N_POINTS; i++) {
      var f = F_MIN * Math.pow(F_MAX / F_MIN, i / N_POINTS);
      var db = clamp(fn(f), -state.range * 1.45, state.range * 1.45);
      var x = fx(f), y = gy(db);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function curvesSvg() {
    var s = '';
    var y0 = gy(0);
    // selected band's own curve, tinted fill
    if (state.sel >= 0 && state.sel < state.bands.length) {
      var sb = state.bands[state.sel];
      var col = BAND_COLORS[state.sel % BAND_COLORS.length];
      var d = curvePath(function (f) { return bandDb(sb, f); });
      s += '<path d="' + d + ' L' + (W - PAD.r) + ' ' + y0 + ' L' + PAD.l + ' ' + y0 +
           ' Z" fill="' + col + '" opacity="0.13"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.4" opacity="0.85"/>';
    }
    // total curve
    var bands = state.bands;
    var dTot = curvePath(function (f) { return state.bypass ? 0 : totalDb(bands, f); });
    s += '<path d="' + dTot + ' L' + (W - PAD.r) + ' ' + y0 + ' L' + PAD.l + ' ' + y0 +
         ' Z" fill="url(#peq-fill)" class="peq-total-fill"/>';
    s += '<path d="' + dTot + '" class="peq-total' + (state.bypass ? ' off' : '') + '"/>';
    return s;
  }

  function dotY(b) {
    if (b.type === 'lowcut' || b.type === 'highcut' || b.type === 'notch') return gy(0);
    return gy(clamp(b.gain, -state.range, state.range));
  }

  function dotsSvg() {
    var s = '';
    state.bands.forEach(function (b, i) {
      var col = BAND_COLORS[i % BAND_COLORS.length];
      var x = fx(b.freq), y = dotY(b);
      var selCls = i === state.sel ? ' sel' : '';
      var offCls = (!b.on || state.bypass) ? ' off' : '';
      s += '<g class="peq-node' + selCls + offCls + '" data-band="' + i + '">' +
           '<circle class="peq-hit" data-band="' + i + '" cx="' + x + '" cy="' + y + '" r="16"/>' +
           '<circle class="peq-dot" data-band="' + i + '" cx="' + x + '" cy="' + y + '" r="8.5" ' +
             'fill="' + (i === state.sel ? col : '#171a20') + '" stroke="' + col + '"/>' +
           '<text class="peq-num" data-band="' + i + '" x="' + x + '" y="' + (y + 3.4) + '" ' +
             'fill="' + (i === state.sel ? '#10131a' : col) + '">' + (i + 1) + '</text>' +
           '</g>';
    });
    return s;
  }

  function render() {
    if (!svgHost) return;
    var svg =
      '<svg class="peq-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-label="Parametric EQ response">' +
      '<defs><linearGradient id="peq-fill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f5d76e" stop-opacity="0.22"/>' +
      '<stop offset="1" stop-color="#f5d76e" stop-opacity="0.03"/>' +
      '</linearGradient></defs>' +
      gridSvg() + curvesSvg() + dotsSvg() +
      '</svg>';
    svgHost.innerHTML = svg;
    renderReadout();
  }

  function renderReadout() {
    if (!readoutEl) return;
    if (state.sel < 0 || state.sel >= state.bands.length) {
      readoutEl.innerHTML = '<span class="dim">double-click the display to add a band · drag dots · scroll for Q</span>';
      return;
    }
    var b = state.bands[state.sel];
    var col = BAND_COLORS[state.sel % BAND_COLORS.length];
    var tn = TYPES.filter(function (t) { return t.id === b.type; })[0];
    readoutEl.innerHTML =
      '<span class="peq-ro-chip" style="background:' + col + '"></span>' +
      '<b>Band ' + (state.sel + 1) + '</b> · ' + esc(tn ? tn.name : b.type) +
      ' · ' + fmtF(b.freq) +
      (hasGain(b) ? ' · ' + fmtDb(b.gain) : (isCut(b) ? ' · ' + b.slope + ' dB/oct' : '')) +
      ' · Q ' + b.q.toFixed(2);
  }

  function isCut(b) { return b.type === 'lowcut' || b.type === 'highcut'; }
  function hasGain(b) { return b.type === 'bell' || b.type === 'lowshelf' || b.type === 'highshelf'; }

  /* ═════════════════════════ band control bar ═════════════════════════ */
  function renderControls() {
    if (!controlsEl) return;
    if (state.sel < 0 || state.sel >= state.bands.length) {
      controlsEl.innerHTML =
        '<div class="peq-ctl-empty">No band selected — click a dot on the display, or ' +
        '<button type="button" class="peq-btn small" id="peq-add2">+ Add Band</button></div>';
      return;
    }
    var b = state.bands[state.sel];
    var col = BAND_COLORS[state.sel % BAND_COLORS.length];
    var typeOpts = TYPES.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === b.type ? ' selected' : '') + '>' + t.name + '</option>';
    }).join('');
    var slopeOpts = SLOPES.map(function (s) {
      return '<option value="' + s + '"' + (s === b.slope ? ' selected' : '') + '>' + s + ' dB/oct</option>';
    }).join('');
    var gainDis = hasGain(b) ? '' : ' disabled';
    controlsEl.innerHTML =
      '<div class="peq-ctl-row">' +
        '<span class="peq-band-tag" style="--bc:' + col + '">' + (state.sel + 1) + '</span>' +
        '<label class="peq-ctl-sel">Type <select id="peq-c-type">' + typeOpts + '</select></label>' +
        '<label class="peq-ctl-sel' + (isCut(b) ? '' : ' hide') + '">Slope <select id="peq-c-slope">' + slopeOpts + '</select></label>' +
        '<div class="peq-ctl-knob">' +
          '<span class="k">FREQ</span>' +
          '<input type="range" id="peq-c-freq-r" min="0" max="1000" step="1" value="' +
            Math.round(1000 * Math.log(b.freq / F_MIN) / Math.log(F_MAX / F_MIN)) + '">' +
          '<input type="text" id="peq-c-freq" inputmode="decimal" value="' + Math.round(b.freq) + '"><span class="u">Hz</span>' +
        '</div>' +
        '<div class="peq-ctl-knob">' +
          '<span class="k">GAIN</span>' +
          '<input type="range" id="peq-c-gain-r" min="-15" max="15" step="0.1" value="' + b.gain + '"' + gainDis + '>' +
          '<input type="text" id="peq-c-gain" inputmode="decimal" value="' + b.gain.toFixed(1) + '"' + gainDis + '><span class="u">dB</span>' +
        '</div>' +
        '<div class="peq-ctl-knob">' +
          '<span class="k">Q</span>' +
          '<input type="range" id="peq-c-q-r" min="0" max="1000" step="1" value="' +
            Math.round(1000 * Math.log(b.q / 0.1) / Math.log(30 / 0.1)) + '">' +
          '<input type="text" id="peq-c-q" inputmode="decimal" value="' + b.q.toFixed(2) + '">' +
        '</div>' +
        '<button type="button" class="peq-btn small' + (b.on ? ' lit' : '') + '" id="peq-c-on" title="Enable/disable band">' + (b.on ? 'On' : 'Off') + '</button>' +
        '<button type="button" class="peq-btn small danger" id="peq-c-del" title="Delete band">✕</button>' +
      '</div>';
    wireControls();
  }

  function wireControls() {
    var t = $('peq-c-type'), sl = $('peq-c-slope');
    var fr = $('peq-c-freq-r'), fi = $('peq-c-freq');
    var gr = $('peq-c-gain-r'), gi = $('peq-c-gain');
    var qr = $('peq-c-q-r'), qi = $('peq-c-q');
    var on = $('peq-c-on'), del = $('peq-c-del');
    function cur() { return state.bands[state.sel]; }
    if (t) t.addEventListener('change', function () {
      var b = cur(); if (!b) return;
      b.type = t.value;
      if (!hasGain(b)) b.gain = 0;
      if (isCut(b) && b.q < 0.3) b.q = 0.71;
      rebuildAudio(); renderControls(); render();
    });
    if (sl) sl.addEventListener('change', function () {
      var b = cur(); if (!b) return;
      b.slope = parseInt(sl.value, 10) || 24;
      rebuildAudio(); render(); renderReadout();
    });
    if (fr) fr.addEventListener('input', function () {
      var b = cur(); if (!b) return;
      b.freq = F_MIN * Math.pow(F_MAX / F_MIN, (parseFloat(fr.value) || 0) / 1000);
      if (fi) fi.value = Math.round(b.freq);
      updateAudioBand(state.sel); render();
    });
    if (fi) fi.addEventListener('change', function () {
      var b = cur(); if (!b) return;
      var v = parseFloat(fi.value);
      if (isFinite(v)) b.freq = clamp(v, F_MIN, F_MAX);
      fi.value = Math.round(b.freq);
      if (fr) fr.value = Math.round(1000 * Math.log(b.freq / F_MIN) / Math.log(F_MAX / F_MIN));
      updateAudioBand(state.sel); render();
    });
    if (gr) gr.addEventListener('input', function () {
      var b = cur(); if (!b) return;
      b.gain = clamp(parseFloat(gr.value) || 0, -15, 15);
      if (gi) gi.value = b.gain.toFixed(1);
      updateAudioBand(state.sel); render();
    });
    if (gi) gi.addEventListener('change', function () {
      var b = cur(); if (!b) return;
      var v = parseFloat(gi.value);
      if (isFinite(v)) b.gain = clamp(v, -15, 15);
      gi.value = b.gain.toFixed(1);
      if (gr) gr.value = b.gain;
      updateAudioBand(state.sel); render();
    });
    if (qr) qr.addEventListener('input', function () {
      var b = cur(); if (!b) return;
      b.q = 0.1 * Math.pow(30 / 0.1, (parseFloat(qr.value) || 0) / 1000);
      if (qi) qi.value = b.q.toFixed(2);
      rebuildAudio(); render();
    });
    if (qi) qi.addEventListener('change', function () {
      var b = cur(); if (!b) return;
      var v = parseFloat(qi.value);
      if (isFinite(v)) b.q = clamp(v, 0.1, 30);
      qi.value = b.q.toFixed(2);
      if (qr) qr.value = Math.round(1000 * Math.log(b.q / 0.1) / Math.log(30 / 0.1));
      rebuildAudio(); render();
    });
    if (on) on.addEventListener('click', function () {
      var b = cur(); if (!b) return;
      b.on = !b.on;
      rebuildAudio(); renderControls(); render();
    });
    if (del) del.addEventListener('click', function () { removeBand(state.sel); });
    var add2 = $('peq-add2');
    if (add2) add2.addEventListener('click', function () { addBand(); });
  }

  /* ═════════════════════════ engine API ═════════════════════════ */
  function addBand(type, freq, gain, q) {
    if (state.bands.length >= 8) return -1;
    var b = band(type || 'bell', freq || 1000, gain || 0, q || 1, 24);
    state.bands.push(b);
    state.sel = state.bands.length - 1;
    rebuildAudio(); renderControls(); render();
    return state.sel;
  }

  function removeBand(i) {
    if (i < 0 || i >= state.bands.length) return;
    state.bands.splice(i, 1);
    if (state.sel >= state.bands.length) state.sel = state.bands.length - 1;
    rebuildAudio(); renderControls(); render();
  }

  function selectBand(i) {
    state.sel = (i >= 0 && i < state.bands.length) ? i : -1;
    renderControls(); render();
  }

  function setPreset(id) {
    state.preset = id;
    state.bands = clonePreset(id);
    state.sel = state.bands.length ? 0 : -1;
    var sel = $('peq-preset');
    if (sel && sel.value !== id) sel.value = id;
    rebuildAudio(); renderControls(); render();
  }

  function setRange(r) {
    state.range = r;
    ['6', '12', '30'].forEach(function (v) {
      var btn = $('peq-range-' + v);
      if (btn) {
        btn.classList.toggle('lit', String(r) === v);
        btn.setAttribute('aria-pressed', String(r) === v ? 'true' : 'false');
      }
    });
    render();
  }

  function setBypass(v) {
    state.bypass = v;
    var btn = $('peq-bypass');
    if (btn) {
      btn.classList.toggle('lit', v);
      btn.setAttribute('aria-pressed', v ? 'true' : 'false');
    }
    routeAudio(); render();
  }

  function reset() { setPreset(state.preset); }

  /* ═════════════════════════ pointer interaction ═════════════════════════ */
  var drag = null;

  function evtPos(e) {
    var r = displayEl.getBoundingClientRect();
    var cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    var cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - r.left) * (W / Math.max(r.width, 1)),
      y: (cy - r.top) * (H / Math.max(r.height, 1))
    };
  }

  function bandAt(e) {
    var t = e.target;
    if (t && t.getAttribute) {
      var v = t.getAttribute('data-band');
      if (v !== null && v !== undefined) return parseInt(v, 10);
    }
    return -1;
  }

  function onPointerDown(e) {
    var i = bandAt(e);
    if (i >= 0) {
      selectBand(i);
      drag = { i: i };
      if (displayEl.setPointerCapture && e.pointerId !== undefined) {
        try { displayEl.setPointerCapture(e.pointerId); } catch (err) {}
      }
      e.preventDefault && e.preventDefault();
    }
  }

  function onPointerMove(e) {
    var p = evtPos(e);
    if (drag) {
      var b = state.bands[drag.i];
      if (!b) { drag = null; return; }
      var fine = e.shiftKey ? 0.25 : 1;
      var f = xf(p.x);
      if (fine < 1) f = b.freq + (f - b.freq) * fine;
      b.freq = clamp(f, F_MIN, F_MAX);
      if (hasGain(b)) {
        var g = yg(p.y);
        if (fine < 1) g = b.gain + (g - b.gain) * fine;
        b.gain = clamp(Math.round(g * 10) / 10, -15, 15);
      }
      updateAudioBand(drag.i);
      syncControlValues();
      render();
      hideTooltip();
      e.preventDefault && e.preventDefault();
      return;
    }
    // hover readout
    if (tooltipEl && p.x >= PAD.l && p.x <= W - PAD.r && p.y >= PAD.t && p.y <= H - PAD.b) {
      var f2 = xf(p.x);
      var db = state.bypass ? 0 : totalDb(state.bands, f2);
      tooltipEl.hidden = false;
      tooltipEl.textContent = fmtF(f2) + ' · ' + fmtDb(db);
      var r = displayEl.getBoundingClientRect();
      var px = p.x * (r.width / W), py = p.y * (r.height / H);
      tooltipEl.style.left = Math.min(px + 14, r.width - 130) + 'px';
      tooltipEl.style.top = Math.max(py - 30, 4) + 'px';
    } else hideTooltip();
  }

  function onPointerUp() { drag = null; }
  function hideTooltip() { if (tooltipEl) tooltipEl.hidden = true; }

  function onDblClick(e) {
    var i = bandAt(e);
    if (i >= 0) { removeBand(i); return; }
    var p = evtPos(e);
    if (p.x < PAD.l || p.x > W - PAD.r) return;
    var f = xf(p.x), g = clamp(Math.round(yg(p.y) * 10) / 10, -15, 15);
    // Pro-Q style: guess a sensible type from where you click
    var type = 'bell';
    if (f < 60) type = 'lowcut';
    else if (f > 16000) type = 'highshelf';
    addBand(type, f, type === 'bell' ? g : (type === 'highshelf' ? g : 0), 1);
  }

  function onWheel(e) {
    if (state.sel < 0) return;
    var b = state.bands[state.sel];
    if (!b) return;
    var dir = (e.deltaY || 0) > 0 ? -1 : 1;
    b.q = clamp(b.q * (dir > 0 ? 1.12 : 1 / 1.12), 0.1, 30);
    rebuildAudio(); syncControlValues(); render();
    e.preventDefault && e.preventDefault();
  }

  function onKey(e) {
    if (state.sel < 0) return;
    var b = state.bands[state.sel];
    if (!b) return;
    var k = e.key, step = e.shiftKey ? 0.2 : 1;
    var used = true;
    if (k === 'ArrowLeft') b.freq = clamp(b.freq / (1 + 0.03 * step), F_MIN, F_MAX);
    else if (k === 'ArrowRight') b.freq = clamp(b.freq * (1 + 0.03 * step), F_MIN, F_MAX);
    else if (k === 'ArrowUp' && hasGain(b)) b.gain = clamp(b.gain + 0.5 * step, -15, 15);
    else if (k === 'ArrowDown' && hasGain(b)) b.gain = clamp(b.gain - 0.5 * step, -15, 15);
    else if (k === 'Delete' || k === 'Backspace') { removeBand(state.sel); return; }
    else used = false;
    if (used) {
      updateAudioBand(state.sel);
      syncControlValues(); render();
      e.preventDefault && e.preventDefault();
    }
  }

  /** Push current band values into the control bar without full re-render. */
  function syncControlValues() {
    var b = state.bands[state.sel];
    if (!b) return;
    var fi = $('peq-c-freq'), fr = $('peq-c-freq-r');
    var gi = $('peq-c-gain'), gr = $('peq-c-gain-r');
    var qi = $('peq-c-q'), qr = $('peq-c-q-r');
    var ae = document.activeElement;
    if (fi && fi !== ae) fi.value = Math.round(b.freq);
    if (fr && fr !== ae) fr.value = Math.round(1000 * Math.log(b.freq / F_MIN) / Math.log(F_MAX / F_MIN));
    if (gi && gi !== ae) gi.value = b.gain.toFixed(1);
    if (gr && gr !== ae) gr.value = b.gain;
    if (qi && qi !== ae) qi.value = b.q.toFixed(2);
    if (qr && qr !== ae) qr.value = Math.round(1000 * Math.log(b.q / 0.1) / Math.log(30 / 0.1));
  }

  /* ═════════════════════════ web audio ═════════════════════════ */
  var AC = null, srcNode = null, inNode = null, outNode = null, analyser = null;
  var chainNodes = [], bandNodeMap = []; // bandNodeMap[i] = [BiquadFilterNode,...]
  var pinkBuf = null, fileBuf = null, sampleBufs = {};
  var rafId = 0;

  function audioSupported() {
    return typeof window !== 'undefined' &&
      (typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function');
  }

  function ctx() {
    if (AC) return AC;
    if (!audioSupported()) return null;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    AC = new Ctor();
    inNode = AC.createGain();
    outNode = AC.createGain();
    analyser = AC.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.82;
    outNode.connect(analyser);
    analyser.connect(AC.destination);
    routeAudio();
    return AC;
  }

  function makePink(ac) {
    // Voss-ish pink noise, 4 s loop
    var len = ac.sampleRate * 4;
    var buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }

  function nodesForBand(ac, b) {
    var nodes = [];
    if (isCut(b)) {
      var n = Math.max(1, Math.round(b.slope / 12));
      butterQs(n).forEach(function (q) {
        var f = ac.createBiquadFilter();
        f.type = b.type === 'lowcut' ? 'highpass' : 'lowpass';
        f.frequency.value = clamp(b.freq, F_MIN, F_MAX);
        f.Q.value = 20 * Math.log10(q * (b.q / 0.7071)); // WebAudio HP/LP Q is in dB
        nodes.push(f);
      });
    } else {
      var f2 = ac.createBiquadFilter();
      f2.type = b.type === 'bell' ? 'peaking' :
                b.type === 'lowshelf' ? 'lowshelf' :
                b.type === 'highshelf' ? 'highshelf' : 'notch';
      f2.frequency.value = clamp(b.freq, F_MIN, F_MAX);
      f2.Q.value = b.q;
      if (f2.gain) f2.gain.value = hasGain(b) ? b.gain : 0;
      nodes.push(f2);
    }
    return nodes;
  }

  function rebuildAudio() {
    if (!AC || !inNode) return;
    try { inNode.disconnect(); } catch (e) {}
    chainNodes.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
    chainNodes = []; bandNodeMap = [];
    var prev = inNode;
    state.bands.forEach(function (b, i) {
      if (!b.on) { bandNodeMap[i] = []; return; }
      var ns = nodesForBand(AC, b);
      bandNodeMap[i] = ns;
      ns.forEach(function (n) { chainNodes.push(n); });
    });
    routeAudio();
  }

  function routeAudio() {
    if (!AC || !inNode) return;
    try { inNode.disconnect(); } catch (e) {}
    chainNodes.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
    if (state.bypass || chainNodes.length === 0) {
      inNode.connect(outNode);
    } else {
      var prev = inNode;
      chainNodes.forEach(function (n) { prev.connect(n); prev = n; });
      prev.connect(outNode);
    }
  }

  function updateAudioBand(i) {
    if (!AC) return;
    var b = state.bands[i], ns = bandNodeMap[i];
    if (!b || !ns || !ns.length) return;
    if (isCut(b)) {
      var qs = butterQs(Math.max(1, Math.round(b.slope / 12)));
      if (qs.length !== ns.length) { rebuildAudio(); return; }
      ns.forEach(function (n, k) {
        n.frequency.value = clamp(b.freq, F_MIN, F_MAX);
        n.Q.value = 20 * Math.log10(qs[k] * (b.q / 0.7071));
      });
    } else {
      ns[0].frequency.value = clamp(b.freq, F_MIN, F_MAX);
      ns[0].Q.value = b.q;
      if (ns[0].gain) ns[0].gain.value = hasGain(b) ? b.gain : 0;
    }
  }

  function stopSource() {
    if (srcNode) { try { srcNode.stop(); } catch (e) {} try { srcNode.disconnect(); } catch (e) {} srcNode = null; }
    state.playing = false;
    var btn = $('peq-play');
    if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('lit'); }
    if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    rafId = 0;
    clearSpectrum();
  }

  function startSource(buf) {
    var ac = ctx();
    if (!ac || !buf) return;
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    stopSource();
    srcNode = ac.createBufferSource();
    srcNode.buffer = buf;
    srcNode.loop = true;
    srcNode.connect(inNode);
    srcNode.start();
    state.playing = true;
    var btn = $('peq-play');
    if (btn) { btn.textContent = '■ Stop'; btn.classList.add('lit'); }
    spectrumLoop();
  }

  function togglePlay() {
    if (state.playing) { stopSource(); return; }
    var ac = ctx();
    if (!ac) { flashStatus('Web Audio not supported in this browser.'); return; }
    rebuildAudio();
    var src = state.source;
    if (src === 'pink') {
      if (!pinkBuf) pinkBuf = makePink(ac);
      startSource(pinkBuf);
    } else if (src === 'file') {
      if (fileBuf) startSource(fileBuf);
      else flashStatus('Load an audio file first (Load file…).');
    } else {
      if (sampleBufs[src]) { startSource(sampleBufs[src]); return; }
      flashStatus('Loading sample…');
      fetch('sample_audio/' + src)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
        .then(function (ab) { return ac.decodeAudioData(ab); })
        .then(function (buf) { sampleBufs[src] = buf; flashStatus(''); startSource(buf); })
        .catch(function () { flashStatus('Could not load sample audio.'); });
    }
  }

  function loadUserFile(file) {
    var ac = ctx();
    if (!ac || !file) return;
    flashStatus('Decoding ' + (file.name || 'file') + '…');
    var reader = new FileReader();
    reader.onload = function () {
      ac.decodeAudioData(reader.result).then(function (buf) {
        fileBuf = buf;
        state.source = 'file';
        var sel = $('peq-source');
        if (sel) sel.value = 'file';
        flashStatus('Loaded: ' + (file.name || 'audio'));
        if (state.playing) startSource(fileBuf);
      }).catch(function () { flashStatus('Could not decode that file.'); });
    };
    reader.readAsArrayBuffer(file);
  }

  function flashStatus(msg) {
    var el = $('peq-status');
    if (el) el.textContent = msg || '';
  }

  /* ═════════════════════════ spectrum analyzer ═════════════════════════ */
  var specData = null;

  function clearSpectrum() {
    if (!canvasEl || !canvasEl.getContext) return;
    var c = canvasEl.getContext('2d');
    if (c) c.clearRect(0, 0, canvasEl.width || 0, canvasEl.height || 0);
  }

  function spectrumLoop() {
    if (!state.playing || !analyser || !canvasEl || !canvasEl.getContext) return;
    if (typeof requestAnimationFrame !== 'function') return;
    var c = canvasEl.getContext('2d');
    if (!c) return;
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    function frame() {
      if (!state.playing) return;
      var rect = displayEl.getBoundingClientRect();
      var cw = Math.max(Math.round(rect.width * dpr), 10);
      var chh = Math.max(Math.round(rect.height * dpr), 10);
      if (canvasEl.width !== cw) canvasEl.width = cw;
      if (canvasEl.height !== chh) canvasEl.height = chh;
      c.clearRect(0, 0, cw, chh);
      if (state.spectrum) {
        if (!specData || specData.length !== analyser.frequencyBinCount) {
          specData = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(specData);
        var nyq = (AC ? AC.sampleRate : 48000) / 2;
        var padL = PAD.l / W * cw, padR = PAD.r / W * cw;
        var padT = PAD.t / H * chh, padB = PAD.b / H * chh;
        var iw = cw - padL - padR, ih = chh - padT - padB;
        c.beginPath();
        c.moveTo(padL, chh - padB);
        var steps = 160;
        for (var s = 0; s <= steps; s++) {
          var f = F_MIN * Math.pow(F_MAX / F_MIN, s / steps);
          var bin = Math.min(Math.round(f / nyq * specData.length), specData.length - 1);
          var v = specData[bin] / 255;
          var x = padL + (s / steps) * iw;
          var y = padT + (1 - v) * ih;
          c.lineTo(x, y);
        }
        c.lineTo(padL + iw, chh - padB);
        c.closePath();
        c.fillStyle = 'rgba(110, 180, 235, 0.14)';
        c.fill();
        c.strokeStyle = 'rgba(130, 195, 245, 0.35)';
        c.lineWidth = dpr;
        c.stroke();
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  /* ═════════════════════════ toolbar / audio bar ═════════════════════════ */
  function renderToolbar() {
    if (!toolbarEl) return;
    var presetOpts = PRESETS.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === state.preset ? ' selected' : '') + '>' + p.name + '</option>';
    }).join('');
    toolbarEl.innerHTML =
      '<div class="peq-brand-mini"><span class="dot"></span>Raaga <b>Pro-EQ</b></div>' +
      '<label class="peq-preset-wrap">Preset <select id="peq-preset">' + presetOpts + '</select></label>' +
      '<div class="peq-tool-right">' +
        '<div class="peq-rangegrp" role="group" aria-label="Display range">' +
          '<button type="button" class="peq-btn seg" id="peq-range-6" aria-pressed="false">±6</button>' +
          '<button type="button" class="peq-btn seg lit" id="peq-range-12" aria-pressed="true">±12</button>' +
          '<button type="button" class="peq-btn seg" id="peq-range-30" aria-pressed="false">±30</button>' +
        '</div>' +
        '<button type="button" class="peq-btn" id="peq-add">+ Band</button>' +
        '<button type="button" class="peq-btn" id="peq-bypass" aria-pressed="false">Bypass</button>' +
        '<button type="button" class="peq-btn" id="peq-reset">Reset</button>' +
      '</div>';
    var ps = $('peq-preset');
    if (ps) ps.addEventListener('change', function () { setPreset(ps.value); });
    var add = $('peq-add');
    if (add) add.addEventListener('click', function () { addBand(); });
    var bp = $('peq-bypass');
    if (bp) bp.addEventListener('click', function () { setBypass(!state.bypass); });
    var rs = $('peq-reset');
    if (rs) rs.addEventListener('click', reset);
    [6, 12, 30].forEach(function (r) {
      var btn = $('peq-range-' + r);
      if (btn) btn.addEventListener('click', function () { setRange(r); });
    });
  }

  function renderAudioBar() {
    if (!audioBarEl) return;
    audioBarEl.innerHTML =
      '<span class="peq-audio-lab">AUDIO</span>' +
      '<select id="peq-source" aria-label="Audio source">' +
        '<option value="pink">Pink noise</option>' +
        '<option value="good_master.wav">Sample — good master</option>' +
        '<option value="over_compressed.wav">Sample — over-compressed</option>' +
        '<option value="clipped_audio.wav">Sample — clipped</option>' +
        '<option value="file">Your file</option>' +
      '</select>' +
      '<button type="button" class="peq-btn" id="peq-play">▶ Play</button>' +
      '<button type="button" class="peq-btn small" id="peq-loadfile">Load file…</button>' +
      '<input type="file" id="peq-file" accept="audio/*" hidden>' +
      '<label class="peq-tgl"><input type="checkbox" id="peq-spec" checked><span class="tui"></span>Spectrum</label>' +
      '<span class="peq-outgain"><span class="k">OUT</span>' +
        '<input type="range" id="peq-out" min="-24" max="12" step="0.5" value="0">' +
        '<span id="peq-out-val">0.0 dB</span></span>' +
      '<span class="peq-audio-status" id="peq-status" aria-live="polite"></span>';
    var src = $('peq-source');
    if (src) src.addEventListener('change', function () {
      state.source = src.value;
      if (state.playing) togglePlay(), togglePlay();
    });
    var play = $('peq-play');
    if (play) play.addEventListener('click', togglePlay);
    var lf = $('peq-loadfile'), fin = $('peq-file');
    if (lf && fin) {
      lf.addEventListener('click', function () { fin.click && fin.click(); });
      fin.addEventListener('change', function () {
        if (fin.files && fin.files[0]) loadUserFile(fin.files[0]);
      });
    }
    var spec = $('peq-spec');
    if (spec) spec.addEventListener('change', function () {
      state.spectrum = !!spec.checked;
      if (!state.spectrum) clearSpectrum();
    });
    var out = $('peq-out'), outVal = $('peq-out-val');
    if (out) out.addEventListener('input', function () {
      state.outGain = parseFloat(out.value) || 0;
      if (outVal) outVal.textContent = state.outGain.toFixed(1) + ' dB';
      if (outNode) outNode.gain.value = Math.pow(10, state.outGain / 20);
    });
  }

  /* ═════════════════════════ init ═════════════════════════ */
  function init() {
    displayEl = $('peq-display');
    svgHost = $('peq-svg-host');
    canvasEl = $('peq-spectrum');
    tooltipEl = $('peq-tooltip');
    controlsEl = $('peq-controls');
    toolbarEl = $('peq-toolbar');
    audioBarEl = $('peq-audiobar');
    readoutEl = $('peq-readout');
    if (!displayEl || !svgHost) return;

    state.bands = clonePreset(state.preset);
    state.sel = state.bands.length ? 0 : -1;

    renderToolbar();
    renderAudioBar();
    renderControls();
    render();

    displayEl.addEventListener('pointerdown', onPointerDown);
    displayEl.addEventListener('pointermove', onPointerMove);
    displayEl.addEventListener('pointerup', onPointerUp);
    displayEl.addEventListener('pointercancel', onPointerUp);
    displayEl.addEventListener('pointerleave', function () { hideTooltip(); });
    displayEl.addEventListener('dblclick', onDblClick);
    displayEl.addEventListener('wheel', onWheel, { passive: false });
    displayEl.addEventListener('keydown', onKey);
    if (displayEl.setAttribute) displayEl.setAttribute('tabindex', '0');

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', function () { render(); });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  /* ═════════════════════════ export ═════════════════════════ */
  if (typeof window !== 'undefined') {
    window.PRO_EQ = {
      state: state,
      data: { presets: PRESETS, types: TYPES, slopes: SLOPES, colors: BAND_COLORS },
      bandDb: bandDb,
      totalDb: totalDb,
      coeffs: coeffs,
      butterQs: butterQs,
      addBand: addBand,
      removeBand: removeBand,
      selectBand: selectBand,
      setPreset: setPreset,
      setRange: setRange,
      setBypass: setBypass,
      reset: reset,
      render: render,
      init: init
    };
  }
})();
