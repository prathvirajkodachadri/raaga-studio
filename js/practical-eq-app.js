/**
 * practical-eq-app.js — Practical EQ tab controller (UI only).
 * Renders whatever window.PRACTICAL_EQ.analyzeFile() measured: the report
 * sections and the frequency graph are drawn from the SAME result object, so
 * they can never disagree. No audio is processed, filtered or rendered here.
 */
'use strict';

(function () {
  var PEQ = window.PRACTICAL_EQ;
  if (!PEQ) { console.error('PRACTICAL_EQ engine missing'); return; }

  var dropzone = document.getElementById('pq-dropzone');
  var fileInput = document.getElementById('pq-file');
  var browseBtn = document.getElementById('pq-browse');
  var clearBtn = document.getElementById('pq-clear');
  var progressWrap = document.getElementById('pq-progress-wrap');
  var progressBar = document.getElementById('pq-progress-bar');
  var progressLabel = document.getElementById('pq-progress-label');
  var progressPct = document.getElementById('pq-progress-pct');
  var errorEl = document.getElementById('pq-error');
  var resultsEl = document.getElementById('pq-results');
  if (!dropzone || !resultsEl) return;

  var current = null;   // { source, result }

  // ─── helpers ──────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function hz(f) { return PEQ.fmtHz(f); }
  function gain(g) { return PEQ.fmtGain(g); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function dur(sec) {
    if (!isFinite(sec)) return '—';
    var m = Math.floor(sec / 60), s = sec - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }
  function sevClass(sev) { return 'pq-sev-' + String(sev || 'low').toLowerCase(); }

  // ─── file intake ──────────────────────────────────────────────────────────
  var ACCEPT = /\.(wav|wave|mp3|aiff|aif|aifc|m4a|aac|mp4|flac|ogg|oga|opus|caf|webm)$/i;

  function acceptFile(file) {
    if (!file) return;
    if (!/^audio\//.test(file.type) && !ACCEPT.test(file.name)) {
      showError('Unsupported file type.', 'Please try a WAV, MP3, AIFF, M4A or FLAC file. WAV is best for professional analysis.');
      return;
    }
    reset(true);
    progressWrap.hidden = false;
    setProgress(0.02, 'Reading file…');

    PEQ.analyzeFile(file, {
      onProgress: function (p, msg) { setProgress(p, msg); }
    }).then(function (bundle) {
      current = bundle;
      setProgress(1, 'Analysis complete');
      render(bundle);
      setTimeout(function () { progressWrap.hidden = true; }, 600);
      if (clearBtn) clearBtn.disabled = false;
    }).catch(function (err) {
      progressWrap.hidden = true;
      var msg = String((err && err.message) || err);
      showError('Unable to analyze this file.', msg);
    });
  }

  function setProgress(p, msg) {
    var v = Math.max(0, Math.min(1, p));
    progressBar.style.width = Math.round(v * 100) + '%';
    if (progressPct) progressPct.textContent = Math.round(v * 100) + '%';
    if (msg) progressLabel.textContent = msg;
  }

  function showError(title, detail) {
    errorEl.hidden = false;
    errorEl.innerHTML = '<strong>' + escapeHtml(title) + '</strong>' +
      (detail ? '<p>' + escapeHtml(detail) + '</p>' : '');
  }

  function reset(keepZone) {
    current = null;
    resultsEl.innerHTML = '';
    errorEl.hidden = true;
    errorEl.innerHTML = '';
    if (!keepZone) {
      progressWrap.hidden = true;
      if (clearBtn) clearBtn.disabled = true;
    }
  }

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      acceptFile(fileInput.files && fileInput.files[0]);
      fileInput.value = '';
    });
  }
  if (clearBtn) clearBtn.addEventListener('click', function () { reset(false); });

  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', function (e) {
    acceptFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  dropzone.addEventListener('click', function () { if (fileInput) fileInput.click(); });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (fileInput) fileInput.click(); }
  });

  // ─── graph ────────────────────────────────────────────────────────────────
  var GW = 1000, GH = 420;
  var PAD = { l: 46, r: 18, t: 18, b: 34 };
  var FMIN = 20, FMAX = 20000;
  var DBMAX = 6;
  var TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

  function xOf(f) {
    var t = Math.log10(Math.max(FMIN, Math.min(FMAX, f)) / FMIN) / Math.log10(FMAX / FMIN);
    return PAD.l + t * (GW - PAD.l - PAD.r);
  }
  function yOf(dbv) {
    var t = (DBMAX - dbv) / (DBMAX * 2);
    return PAD.t + t * (GH - PAD.t - PAD.b);
  }
  function tickLabel(f) {
    return f >= 1000 ? (f / 1000) + 'k' : String(f);
  }

  /** Recommendation curve — a bell per finding, summed. Pure visualisation of
   *  the engine's own numbers (frequency, gain, measured width). */
  function curvePoints(points) {
    var out = [];
    for (var i = 0; i <= 260; i++) {
      var f = FMIN * Math.pow(FMAX / FMIN, i / 260);
      var g = 0;
      points.forEach(function (p) {
        if (!p.frequency || !p.gain) return;
        var w = p.widthOctaves && p.widthOctaves > 0.08 ? p.widthOctaves : 0.5;
        var sigma = Math.max(0.14, w / 2);
        var d = Math.log2(f / p.frequency) / sigma;
        g += p.gain * Math.exp(-0.5 * d * d);
      });
      out.push([xOf(f), yOf(Math.max(-DBMAX, Math.min(DBMAX, g))), f, g]);
    }
    return out;
  }

  function pathFrom(pts) {
    return pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    }).join(' ');
  }

  /** Measured spectrum, scaled into the visible dB window for context only. */
  function spectrumPath(spectrum) {
    if (!spectrum || !spectrum.length) return { line: '', area: '', scale: 1 };
    var vals = spectrum.filter(function (p) { return p.f >= FMIN && p.f <= FMAX; });
    var max = -Infinity, min = Infinity;
    vals.forEach(function (p) { if (isFinite(p.db)) { max = Math.max(max, p.db); min = Math.min(min, p.db); } });
    if (!isFinite(max)) return { line: '', area: '', scale: 1 };
    var span = Math.max(12, Math.min(60, max - min));
    var pts = vals.map(function (p) {
      var norm = (p.db - max) / span;           // 0 at peak, −1 at bottom of span
      var y = PAD.t + 6 + Math.max(0, Math.min(1, -norm)) * (GH - PAD.t - PAD.b - 12);
      return [xOf(p.f), y];
    });
    var line = pathFrom(pts);
    var area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (GH - PAD.b) +
      ' L' + pts[0][0].toFixed(1) + ' ' + (GH - PAD.b) + ' Z';
    return { line: line, area: area, max: max, span: span };
  }

  function graphSvg(result) {
    var pts = result.decrease.concat(result.increase).filter(function (p) { return p.frequency; });
    var spec = spectrumPath(result.spectrum);
    var curve = curvePoints(pts);

    var s = '';
    s += '<svg class="pq-graph-svg" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" role="img" ' +
      'aria-label="Frequency graph of the analyzed vocal with recommended decrease and increase points">';

    // grid
    s += '<g class="pq-grid">';
    TICKS.forEach(function (f) {
      var x = xOf(f).toFixed(1);
      s += '<line x1="' + x + '" y1="' + PAD.t + '" x2="' + x + '" y2="' + (GH - PAD.b) + '"/>';
    });
    for (var g = -6; g <= 6; g += 2) {
      var y = yOf(g).toFixed(1);
      s += '<line class="' + (g === 0 ? 'pq-zero' : '') + '" x1="' + PAD.l + '" y1="' + y + '" x2="' + (GW - PAD.r) + '" y2="' + y + '"/>';
    }
    s += '</g>';

    // measured spectrum
    if (spec.area) {
      s += '<path class="pq-spec-area" d="' + spec.area + '"/>';
      s += '<path class="pq-spec-line" d="' + spec.line + '"/>';
    }

    // recommendation curve, split above/below 0 for colour
    s += '<path class="pq-curve" d="' + pathFrom(curve) + '"/>';

    // axis labels
    s += '<g class="pq-axis">';
    TICKS.forEach(function (f) {
      s += '<text x="' + xOf(f).toFixed(1) + '" y="' + (GH - PAD.b + 20) + '" text-anchor="middle">' + tickLabel(f) + '</text>';
    });
    for (var g2 = -6; g2 <= 6; g2 += 2) {
      s += '<text x="' + (PAD.l - 8) + '" y="' + (yOf(g2) + 4).toFixed(1) + '" text-anchor="end">' +
        (g2 > 0 ? '+' : '') + g2 + '</text>';
    }
    s += '</g>';

    // unchanged markers on the 0 dB line
    result.unchanged.forEach(function (u) {
      if (!u.frequency) return;
      s += '<circle class="pq-pt pq-pt-flat" data-kind="unchanged" data-id="' + escapeHtml(u.id) + '" ' +
        'cx="' + xOf(u.frequency).toFixed(1) + '" cy="' + yOf(0).toFixed(1) + '" r="4.5" tabindex="0"/>';
    });

    // detected points
    pts.forEach(function (p) {
      var x = xOf(p.frequency), y = yOf(Math.max(-DBMAX, Math.min(DBMAX, p.gain)));
      var cls = p.status === 'decrease' ? 'pq-pt-down' : 'pq-pt-up';
      if (p.range && p.range.length === 2) {
        s += '<rect class="pq-range ' + cls + '-range" x="' + xOf(p.range[0]).toFixed(1) + '" y="' + PAD.t +
          '" width="' + Math.max(2, xOf(p.range[1]) - xOf(p.range[0])).toFixed(1) + '" height="' + (GH - PAD.t - PAD.b) + '"/>';
      }
      s += '<line class="pq-stem ' + cls + '-stem" x1="' + x.toFixed(1) + '" y1="' + yOf(0).toFixed(1) +
        '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      s += '<circle class="pq-pt ' + cls + '" data-kind="' + p.status + '" data-id="' + escapeHtml(p.id) + '" ' +
        'cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" tabindex="0" role="button" ' +
        'aria-label="' + escapeHtml(p.characteristic + ' ' + hz(p.frequency) + ' ' + gain(p.gain)) + '"/>';
      s += '<text class="pq-pt-label" x="' + x.toFixed(1) + '" y="' + (p.status === 'decrease' ? y + 22 : y - 13).toFixed(1) +
        '" text-anchor="middle">' + escapeHtml(p.characteristic) + '</text>';
    });

    s += '</svg>';
    return s;
  }

  function tooltipHtml(item) {
    if (!item) return '';
    if (item.status === 'unchanged') {
      return '<h5>' + escapeHtml(item.characteristic) + '</h5>' +
        '<dl><dt>Status</dt><dd>Balanced — leave alone</dd>' +
        (item.frequency ? '<dt>Centre of region</dt><dd>' + hz(item.frequency) + '</dd>' : '') +
        '<dt>Measured deviation</dt><dd>' + gain(item.deviation) + '</dd></dl>';
    }
    var h = '<h5>' + escapeHtml(item.characteristic) + '</h5><dl>';
    h += '<dt>Measured frequency</dt><dd>' + hz(item.frequency) + '</dd>';
    if (item.range) h += '<dt>Detected range</dt><dd>' + hz(item.range[0]) + ' – ' + hz(item.range[1]) + '</dd>';
    h += '<dt>Measured deviation</dt><dd>' + gain(item.measuredDeviation) + '</dd>';
    h += '<dt>Recommended start</dt><dd class="pq-tt-strong">' + gain(item.gain) + '</dd>';
    if (item.gainRange) {
      var a = Math.min(item.gainRange[0], item.gainRange[1]), b = Math.max(item.gainRange[0], item.gainRange[1]);
      h += '<dt>Working range</dt><dd>' + gain(a) + ' to ' + gain(b) + '</dd>';
    }
    if (item.q) h += '<dt>Suggested Q</dt><dd>' + item.q.toFixed(1) + '</dd>';
    if (item.severity) h += '<dt>Severity</dt><dd>' + escapeHtml(item.severity) + '</dd>';
    h += '<dt>Confidence</dt><dd>' + pct(item.confidence) + '</dd>';
    h += '<dt>Behaviour</dt><dd>' + escapeHtml(item.persistence || '—') + '</dd>';
    h += '</dl>';
    return h;
  }

  function wireGraph(root, result) {
    var host = root.querySelector('.pq-graph-host');
    var tip = root.querySelector('#pq-tooltip');
    if (!host || !tip) return;
    var byId = {};
    result.decrease.concat(result.increase).concat(result.unchanged).forEach(function (i) { byId[i.id] = i; });

    function show(circle) {
      var item = byId[circle.getAttribute('data-id')];
      if (!item) return;
      tip.innerHTML = tooltipHtml(item);
      tip.hidden = false;
      var hostRect = host.getBoundingClientRect();
      var r = circle.getBoundingClientRect();
      var x = r.left - hostRect.left + r.width / 2;
      var y = r.top - hostRect.top;
      tip.style.left = '0px'; tip.style.top = '0px';
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(6, Math.min(hostRect.width - tw - 6, x - tw / 2)) + 'px';
      tip.style.top = Math.max(6, y - th - 12) + 'px';
      host.querySelectorAll('.pq-pt.is-active').forEach(function (c) { c.classList.remove('is-active'); });
      circle.classList.add('is-active');
      var card = root.querySelector('[data-card="' + item.id + '"]');
      root.querySelectorAll('.pq-item.is-active').forEach(function (c) { c.classList.remove('is-active'); });
      if (card) card.classList.add('is-active');
    }
    function hide() {
      tip.hidden = true;
      host.querySelectorAll('.pq-pt.is-active').forEach(function (c) { c.classList.remove('is-active'); });
    }

    host.addEventListener('mouseover', function (e) {
      if (e.target.classList && e.target.classList.contains('pq-pt')) show(e.target);
    });
    host.addEventListener('focusin', function (e) {
      if (e.target.classList && e.target.classList.contains('pq-pt')) show(e.target);
    });
    host.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('pq-pt')) { show(e.target); e.stopPropagation(); }
      else hide();
    });
    host.addEventListener('mouseleave', hide);
    host.addEventListener('focusout', function (e) {
      if (!host.contains(e.relatedTarget)) hide();
    });
  }

  // ─── report rendering ─────────────────────────────────────────────────────
  function sourceCard(src, result) {
    var bits = [];
    bits.push(['Duration', dur(src.duration)]);
    bits.push(['Sample rate', (src.sampleRate / 1000).toFixed(src.sampleRate % 1000 ? 1 : 0) + ' kHz']);
    bits.push(['Channels', src.channelLabel]);
    if (src.bitDepth) bits.push(['Bit depth', src.bitDepth + '-bit']);
    bits.push(['Format', src.format]);
    if (result.voice.fundamental) {
      bits.push(['Fundamental', hz(result.voice.fundamental) + ' · ' + result.voice.label]);
    } else {
      bits.push(['Fundamental', 'Not stable']);
    }
    bits.push(['Delivery', result.voice.delivery]);
    bits.push(['Frames analyzed', result.analysis.activeFrames + ' of ' + result.analysis.frames]);

    var h = '<section class="panel pq-file">';
    h += '<div class="pq-file-head"><h3>' + escapeHtml(src.fileName) + '</h3>' +
      '<span class="hint">Analyzed locally · file never left your browser</span></div>';
    h += '<dl class="pq-file-grid">';
    bits.forEach(function (b) {
      h += '<div><dt>' + escapeHtml(b[0]) + '</dt><dd>' + escapeHtml(b[1]) + '</dd></div>';
    });
    h += '</dl>';
    if (src.analyzedSeconds) {
      h += '<p class="hint">Long file — the middle ' + src.analyzedSeconds + ' s were analyzed.</p>';
    }
    h += '</section>';
    return h;
  }

  function warningsHtml(result) {
    if (!result.warnings.length) return '';
    var h = '<div class="pq-warnings">';
    result.warnings.forEach(function (w) {
      h += '<div class="pq-warn pq-warn-' + escapeHtml(w.level) + '">' + escapeHtml(w.text) + '</div>';
    });
    h += '</div>';
    return h;
  }

  function priorityHtml(result) {
    if (!result.priorities.length) {
      return '<section class="panel pq-priority pq-priority-clean">' +
        '<h3>Top priorities</h3>' +
        '<p>Nothing measured far enough from this vocal’s own spectral trend to recommend a move. ' +
        'Treat the take as balanced and mix by ear.</p></section>';
    }
    var h = '<section class="panel pq-priority"><h3>Top priorities — address in this order</h3><ol class="pq-priority-list">';
    result.priorities.forEach(function (p) {
      h += '<li data-jump="' + escapeHtml(p.id) + '">' +
        '<span class="pq-pri-name">' + escapeHtml(p.characteristic) + '</span>' +
        '<span class="pq-pri-f">' + hz(p.frequency) + '</span>' +
        '<span class="pq-pri-g ' + (p.direction === 'decrease' ? 'down' : 'up') + '">' + gain(p.gain) + '</span>' +
        (p.severity ? '<span class="pq-badge ' + sevClass(p.severity) + '">' + escapeHtml(p.severity) + '</span>' : '<span class="pq-badge pq-sev-boost">Opportunity</span>') +
        '<span class="pq-pri-c">' + pct(p.confidence) + ' conf.</span>' +
        '</li>';
    });
    h += '</ol></section>';
    return h;
  }

  function itemHtml(item) {
    var down = item.status === 'decrease';
    var h = '<article class="pq-item ' + (down ? 'pq-down' : 'pq-up') + '" data-card="' + escapeHtml(item.id) + '">';
    h += '<header class="pq-item-head">';
    h += '<span class="pq-item-icon" aria-hidden="true">' + (down ? '🔻' : '🔺') + '</span>';
    h += '<h4>' + escapeHtml(item.characteristic) + '</h4>';
    h += '<span class="pq-item-freq">' + hz(item.frequency) + '</span>';
    h += '<span class="pq-item-gain">' + gain(item.gain) + '</span>';
    h += '</header>';

    h += '<dl class="pq-item-grid">';
    if (item.range) h += '<div><dt>Detected range</dt><dd>' + hz(item.range[0]) + ' – ' + hz(item.range[1]) + '</dd></div>';
    h += '<div><dt>Measured deviation</dt><dd>' + gain(item.measuredDeviation) + '</dd></div>';
    h += '<div><dt>Recommended start</dt><dd class="pq-strong">' + gain(item.gain) + '</dd></div>';
    if (item.gainRange) {
      var a = Math.min(item.gainRange[0], item.gainRange[1]), b = Math.max(item.gainRange[0], item.gainRange[1]);
      h += '<div><dt>Working range</dt><dd>' + gain(a) + ' to ' + gain(b) + '</dd></div>';
    }
    if (item.q) h += '<div><dt>Suggested Q</dt><dd>' + item.q.toFixed(1) + '</dd></div>';
    h += '<div><dt>Confidence</dt><dd>' + pct(item.confidence) + '</dd></div>';
    if (item.severity) h += '<div><dt>Severity</dt><dd><span class="pq-badge ' + sevClass(item.severity) + '">' + escapeHtml(item.severity) + '</span></dd></div>';
    h += '<div><dt>Behaviour</dt><dd>' + escapeHtml(item.persistence) + '</dd></div>';
    h += '</dl>';

    h += '<p class="pq-item-why">' + escapeHtml(item.explanation) + '</p>';
    if (item.alsoMatched && item.alsoMatched.length) {
      h += '<p class="hint">Also covers: ' + escapeHtml(item.alsoMatched.join(', ')) + '</p>';
    }
    h += '</article>';
    return h;
  }

  function emptySection(text) {
    return '<p class="pq-empty">' + escapeHtml(text) + '</p>';
  }

  function render(bundle) {
    var src = bundle.source, r = bundle.result;
    var h = '';

    h += '<div class="pq-report">';
    h += sourceCard(src, r);
    h += warningsHtml(r);

    // graph
    h += '<section class="panel pq-graph-card">';
    h += '<div class="pq-graph-head"><h3>Frequency &amp; EQ recommendation graph</h3>' +
      '<span class="hint">Measured from this recording — hover or tap a point</span></div>';
    h += '<div class="pq-graph-host">' + graphSvg(r) + '<div class="pq-tooltip" id="pq-tooltip" hidden></div></div>';
    h += '<div class="pq-legend">' +
      '<span class="pq-lg pq-lg-spec">Actual spectrum</span>' +
      '<span class="pq-lg pq-lg-down">Decrease</span>' +
      '<span class="pq-lg pq-lg-up">Increase</span>' +
      '<span class="pq-lg pq-lg-flat">Unchanged (0 dB)</span>' +
      '<span class="pq-lg pq-lg-curve">Recommended curve</span>' +
      '</div>';
    h += '<p class="hint pq-graph-note">Visualization only — nothing here changes your audio. ' +
      'The dB axis is the recommended change; the grey shape is the measured spectrum of this take.</p>';
    h += '</section>';

    h += priorityHtml(r);

    // decrease
    h += '<section class="pq-section pq-sec-down"><h3><span aria-hidden="true">🔻</span> Decrease</h3>';
    h += r.decrease.length
      ? '<div class="pq-items">' + r.decrease.map(itemHtml).join('') + '</div>'
      : emptySection('No excess energy measured beyond this vocal’s own spectral trend. Nothing to cut.');
    h += '</section>';

    // increase
    h += '<section class="pq-section pq-sec-up"><h3><span aria-hidden="true">🔺</span> Increase</h3>';
    h += r.increase.length
      ? '<div class="pq-items">' + r.increase.map(itemHtml).join('') + '</div>'
      : emptySection('No region measured low enough against this vocal’s own trend to justify a boost.');
    h += '</section>';

    // unchanged
    h += '<section class="pq-section pq-sec-flat"><h3><span aria-hidden="true">🟢</span> Unchanged</h3>';
    if (r.unchanged.length) {
      h += '<p class="hint">Measured within ±1.1 dB of this vocal’s own spectral trend — don’t touch these unless there is an artistic reason.</p>';
      h += '<ul class="pq-flat-list">';
      r.unchanged.forEach(function (u) {
        h += '<li data-card="' + escapeHtml(u.id) + '"><span class="pq-flat-name">' + escapeHtml(u.characteristic) + '</span>' +
          '<span class="pq-flat-ok">✓ Balanced</span>' +
          '<span class="pq-flat-m">' + (u.frequency ? hz(u.frequency) + ' · ' : '') + gain(u.deviation) + ' vs trend</span></li>';
      });
      h += '</ul>';
    } else {
      h += emptySection('No region measured close enough to the trend to be called balanced.');
    }
    h += '</section>';

    // not detected
    h += '<section class="pq-section pq-sec-none"><h3><span aria-hidden="true">⚪</span> Not detected</h3>';
    if (r.notDetected.length) {
      h += '<ul class="pq-none-list">';
      r.notDetected.forEach(function (n) {
        h += '<li><span class="pq-none-name">' + escapeHtml(n.characteristic) + '</span>' +
          '<span class="pq-none-why">' + escapeHtml(n.insufficient ? 'Insufficient confidence — ' + n.reason : n.reason) + '</span></li>';
      });
      h += '</ul>';
    } else {
      h += emptySection('Every characteristic produced a measurable reading.');
    }
    h += '</section>';

    // measurement footer
    h += '<section class="panel pq-meta"><h3>How this was measured</h3><dl class="pq-file-grid">';
    [
      ['Analysis frames', r.analysis.activeFrames + ' voiced of ' + r.analysis.frames + ' across the take'],
      ['FFT size', r.analysis.fftSize + ' pts · ' + r.analysis.bandsPerOctave + ' bands/octave'],
      ['Spectral tilt', gain(r.analysis.tiltDbPerOctave) + ' / octave (this vocal’s own trend)'],
      ['Spectral centroid', hz(r.quality.centroid)],
      ['Signal-to-noise', r.quality.snr.toFixed(0) + ' dB'],
      ['Content bandwidth', r.quality.hfCutoff ? 'up to ' + hz(r.quality.hfCutoff) : 'full band'],
      ['Silence gate', r.analysis.gateDb.toFixed(0) + ' dBFS RMS']
    ].forEach(function (b) {
      h += '<div><dt>' + escapeHtml(b[0]) + '</dt><dd>' + escapeHtml(b[1]) + '</dd></div>';
    });
    h += '</dl>';
    h += '<p class="hint">These are <strong>measurements plus a recommended starting adjustment</strong>, not the single correct EQ. ' +
      'Dial the suggested move in your DAW, then trust your ears and the arrangement.</p>';
    h += '<div class="controls"><button class="btn" id="pq-export" type="button">Export analysis (JSON)</button></div>';
    h += '</section>';

    h += '</div>';

    resultsEl.innerHTML = h;
    wireGraph(resultsEl, r);

    // priority list → scroll to card
    resultsEl.querySelectorAll('[data-jump]').forEach(function (li) {
      li.addEventListener('click', function () {
        var card = resultsEl.querySelector('[data-card="' + li.getAttribute('data-jump') + '"]');
        if (!card) return;
        resultsEl.querySelectorAll('.pq-item.is-active').forEach(function (c) { c.classList.remove('is-active'); });
        card.classList.add('is-active');
        try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { card.scrollIntoView(); }
      });
    });

    var exportBtn = resultsEl.querySelector('#pq-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var payload = JSON.stringify({ source: bundle.source, result: bundle.result }, null, 2);
        var blob = new Blob([payload], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (bundle.source.fileName || 'vocal').replace(/\.[^.]+$/, '') + '-practical-eq.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      });
    }
  }

  // expose a tiny API for smoke tests / other tabs
  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.practicalEq = {
    analyzeFile: acceptFile,
    getResult: function () { return current; }
  };
})();
