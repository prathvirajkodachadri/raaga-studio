/**
 * master-check-app.js — UI controller for Master Check audio QA.
 * Now with exact problem locations: clipping times, true-peak overs,
 * clicks/pops, phase issues, abrupt edges shown as clickable timeline.
 */
'use strict';

(function () {
  var MC = window.MASTER_CHECK;
  if (!MC) {
    console.error('MASTER_CHECK engine missing');
    return;
  }

  var dropzone = document.getElementById('mc-dropzone');
  var fileInput = document.getElementById('mc-file');
  var browseBtn = document.getElementById('mc-browse');
  var clearBtn = document.getElementById('mc-clear');
  var genreEl = document.getElementById('mc-genre');
  var progressWrap = document.getElementById('mc-progress-wrap');
  var progressBar = document.getElementById('mc-progress-bar');
  var progressLabel = document.getElementById('mc-progress-label');
  var dashboard = document.getElementById('mc-dashboard');
  var fileListEl = document.getElementById('mc-file-list');
  var exportJsonBtn = document.getElementById('mc-export-json');
  var exportPdfBtn = document.getElementById('mc-export-pdf');
  var queue = []; // { file, url, report?, status }
  var activeReport = null;
  var activeUrl = null;

  // ─── Genre options ───────────────────────────────────────────────────────
  if (genreEl) {
    var ghtml = '';
    Object.keys(MC.GENRE_DR).forEach(function (k) {
      var g = MC.GENRE_DR[k];
      ghtml += '<option value="' + k + '"' + (k === 'general' ? ' selected' : '') + '>' +
        escapeHtml(g.name) + ' (DR ' + g.min + '–' + g.max + ')</option>';
    });
    genreEl.innerHTML = ghtml;
  }

  // ─── File intake ─────────────────────────────────────────────────────────
  function acceptFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    var audio = files.filter(function (f) {
      return /^audio\//.test(f.type) || /\.(wav|wave|flac|mp3|ogg|opus|aiff|aif|aac|m4a|caf|webm)$/i.test(f.name);
    });
    if (!audio.length) {
      flash('Please drop an audio file (WAV, FLAC, MP3, AIFF, OGG…).');
      return;
    }
    audio.forEach(function (f) {
      var url = URL.createObjectURL(f);
      queue.push({ file: f, url: url, report: null, status: 'queued' });
    });
    renderFileList();
    processQueue();
  }

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      acceptFiles(fileInput.files);
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
      acceptFiles(e.dataTransfer.files);
    });
    dropzone.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      fileInput.click();
    });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      queue.forEach(function (q) { try { URL.revokeObjectURL(q.url); } catch (e) {} });
      queue = [];
      activeReport = null;
      if (activeUrl) { try { URL.revokeObjectURL(activeUrl); } catch (e) {} activeUrl = null; }
      dashboard.innerHTML = '';
      dashboard.hidden = true;
      fileListEl.innerHTML = '';
      progressWrap.hidden = true;
      exportJsonBtn.disabled = true;
      exportPdfBtn.disabled = true;
    });
  }

  var processing = false;
  function processQueue() {
    if (processing) return;
    var next = queue.find(function (q) { return q.status === 'queued'; });
    if (!next) return;
    processing = true;
    next.status = 'running';
    renderFileList();
    progressWrap.hidden = false;
    progressBar.style.width = '0%';
    progressLabel.textContent = 'Analyzing ' + next.file.name + '…';

    MC.analyzeFile(next.file, {
      genre: genreEl ? genreEl.value : 'general',
      onProgress: function (p, msg) {
        progressBar.style.width = Math.round(p * 100) + '%';
        progressLabel.textContent = msg + ' — ' + next.file.name;
      }
    }).then(function (report) {
      report.fileUrl = next.url;
      next.report = report;
      next.status = 'done';
      activeReport = report;
      renderFileList();
      renderDashboard(report);
      exportJsonBtn.disabled = false;
      exportPdfBtn.disabled = false;
      progressBar.style.width = '100%';
      progressLabel.textContent = 'Done — ' + next.file.name;
      setTimeout(function () { progressWrap.hidden = true; }, 800);
      processing = false;
      processQueue();
    }).catch(function (err) {
      next.status = 'error';
      next.error = String(err && err.message || err);
      renderFileList();
      progressLabel.textContent = 'Error: ' + next.error;
      processing = false;
      processQueue();
    });
  }

  function renderFileList() {
    if (!fileListEl) return;
    if (!queue.length) { fileListEl.innerHTML = ''; return; }
    var html = '<div class="mc-files">';
    queue.forEach(function (q, i) {
      var score = q.report ? q.report.overallScore : '—';
      var grade = q.report ? q.report.grade : '—';
      var st = q.status;
      var cls = st === 'done' ? 'done' : st === 'error' ? 'err' : st === 'running' ? 'run' : 'q';
      html += '<button type="button" class="mc-file-chip ' + cls + (q.report === activeReport ? ' active' : '') +
        '" data-idx="' + i + '">' +
        '<span class="nm">' + escapeHtml(q.file.name) + '</span>' +
        '<span class="sc">' + (st === 'done' ? (grade + ' · ' + score) : st) + '</span></button>';
    });
    html += '</div>';
    fileListEl.innerHTML = html;
    fileListEl.querySelectorAll('.mc-file-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = +btn.getAttribute('data-idx');
        if (queue[idx] && queue[idx].report) {
          activeReport = queue[idx].report;
          renderFileList();
          renderDashboard(activeReport);
        }
      });
    });
  }

  // ─── Dashboard render ────────────────────────────────────────────────────
  function renderDashboard(r) {
    dashboard.hidden = false;
    var gCls = 'grade-' + (r.grade || 'F').toLowerCase();
    var html = '';

    // Overview
    html += '<section class="mc-overview">';
    html += '<div class="mc-score-card ' + gCls + '">';
    html += '<div class="mc-grade">' + escapeHtml(r.grade || '—') + '</div>';
    html += '<div class="mc-score-num">' + (r.overallScore != null ? r.overallScore : '—') + '<span>/100</span></div>';
    html += '<div class="mc-grade-label">' + escapeHtml(r.gradeLabel || '') + '</div>';
    html += '</div>';
    html += '<div class="mc-overview-meta">';
    html += '<h3>' + escapeHtml(r.fileName || 'Untitled') + '</h3>';
    html += '<div class="mc-meta-grid">';
    html += metaItem('Format', (r.format && r.format.formatName) || '—');
    html += metaItem('Duration', MC.fmtDur(r.duration));
    html += metaItem('Sample rate', r.sampleRate ? (r.sampleRate / 1000).toFixed(1) + ' kHz' : '—');
    html += metaItem('Channels', r.channelCount === 1 ? 'Mono' : r.channelCount === 2 ? 'Stereo' : (r.channelCount + ' ch'));
    html += metaItem('Size', r.format ? MC.fmtBytes(r.format.size) : '—');
    html += metaItem('Bit depth', r.format && r.format.bitDepth != null ? r.format.bitDepth + '-bit' : 'decoded float32');
    if (r.loudness) {
      html += metaItem('Integrated', MC.fmtLufs(r.loudness.integrated));
      html += metaItem('True Peak', MC.fmtDb(r.truePeak) + 'TP @ ' + MC.fmtDur((r.truePeakDetailed && r.truePeakDetailed.peakTime) || 0));
      html += metaItem('DR', r.levels ? r.levels.dynamicRange.toFixed(1) + ' dB' : '—');
      html += metaItem('LRA', isFinite(r.loudness.lra) ? r.loudness.lra.toFixed(1) + ' LU' : '—');
    }
    html += '</div>';
    html += '<div class="mc-summary-pills">';
    html += '<span class="pill pass">🟢 ' + (r.summary ? r.summary.pass : 0) + ' passed</span>';
    html += '<span class="pill warn">🟡 ' + (r.summary ? r.summary.warn : 0) + ' warnings</span>';
    html += '<span class="pill fail">🔴 ' + (r.summary ? r.summary.fail : 0) + ' failed</span>';
    html += '</div>';
    html += '</div></section>';

    // Release-ready checklist (new in Master Check)
    if (r.release) {
      var rel = r.release;
      var relCls = rel.ready ? 'pass' : (rel.summary.fail === 0 ? 'warn' : 'fail');
      html += '<section class="mc-release panel ' + relCls + '">';
      html += '<div class="mc-rel-head">';
      html += '<h3>Release-ready checklist</h3>';
      html += '<div class="mc-rel-score ' + relCls + '"><b>' + rel.score + '</b><span>/100</span></div>';
      html += '</div>';
      html += '<div class="mc-rel-bar"><div class="mc-rel-fill ' + relCls + '" style="width:' + clamp(rel.score, 0, 100) + '%"></div></div>';
      html += '<p class="mc-rel-status">' + (rel.ready
        ? '✅ This master is ready to release.'
        : rel.summary.fail === 0
          ? '⚠️ Minor gaps — address the warnings before distributing.'
          : '🔴 Not release-ready — ' + rel.summary.fail + ' must-fix item(s).') + '</p>';
      html += '<div class="mc-rel-grid">';
      rel.checks.forEach(function (c) {
        html += '<div class="mc-rel-item ' + c.status + '">';
        html += '<span class="mc-rel-ico">' + (c.status === 'pass' ? '🟢' : c.status === 'warn' ? '🟡' : '🔴') + '</span>';
        html += '<div class="mc-rel-body"><div class="mc-rel-name">' + escapeHtml(c.name) + '</div>';
        html += '<div class="mc-rel-val">' + escapeHtml(String(c.value)) + '</div>';
        if (c.advice) html += '<div class="mc-rel-advice">' + escapeHtml(c.advice) + '</div>';
        html += '</div></div>';
      });
      html += '</div></section>';
    }

    // Audio player with seek help — exact problem audition
    if (r.fileUrl || r.duration) {
      html += '<section class="mc-player panel">';
      html += '<div class="mc-player-head"><h3>Preview & Seek to Problem</h3><span class="hint">Click any timestamp to jump — audio stays in browser</span></div>';
      if (r.fileUrl) {
        html += '<audio id="mc-audio" controls preload="metadata" src="' + r.fileUrl + '" style="width:100%"></audio>';
      } else {
        html += '<div class="hint">Audio preview not available for this file.</div>';
      }
      html += '<div class="mc-player-legend"><span class="pl"><i class="dot clip"></i> Clip</span><span class="pl"><i class="dot tp"></i> True Peak</span><span class="pl"><i class="dot click"></i> Click</span><span class="pl"><i class="dot phase"></i> Phase</span><span class="pl"><i class="dot abrupt"></i> Abrupt</span></div>';
      html += '</section>';
    }

    // Problem timeline — exact locations
    var markers = r.markers || [];
    if (markers.length) {
      html += '<section class="mc-timeline panel">';
      html += '<div class="mc-viz-head"><h3>Exact Problem Locations (' + markers.length + ')</h3><span class="hint">Click time to seek in preview & waveform</span></div>';
      html += '<div class="mc-tl-track" id="mc-tl-track"><div class="tl-bg"></div>';
      // position markers on timeline
      markers.forEach(function (m) {
        var pct = clamp((m.time / Math.max(r.duration, 0.001)) * 100, 0, 100);
        html += '<button type="button" class="tl-marker ' + m.type + ' ' + m.severity + '" style="left:' + pct + '%" data-time="' + m.time + '" title="' + escapeHtml(m.label + ' @ ' + MC.fmtDur(m.time)) + '"><span class="tl-tip">' + escapeHtml(m.label) + '</span></button>';
      });
      html += '</div>';
      html += '<div class="mc-tl-list">';
      // group by type
      var grouped = {};
      markers.forEach(function (m) { (grouped[m.type] = grouped[m.type] || []).push(m); });
      var order = ['clip', 'truepeak', 'click', 'phase', 'abrupt-start', 'abrupt-end'];
      order.forEach(function (type) {
        var list = grouped[type] || [];
        if (!list.length) return;
        list.sort(function (a, b) { return a.time - b.time; });
        html += '<div class="tl-group"><span class="tl-glabel">' + typeLabel(type) + ' — ' + list.length + '</span><div class="tl-tags">';
        list.slice(0, 30).forEach(function (m) {
          html += '<button class="mc-time-tag ' + m.severity + ' ' + m.type + '" data-time="' + m.time + '">' + MC.fmtDur(m.time) + '</button>';
        });
        if (list.length > 30) html += '<span class="hint">+' + (list.length - 30) + ' more in JSON</span>';
        html += '</div></div>';
      });
      // any other types
      Object.keys(grouped).forEach(function (type) {
        if (order.indexOf(type) >= 0) return;
        var list = grouped[type];
        html += '<div class="tl-group"><span class="tl-glabel">' + typeLabel(type) + ' — ' + list.length + '</span><div class="tl-tags">';
        list.slice(0, 20).forEach(function (m) {
          html += '<button class="mc-time-tag ' + m.severity + '" data-time="' + m.time + '">' + MC.fmtDur(m.time) + '</button>';
        });
        html += '</div></div>';
      });
      html += '</div>';
      html += '</section>';
    } else {
      html += '<section class="mc-timeline panel no-issues"><div class="mc-viz-head"><h3>No localized issues</h3></div><p class="hint">No clipping, true-peak overs, clicks or phase problems detected with sample-accurate location. Clean master!</p></section>';
    }

    // Waveform + spectrogram — now with multi-type markers
    html += '<section class="mc-viz panel">';
    html += '<div class="mc-viz-head"><h3>Waveform & Spectrogram — Problems Marked</h3>';
    html += '<div class="mc-viz-legend"><span class="clip-leg">Clipping</span><span class="tp-leg">True Peak</span><span class="click-leg">Click</span><span class="phase-leg">Phase</span><span class="sil-leg">Silence</span></div></div>';
    html += '<canvas id="mc-wave" class="mc-canvas" height="140"></canvas>';
    html += '<canvas id="mc-spec" class="mc-canvas spec" height="140"></canvas>';
    html += '</section>';

    // Platform comparison
    if (r.platforms && r.platforms.length) {
      html += '<section class="mc-platforms panel">';
      html += '<h3>Platform loudness comparison</h3>';
      html += '<p class="hint">Predicted gain each platform applies after normalization (based on Integrated LUFS).</p>';
      html += '<div class="mc-plat-grid">';
      r.platforms.forEach(function (p) {
        var gain = p.gain;
        var dir = !isFinite(gain) ? 'na' : Math.abs(gain) < 0.5 ? 'ok' : gain > 0 ? 'up' : 'down';
        html += '<div class="mc-plat ' + dir + '">';
        html += '<div class="pn">' + escapeHtml(p.name) + '</div>';
        html += '<div class="pt">Target ' + escapeHtml(p.targetLabel) + '</div>';
        html += '<div class="pa">' + escapeHtml(p.action) + '</div>';
        if (isFinite(gain)) {
          html += '<div class="pg-bar"><div class="pg-fill" style="width:' +
            clamp(Math.abs(gain) / 14 * 100, 4, 100) + '%"></div></div>';
        }
        html += '</div>';
      });
      html += '</div></section>';
    }

    // Mix ↔ Master comparison (uses the last mix analyzed in the Mix Check tab)
    var mixSum = window.__mixSummary || null;
    if (!mixSum) {
      try { mixSum = JSON.parse(sessionStorage.getItem('raaga.lastMixSummary') || 'null'); } catch (e) { mixSum = null; }
    }
    if (mixSum && isFinite(r.loudness.integrated)) {
      var cmpRows = [
        { label: 'Integrated LUFS', mix: mixSum.integrated, master: r.loudness.integrated,
          fmt: function (v) { return isFinite(v) ? v.toFixed(1) + ' LUFS' : '—'; },
          exp: 'master louder (higher)', wantUp: true },
        { label: 'True Peak (dBTP)', mix: mixSum.truePeak, master: r.truePeak,
          fmt: function (v) { return isFinite(v) ? v.toFixed(1) + ' dBTP' : '—'; },
          exp: 'master louder but ≤ −1', wantUp: true },
        { label: 'Dynamic range (DR)', mix: mixSum.dr, master: r.levels ? r.levels.dynamicRange : null,
          fmt: function (v) { return isFinite(v) ? v.toFixed(1) + ' dB' : '—'; },
          exp: 'mix more dynamic (mastering compresses)', wantUp: false },
        { label: 'Crest factor', mix: mixSum.crest, master: r.levels ? r.levels.crestFactor : null,
          fmt: function (v) { return isFinite(v) ? v.toFixed(1) + ' dB' : '—'; },
          exp: 'mix has more transient peaks', wantUp: false },
        { label: 'Stereo correlation', mix: mixSum.correlation, master: r.stereo ? r.stereo.correlation : null,
          fmt: function (v) { return v == null ? '—' : v.toFixed(2); },
          exp: 'similar', wantUp: null }
      ];
      html += '<section class="mc-mixcmp panel">';
      html += '<div class="mc-viz-head"><h3>Mix ↔ Master comparison</h3>' +
        '<span class="hint">From the last Mix Check: ' + escapeHtml(mixSum.fileName || '—') + '</span></div>';
      html += '<p class="hint">Green = change went the expected direction for a mastered track.</p>';
      html += '<table class="mc-cmp-table"><thead><tr><th>Metric</th><th>Mix</th><th>Master</th><th>Change</th><th>Expected</th></tr></thead><tbody>';
      cmpRows.forEach(function (row) {
        var mixV = row.mix, masV = row.master;
        var delta = (isFinite(mixV) && isFinite(masV)) ? (masV - mixV) : null;
        var ok = null;
        if (delta != null && row.wantUp != null) {
          ok = row.wantUp ? delta >= 0 : delta <= 0;
        }
        html += '<tr><td>' + escapeHtml(row.label) + '</td>' +
          '<td class="v">' + escapeHtml(row.fmt(mixV)) + '</td>' +
          '<td class="v">' + escapeHtml(row.fmt(masV)) + '</td>' +
          '<td class="' + (ok == null ? '' : ok ? 'delta-ok' : 'delta-odd') + '">' +
          (delta == null ? '—' : (delta >= 0 ? '▲ +' : '▼ ') + Math.abs(delta).toFixed(1)) + '</td>' +
          '<td class="exp">' + escapeHtml(row.exp) + '</td></tr>';
      });
      html += '</tbody></table></section>';
    }

    // Category scores strip
    if (r.categories) {
      html += '<section class="mc-cat-strip">';
      r.categories.forEach(function (c) {
        var st = c.score >= 90 ? 'pass' : c.score >= 60 ? 'warn' : 'fail';
        html += '<div class="mc-cat-chip ' + st + '"><span class="cn">' + escapeHtml(c.name) +
          '</span><span class="cs">' + Math.round(c.score) + '</span></div>';
      });
      html += '</section>';
    }

    // Detailed accordion — now shows exact times per check
    html += '<section class="mc-details">';
    html += '<h2 class="sec">Detailed report — exact locations where available</h2>';
    if (r.categories) {
      r.categories.forEach(function (cat, ci) {
        var open = ci < 3 ? ' open' : '';
        var st = cat.score >= 90 ? 'pass' : cat.score >= 60 ? 'warn' : 'fail';
        html += '<details class="mc-acc ' + st + '"' + open + '>';
        html += '<summary><span class="dot"></span><span class="t">' + escapeHtml(cat.name) +
          '</span><span class="badge">' + Math.round(cat.score) + ' · ' + cat.grade + '</span></summary>';
        html += '<div class="body">';
        cat.checks.forEach(function (ch) {
          html += '<div class="mc-check ' + ch.status + '">';
          html += '<div class="mc-check-top">';
          html += '<span class="st-icon">' + statusIcon(ch.status) + '</span>';
          html += '<span class="cn">' + escapeHtml(ch.name) + '</span>';
          html += '<span class="cv">' + escapeHtml(String(ch.value)) + '</span>';
          html += '</div>';
          if (ch.detail) html += '<p class="cd">' + escapeHtml(ch.detail) + '</p>';
          if (ch.locationSummary) html += '<p class="cd loc"><strong>Exact:</strong> ' + escapeHtml(ch.locationSummary) + '</p>';
          if (ch.locations && ch.locations.length) {
            html += '<div class="loc-list">';
            ch.locations.slice(0, 24).forEach(function (loc) {
              var t = loc.time;
              if (!isFinite(t)) return;
              html += '<button class="mc-time-tag sm ' + (loc.type || '') + ' ' + ch.status + '" data-time="' + t + '" title="' + escapeHtml((loc.label || '') + ' @ ' + MC.fmtDur(t)) + '">' + MC.fmtDur(t) + (loc.label ? ' ' + escapeHtml(loc.label).slice(0, 22) : '') + '</button>';
            });
            if (ch.locations.length > 24) html += '<span class="hint">+' + (ch.locations.length - 24) + ' more</span>';
            html += '</div>';
          }
          if (ch.meter) html += renderMeter(ch.meter, ch.status);
          if (ch.recommendation) {
            html += '<p class="crec">💡 ' + escapeHtml(ch.recommendation) + '</p>';
          }
          html += '</div>';
        });
        if (cat.id === 'frequency' && r.spectrum && r.spectrum.curve) {
          html += '<canvas class="mc-canvas spectrum-curve" id="mc-spectrum-curve" height="160"></canvas>';
        }
        if (cat.id === 'stereo' && r.stereo && r.stereo.correlationSeries && r.stereo.correlationSeries.length) {
          html += '<canvas class="mc-canvas corr-curve" id="mc-corr-curve" height="80"></canvas>';
        }
        html += '</div></details>';
      });
    }
    html += '</section>';

    dashboard.innerHTML = html;

    // Bind seekers
    var audioEl = document.getElementById('mc-audio');
    dashboard.querySelectorAll('[data-time]').forEach(function (el) {
      el.addEventListener('click', function () {
        var t = parseFloat(el.getAttribute('data-time'));
        if (!isFinite(t)) return;
        if (audioEl) {
          try { audioEl.currentTime = t; audioEl.play().catch(function () {}); } catch (e) {}
          audioEl.focus();
        }
        // visual scroll to waveform
        var wave = document.getElementById('mc-wave');
        if (wave) wave.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // update playhead in waveform
        highlightTime(t, r.duration);
      });
    });

    // Draw canvases after DOM insert
    requestAnimationFrame(function () {
      drawWaveform(document.getElementById('mc-wave'), r);
      drawSpectrogram(document.getElementById('mc-spec'), r);
      var sc = document.getElementById('mc-spectrum-curve');
      if (sc) drawSpectrumCurve(sc, r);
      var cc = document.getElementById('mc-corr-curve');
      if (cc) drawCorr(cc, r);

      if (audioEl) {
        audioEl.addEventListener('timeupdate', function () {
          highlightTime(audioEl.currentTime, r.duration);
        });
      }
    });
  }

  function typeLabel(type) {
    var map = {
      'clip': '🔴 Clipping',
      'truepeak': '🟠 True Peak over 0 dBTP',
      'click': '🟡 Click / Pop',
      'phase': '🟣 Phase / Out-of-phase',
      'abrupt-start': '⚠️ Abrupt start',
      'abrupt-end': '⚠️ Abrupt end',
      'silence': 'Silence',
      'abrupt': 'Abrupt'
    };
    return map[type] || type;
  }

  var lastHighlightT = -1;
  function highlightTime(currentT, duration) {
    // draw playhead over waveform? We store and redraw cheaply — update CSS track if exists?
    // Simpler: move a overlay div if we find tl-track
    var track = document.getElementById('mc-tl-track');
    if (!track) return;
    var existing = track.querySelector('.tl-playhead');
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'tl-playhead';
      track.appendChild(existing);
    }
    var pct = clamp((currentT / Math.max(duration, 0.001)) * 100, 0, 100);
    existing.style.left = pct + '%';
    lastHighlightT = currentT;
  }

  function metaItem(k, v) {
    return '<div class="mi"><span class="k">' + escapeHtml(k) + '</span><span class="v">' + escapeHtml(String(v)) + '</span></div>';
  }

  function statusIcon(st) {
    if (st === 'pass') return '🟢';
    if (st === 'warn') return '🟡';
    return '🔴';
  }

  function renderMeter(m, status) {
    var min = m.min, max = m.max, val = m.value;
    if (!isFinite(val)) return '';
    var pct = clamp((val - min) / (max - min) * 100, 0, 100);
    var html = '<div class="mc-meter ' + status + '">';
    html += '<div class="track"><div class="fill" style="width:' + pct + '%"></div>';
    if (m.limit != null) {
      var lp = clamp((m.limit - min) / (max - min) * 100, 0, 100);
      html += '<div class="limit" style="left:' + lp + '%" title="limit"></div>';
    }
    if (m.limitLow != null) {
      var lp2 = clamp((m.limitLow - min) / (max - min) * 100, 0, 100);
      html += '<div class="limit low" style="left:' + lp2 + '%"></div>';
    }
    if (m.ok != null) {
      var op = clamp((m.ok - min) / (max - min) * 100, 0, 100);
      html += '<div class="limit ok" style="left:' + op + '%"></div>';
    }
    html += '</div>';
    html += '<div class="mlab"><span>' + min + '</span><span>' +
      (typeof val === 'number' ? val.toFixed(1) : val) + (m.unit ? ' ' + m.unit : '') +
      '</span><span>' + max + '</span></div>';
    html += '</div>';
    return html;
  }

  // ─── Canvas drawings ─────────────────────────────────────────────────────
  function fitCanvas(canvas) {
    if (!canvas) return null;
    var parent = canvas.parentElement;
    var w = parent ? parent.clientWidth - 28 : 800;
    var dpr = window.devicePixelRatio || 1;
    var h = canvas.height;
    canvas.width = Math.floor(w * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function drawWaveform(canvas, r) {
    var f = fitCanvas(canvas);
    if (!f || !r.waveform || !r.waveform.length) return;
    var ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1613';
    ctx.fillRect(0, 0, w, h);

    var mid = h / 2;
    var peaks = r.waveform;
    var n = peaks.length;
    var duration = r.duration || 1;

    // silence regions tint
    if (r.silence) {
      ctx.fillStyle = 'rgba(123,196,127,0.08)';
      var leadW = (r.silence.leadSec / Math.max(duration, 0.001)) * w;
      var trailW = (r.silence.trailSec / Math.max(duration, 0.001)) * w;
      ctx.fillRect(0, 0, leadW, h);
      ctx.fillRect(w - trailW, 0, trailW, h);
    }

    // phase issue tint
    if (r.stereo && r.stereo.phaseIssueTimes) {
      ctx.fillStyle = 'rgba(169,127,214,0.18)';
      r.stereo.phaseIssueTimes.forEach(function (ph) {
        var x0 = (ph.startTime / duration) * w;
        var x1 = (ph.endTime / duration) * w;
        ctx.fillRect(x0, 0, Math.max(2, x1 - x0), h);
      });
    }

    // markers: clips (red), truepeak (orange), clicks (yellow), abrupt (amber)
    var markers = r.markers || [];
    markers.forEach(function (m) {
      var x = (m.time / Math.max(duration, 0.001)) * w;
      if (m.type === 'clip') {
        ctx.fillStyle = 'rgba(228,87,127,0.75)';
        ctx.fillRect(x, 0, 2.5, h);
      } else if (m.type === 'truepeak') {
        ctx.fillStyle = 'rgba(224,179,106,0.9)';
        ctx.fillRect(x, 0, 2, h);
        // little triangle top
        ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 0); ctx.lineTo(x, 8); ctx.fill();
      } else if (m.type === 'click') {
        ctx.fillStyle = 'rgba(224,200,90,0.95)';
        ctx.beginPath(); ctx.arc(x, 10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x, 10, 1, h - 20);
      } else if (m.type.indexOf('abrupt') === 0) {
        ctx.fillStyle = 'rgba(255,220,100,0.6)';
        ctx.fillRect(x, 0, 2, h);
      }
    });

    // legacy clipping positions (redundant)
    if (r.clipping && r.clipping.positions && r.sampleRate && (!markers.length)) {
      ctx.fillStyle = 'rgba(228,87,127,0.55)';
      r.clipping.positions.forEach(function (sample) {
        var x = (sample / (r.sampleRate * duration)) * w;
        ctx.fillRect(x, 0, 2, h);
      });
    }

    // waveform
    ctx.strokeStyle = '#e4577f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var x = (i / n) * w;
      var mn = peaks[i].min;
      var mx = peaks[i].max;
      var y1 = mid - mx * (mid - 8);
      var y2 = mid - mn * (mid - 8);
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();

    // center line
    ctx.strokeStyle = 'rgba(168,159,148,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    if (r.overCompression && r.overCompression.brickwalled) {
      ctx.fillStyle = 'rgba(224,179,106,0.12)';
      ctx.fillRect(0, mid - mid * 0.85, w, mid * 1.7);
    }

    // time labels + playhead if exists
    ctx.fillStyle = 'rgba(168,159,148,0.5)';
    ctx.font = '10px system-ui';
    ctx.fillText('0:00', 4, h - 4);
    ctx.fillText(MC.fmtDur(duration), w - 48, h - 4);

    // clickable overlay hint for seeking — store map for click handler
    canvas.style.cursor = 'crosshair';
    if (!canvas._bound) {
      canvas._bound = true;
      canvas.addEventListener('click', function (e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var t = (x / rect.width) * duration;
        var audioEl = document.getElementById('mc-audio');
        if (audioEl) { try { audioEl.currentTime = t; audioEl.play().catch(function () {}); } catch (e2) {} }
        highlightTime(t, duration);
      });
    }
  }

  function drawSpectrogram(canvas, r) {
    var f = fitCanvas(canvas);
    if (!f || !r.spectrum || !r.spectrum.spectrogram) return;
    var ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    var spec = r.spectrum.spectrogram;
    var rows = spec.rows;
    if (!rows || !rows.length) return;
    var nT = rows.length;
    var nF = rows[0].length;
    var minD = Infinity, maxD = -Infinity;
    for (var t = 0; t < nT; t++) {
      for (var fq = 0; fq < nF; fq++) {
        var v = rows[t][fq];
        if (v < minD) minD = v;
        if (v > maxD) maxD = v;
      }
    }
    if (!isFinite(minD)) return;
    var cellW = w / nT;
    var cellH = h / nF;
    for (var t = 0; t < nT; t++) {
      for (var fq = 0; fq < nF; fq++) {
        var v = rows[t][fq];
        var norm = (v - minD) / Math.max(1e-6, maxD - minD);
        ctx.fillStyle = heatColor(norm);
        ctx.fillRect(t * cellW, h - (fq + 1) * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
    ctx.fillStyle = 'rgba(243,237,230,0.55)';
    ctx.font = '10px system-ui';
    ctx.fillText('20 Hz', 6, h - 4);
    ctx.fillText('20 kHz', 6, 12);
  }

  function heatColor(t) {
    t = clamp(t, 0, 1);
    var r, g, b;
    if (t < 0.25) {
      var u = t / 0.25;
      r = 20 + u * 40; g = 12 + u * 10; b = 30 + u * 80;
    } else if (t < 0.5) {
      var u = (t - 0.25) / 0.25;
      r = 60 + u * 168; g = 22 + u * 30; b = 110 + u * 20;
    } else if (t < 0.75) {
      var u = (t - 0.5) / 0.25;
      r = 228; g = 52 + u * 127; b = 130 - u * 60;
    } else {
      var u = (t - 0.75) / 0.25;
      r = 228 + u * 27; g = 179 + u * 60; b = 70 + u * 160;
    }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  function drawSpectrumCurve(canvas, r) {
    var f = fitCanvas(canvas);
    if (!f) return;
    var ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1613';
    ctx.fillRect(0, 0, w, h);
    var curve = r.spectrum.curve;
    if (!curve || !curve.length) return;
    ctx.strokeStyle = 'rgba(51,43,36,0.9)';
    ctx.fillStyle = 'rgba(168,159,148,0.6)';
    ctx.font = '10px system-ui';
    var dbMin = -80, dbMax = 0;
    for (var db = dbMin; db <= dbMax; db += 20) {
      var y = h - ((db - dbMin) / (dbMax - dbMin)) * (h - 16) - 8;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillText(db + ' dB', 4, y - 2);
    }
    ctx.beginPath();
    ctx.strokeStyle = '#e0b36a';
    ctx.lineWidth = 1.5;
    for (var i = 0; i < curve.length; i++) {
      var x = (i / (curve.length - 1)) * w;
      var d = curve[i].dbRel;
      var y = h - ((d - dbMin) / (dbMax - dbMin)) * (h - 16) - 8;
      y = clamp(y, 0, h);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(168,159,148,0.7)';
    ['20', '100', '1k', '10k', '20k'].forEach(function (lab, i) {
      var x = (i / 4) * w;
      ctx.fillText(lab, x + 2, h - 2);
    });
  }

  function drawCorr(canvas, r) {
    var f = fitCanvas(canvas);
    if (!f) return;
    var ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1613';
    ctx.fillRect(0, 0, w, h);
    var series = r.stereo.correlationSeries;
    var y0 = h / 2;
    ctx.strokeStyle = 'rgba(228,87,127,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
    ctx.setLineDash([]);

    // shade phase issues
    if (r.stereo && r.stereo.phaseIssueTimes) {
      ctx.fillStyle = 'rgba(169,127,214,0.22)';
      r.stereo.phaseIssueTimes.forEach(function (ph) {
        var x0 = (ph.startTime / r.duration) * w;
        var x1 = (ph.endTime / r.duration) * w;
        ctx.fillRect(x0, 0, Math.max(2, x1 - x0), h);
      });
    }

    ctx.strokeStyle = '#7bc47f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < series.length; i++) {
      var x = (i / Math.max(1, series.length - 1)) * w;
      var y = h - ((series[i].v + 1) / 2) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(168,159,148,0.7)';
    ctx.font = '10px system-ui';
    ctx.fillText('Correlation over time (−1 … +1) — dips below 0 are exact phase problem times', 6, 12);
  }

  // ─── Export ──────────────────────────────────────────────────────────────
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', function () {
      if (!activeReport) return;
      var json = MC.reportToJSON(activeReport);
      downloadBlob(json, (activeReport.fileName || 'report').replace(/\.[^.]+$/, '') + '-master-check.json', 'application/json');
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', function () {
      if (!activeReport) return;
      var w = window.open('', '_blank');
      if (!w) {
        flash('Pop-up blocked — allow pop-ups to export the PDF report.');
        return;
      }
      w.document.write(buildPrintableHtml(activeReport));
      w.document.close();
      setTimeout(function () { try { w.print(); } catch (e) {} }, 300);
    });
  }

  function buildPrintableHtml(r) {
    var rows = '';
    (r.categories || []).forEach(function (cat) {
      rows += '<h2>' + escapeHtml(cat.name) + ' — ' + Math.round(cat.score) + '/100 (' + cat.grade + ')</h2><table>';
      rows += '<tr><th>Check</th><th>Status</th><th>Value</th><th>Where (exact time)</th><th>Notes</th></tr>';
      cat.checks.forEach(function (ch) {
        var loc = '';
        if (ch.locations && ch.locations.length) loc = ch.locations.slice(0, 10).map(function (l) { return MC.fmtDur(l.time); }).join(', ');
        else if (ch.locationSummary) loc = ch.locationSummary;
        rows += '<tr class="' + ch.status + '"><td>' + escapeHtml(ch.name) + '</td><td>' +
          ch.status.toUpperCase() + '</td><td>' + escapeHtml(String(ch.value)) + '</td><td>' + escapeHtml(loc) + '</td><td>' +
          escapeHtml(ch.recommendation || ch.detail || '') + '</td></tr>';
      });
      rows += '</table>';
    });
    var markersHtml = '';
    if (r.markers && r.markers.length) {
      markersHtml = '<h2>Exact Problem Timeline</h2><table><tr><th>Time</th><th>Type</th><th>Label</th></tr>';
      r.markers.forEach(function (m) {
        markersHtml += '<tr><td>' + escapeHtml(MC.fmtDur(m.time)) + '</td><td>' + escapeHtml(m.type) + '</td><td>' + escapeHtml(m.label) + '</td></tr>';
      });
      markersHtml += '</table>';
    }
    var plats = '';
    if (r.platforms) {
      plats = '<h2>Platform comparison</h2><table><tr><th>Platform</th><th>Target</th><th>Action</th></tr>';
      r.platforms.forEach(function (p) {
        plats += '<tr><td>' + escapeHtml(p.name) + '</td><td>' + escapeHtml(p.targetLabel) +
          '</td><td>' + escapeHtml(p.action) + '</td></tr>';
      });
      plats += '</table>';
    }
    return '<!doctype html><html><head><meta charset="utf-8"><title>Master Check — ' +
      escapeHtml(r.fileName || '') + '</title><style>' +
      'body{font-family:system-ui,sans-serif;padding:32px;color:#222}' +
      'h1{margin:0 0 4px} .sub{color:#666;margin-bottom:24px}' +
      'table{border-collapse:collapse;width:100%;margin:12px 0 28px;font-size:13px}' +
      'th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}' +
      'th{background:#f4f4f4} tr.fail td{background:#ffe8ee} tr.warn td{background:#fff7e0}' +
      'tr.pass td{background:#eefaf0} .score{font-size:42px;font-weight:700}' +
      '</style></head><body>' +
      '<h1>Raaga Studio · Master Check — with Exact Locations</h1>' +
      '<p class="sub">' + escapeHtml(r.fileName || '') + ' · ' + escapeHtml(r.analyzedAt || '') + ' · ' + MC.fmtDur(r.duration) + '</p>' +
      '<p class="score">' + escapeHtml(r.grade) + ' · ' + r.overallScore + '/100</p>' +
      '<p>' + escapeHtml(r.gradeLabel || '') + '</p>' +
      '<p>🟢 ' + r.summary.pass + ' passed · 🟡 ' + r.summary.warn + ' warnings · 🔴 ' + r.summary.fail + ' failed</p>' +
      plats + markersHtml + rows +
      '<p style="color:#888;font-size:11px;margin-top:40px">Generated by Raaga Studio Master Check · Client-side analysis (ITU-R BS.1770-style LUFS) with sample-accurate problem locations.</p>' +
      '</body></html>';
  }

  function downloadBlob(text, name, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function flash(msg) {
    progressWrap.hidden = false;
    progressBar.style.width = '0%';
    progressLabel.textContent = msg;
    setTimeout(function () { progressWrap.hidden = true; }, 2500);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!activeReport) return;
      drawWaveform(document.getElementById('mc-wave'), activeReport);
      drawSpectrogram(document.getElementById('mc-spec'), activeReport);
      var sc = document.getElementById('mc-spectrum-curve');
      if (sc) drawSpectrumCurve(sc, activeReport);
      var cc = document.getElementById('mc-corr-curve');
      if (cc) drawCorr(cc, activeReport);
    }, 150);
  });
})();
