/**
 * mix-check-app.js — Mix Check tab controller.
 * Runs MASTER_CHECK.analyzeFile on a mixdown, grades it with MIX_CHECK.assessMix,
 * shows a "ready for mastering?" verdict, and shares a compact summary with the
 * Master Check tab for mix↔master comparison.
 */
'use strict';

(function () {
  var MC = window.MASTER_CHECK;
  var MX = window.MIX_CHECK;
  if (!MC || !MX) {
    console.error('MASTER_CHECK / MIX_CHECK engines missing');
    return;
  }

  var dropzone = document.getElementById('mx-dropzone');
  var fileInput = document.getElementById('mx-file');
  var browseBtn = document.getElementById('mx-browse');
  var clearBtn = document.getElementById('mx-clear');
  var genreEl = document.getElementById('mx-genre');
  var progressWrap = document.getElementById('mx-progress-wrap');
  var progressBar = document.getElementById('mx-progress-bar');
  var progressLabel = document.getElementById('mx-progress-label');
  var resultsEl = document.getElementById('mx-results');

  var report = null;
  var url = null;

  // ─── Genre options ───────────────────────────────────────────────────────
  if (genreEl) {
    var ghtml = '';
    Object.keys(MC.GENRE_DR).forEach(function (k) {
      var g = MC.GENRE_DR[k];
      ghtml += '<option value="' + k + '"' + (k === 'general' ? ' selected' : '') + '>' +
        escapeHtml(g.name) + '</option>';
    });
    genreEl.innerHTML = ghtml;
  }

  // ─── File intake ─────────────────────────────────────────────────────────
  function acceptFile(file) {
    if (!file) return;
    if (!/^audio\//.test(file.type) && !/\.(wav|wave|flac|mp3|ogg|opus|aiff|aif|aac|m4a|caf|webm)$/i.test(file.name)) {
      flash('Please drop an audio file (WAV, FLAC, MP3, AIFF, OGG…).');
      return;
    }
    clearResults();
    url = URL.createObjectURL(file);
    progressWrap.hidden = false;
    progressBar.style.width = '0%';
    progressLabel.textContent = 'Analyzing ' + file.name + '…';

    MC.analyzeFile(file, {
      genre: genreEl ? genreEl.value : 'general',
      onProgress: function (p, msg) {
        progressBar.style.width = Math.round(p * 100) + '%';
        progressLabel.textContent = msg + ' — ' + file.name;
      }
    }).then(function (r) {
      report = r;
      render(r);
      window.__mixSummary = MX.summaryOf(r);
      try { sessionStorage.setItem('raaga.lastMixSummary', JSON.stringify(window.__mixSummary)); } catch (e) {}
      progressBar.style.width = '100%';
      progressLabel.textContent = 'Done — ' + file.name;
      setTimeout(function () { progressWrap.hidden = true; }, 700);
    }).catch(function (err) {
      flash('Error: ' + String(err && err.message || err));
      progressWrap.hidden = true;
    });
  }

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      acceptFile(fileInput.files[0]);
      fileInput.value = '';
    });
  }

  if (dropzone) {
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
      acceptFile(e.dataTransfer.files[0]);
    });
    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearResults);
  }

  function clearResults() {
    if (url) { try { URL.revokeObjectURL(url); } catch (e) {} url = null; }
    report = null;
    resultsEl.innerHTML = '';
    progressWrap.hidden = true;
    try { sessionStorage.removeItem('raaga.lastMixSummary'); } catch (e) {}
    window.__mixSummary = null;
  }

  function flash(msg) {
    progressWrap.hidden = false;
    progressBar.style.width = '0%';
    progressLabel.textContent = msg;
    setTimeout(function () { progressWrap.hidden = true; }, 2600);
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  function render(r) {
    var a = MX.assessMix(r);
    var v = a.verdict;
    var html = '';

    html += '<section class="mx-verdict mx-' + v.level + ' panel">';
    html += '<h3>' + escapeHtml(v.title) + '</h3>';
    html += '<p class="mx-sub">' + escapeHtml(v.subtitle) + '</p>';
    if (v.points.length) {
      html += '<ul class="mx-points">';
      v.points.slice(0, 8).forEach(function (p) {
        html += '<li>' + escapeHtml(p) + '</li>';
      });
      if (v.points.length > 8) html += '<li class="hint">+' + (v.points.length - 8) + ' more…</li>';
      html += '</ul>';
    } else {
      html += '<p class="mx-clean">✨ Nothing to fix — great mix.</p>';
    }
    html += '</section>';

    if (url) {
      html += '<section class="mc-player panel">';
      html += '<div class="mc-player-head"><h3>Mix preview</h3><span class="hint">Audio stays in your browser</span></div>';
      html += '<audio id="mx-audio" controls preload="metadata" src="' + url + '" style="width:100%"></audio>';
      html += '</section>';
    }

    // Key numbers
    var n = a.numbers;
    html += '<section class="mx-numbers">';
    html += numCard('Integrated', fmt(n.integrated, 'LUFS'), 'aim −18…−14');
    html += numCard('True Peak', fmt(n.truePeak, 'dBTP'), 'aim ≤ −3');
    html += numCard('DR', fmt(n.dr, 'dB'), 'aim ≥ 8');
    html += numCard('Crest', fmt(n.crest, 'dB'), 'aim ≥ 8');
    html += numCard('Correlation', n.correlation == null ? '—' : n.correlation.toFixed(2), 'aim ≥ 0.5');
    html += numCard('Noise floor', fmt(n.noiseFloor, 'dBFS'), 'aim ≤ −55');
    html += '</section>';

    // Checks
    html += '<section class="mx-checks panel">';
    html += '<h3>Mix targets — ' + a.checks.length + ' checks</h3>';
    html += '<p class="hint">Unlike Master Check, these targets leave headroom for the mastering stage.</p>';
    a.checks.forEach(function (c) {
      html += '<div class="mx-check ' + c.status + '">';
      html += '<span class="mx-ico">' + (c.status === 'pass' ? '🟢' : c.status === 'warn' ? '🟡' : '🔴') + '</span>';
      html += '<div class="mx-c-body">';
      html += '<div class="mx-c-top"><span class="mx-c-name">' + escapeHtml(c.name) + '</span><span class="mx-c-val">' + escapeHtml(c.value) + '</span></div>';
      html += '<div class="mx-c-target">target: ' + escapeHtml(c.target) + '</div>';
      if (c.advice) html += '<div class="mx-c-advice">' + escapeHtml(c.advice) + '</div>';
      html += '</div></div>';
    });
    html += '</section>';

    resultsEl.innerHTML = html;
  }

  function numCard(label, value, aim) {
    return '<div class="mx-num panel"><div class="mx-num-v">' + escapeHtml(value) + '</div>' +
      '<div class="mx-num-l">' + escapeHtml(label) + '</div><div class="mx-num-a">' + escapeHtml(aim) + '</div></div>';
  }

  function fmt(v, unit) {
    if (!isFinite(v)) return '—';
    return v.toFixed(1) + ' ' + unit;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
