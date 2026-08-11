/**
 * bpm-key-app.js — UI controller for the BPM & Key Finder, Tap Tempo and Metronome tab.
 */
'use strict';

(function () {
  var BK = window.BPM_KEY;
  if (!BK) return;

  // ─── Element refs ────────────────────────────────────────────────────────
  // Tap Tempo
  var tapBtn = document.getElementById('bk-tap-btn');
  var tapBpmEl = document.getElementById('bk-tap-bpm');
  var tapSubEl = document.getElementById('bk-tap-sub');
  var tapResetBtn = document.getElementById('bk-tap-reset');
  var tapApplyMetBtn = document.getElementById('bk-tap-apply-met');
  var tapApplySunoBtn = document.getElementById('bk-tap-apply-suno');

  // Metronome
  var metPlayBtn = document.getElementById('bk-met-play');
  var metBpmInput = document.getElementById('bk-met-bpm');
  var metBpmSlider = document.getElementById('bk-met-slider');
  var metMinusBtn = document.getElementById('bk-met-minus');
  var metPlusBtn = document.getElementById('bk-met-plus');
  var metPatternSelect = document.getElementById('bk-met-pattern');
  var metBeatsEl = document.getElementById('bk-met-beats');
  var metTalaInfo = document.getElementById('bk-met-tala-info');

  // Audio Key/BPM Detector
  var fileInput = document.getElementById('bk-file');
  var browseBtn = document.getElementById('bk-browse');
  var dropzone = document.getElementById('bk-dropzone');
  var progressWrap = document.getElementById('bk-progress-wrap');
  var progressBar = document.getElementById('bk-progress-bar');
  var progressLabel = document.getElementById('bk-progress-label');
  var detectResultEl = document.getElementById('bk-detect-result');

  var tapTracker = BK.createTapTempo();
  var currentDetected = null;

  // ─── Tap Tempo ───────────────────────────────────────────────────────────
  function handleTap() {
    var res = tapTracker.tap();
    if (tapBtn) {
      tapBtn.classList.add('tapped');
      setTimeout(function () { tapBtn.classList.remove('tapped'); }, 120);
    }
    if (res.bpm) {
      if (tapBpmEl) tapBpmEl.textContent = res.bpm;
      if (tapSubEl) tapSubEl.textContent = res.ms + ' ms · ' + res.tempoName + ' (' + res.tapsCount + ' taps)';
      if (tapApplyMetBtn) tapApplyMetBtn.disabled = false;
      if (tapApplySunoBtn) tapApplySunoBtn.disabled = false;
    } else {
      if (tapSubEl) tapSubEl.textContent = res.tempoName;
    }
  }

  if (tapBtn) tapBtn.addEventListener('click', handleTap);
  if (tapResetBtn) {
    tapResetBtn.addEventListener('click', function () {
      tapTracker.reset();
      if (tapBpmEl) tapBpmEl.textContent = '—';
      if (tapSubEl) tapSubEl.textContent = 'Tap the button or press Space';
      if (tapApplyMetBtn) tapApplyMetBtn.disabled = true;
      if (tapApplySunoBtn) tapApplySunoBtn.disabled = true;
    });
  }

  if (tapApplyMetBtn) {
    tapApplyMetBtn.addEventListener('click', function () {
      var bpm = parseInt(tapBpmEl.textContent, 10);
      if (bpm && isFinite(bpm)) {
        setMetronomeBpm(bpm);
      }
    });
  }

  if (tapApplySunoBtn) {
    tapApplySunoBtn.addEventListener('click', function () {
      var bpm = parseInt(tapBpmEl.textContent, 10);
      if (!bpm || !isFinite(bpm)) return;

      var spTempo = document.getElementById('sp-tempo');
      if (spTempo) {
        var optVal = bpm < 80 ? 'Slow — 60–80 BPM' :
                     bpm < 110 ? 'Mid — 80–110 BPM' :
                     bpm < 130 ? 'Mid-fast — 110–130 BPM' : 'Fast — 130+ BPM';
        spTempo.value = optVal;
        spTempo.dispatchEvent(new Event('change'));
      }

      if (window.RaagaStudio && window.RaagaStudio.switchTo) {
        window.RaagaStudio.switchTo('suno');
      }
    });
  }

  // ─── Metronome ───────────────────────────────────────────────────────────
  function initMetronome() {
    if (metPatternSelect) {
      metPatternSelect.innerHTML = Object.keys(BK.TALA_PATTERNS).map(function (k) {
        var p = BK.TALA_PATTERNS[k];
        return '<option value="' + k + '">' + escapeHtml(p.name) + '</option>';
      }).join('');
      metPatternSelect.addEventListener('change', function () {
        var pKey = metPatternSelect.value;
        BK.Metronome.setPattern(pKey);
        renderBeatBalls();
      });
    }

    if (metBpmInput && metBpmSlider) {
      metBpmInput.addEventListener('change', function () {
        setMetronomeBpm(+metBpmInput.value);
      });
      metBpmSlider.addEventListener('input', function () {
        setMetronomeBpm(+metBpmSlider.value);
      });
    }

    if (metMinusBtn) {
      metMinusBtn.addEventListener('click', function () {
        var b = +metBpmInput.value - 1;
        setMetronomeBpm(b);
      });
    }
    if (metPlusBtn) {
      metPlusBtn.addEventListener('click', function () {
        var b = +metBpmInput.value + 1;
        setMetronomeBpm(b);
      });
    }

    if (metPlayBtn) {
      metPlayBtn.addEventListener('click', function () {
        var isRunning = BK.Metronome.toggle({
          bpm: +metBpmInput.value || 96,
          pattern: metPatternSelect ? metPatternSelect.value : '4/4',
          onBeat: onMetronomeBeat
        });
        updateMetronomePlayBtn(isRunning);
      });
    }

    renderBeatBalls();
  }

  function setMetronomeBpm(b) {
    b = Math.max(30, Math.min(280, b));
    if (metBpmInput) metBpmInput.value = b;
    if (metBpmSlider) metBpmSlider.value = b;
    BK.Metronome.setBpm(b);
  }

  function updateMetronomePlayBtn(isRunning) {
    if (!metPlayBtn) return;
    if (isRunning) {
      metPlayBtn.textContent = '⏹ Stop Metronome';
      metPlayBtn.classList.add('playing');
    } else {
      metPlayBtn.textContent = '▶ Start Metronome';
      metPlayBtn.classList.remove('playing');
      clearBeatBalls();
    }
  }

  function renderBeatBalls() {
    if (!metBeatsEl) return;
    var pKey = metPatternSelect ? metPatternSelect.value : '4/4';
    var p = BK.TALA_PATTERNS[pKey] || BK.TALA_PATTERNS['4/4'];
    var html = '';
    for (var i = 0; i < p.beats; i++) {
      var isMajor = i === 0;
      html += '<div class="beat-ball' + (isMajor ? ' major' : '') + '" id="beat-ball-' + i + '"><span>' + (i + 1) + '</span></div>';
    }
    metBeatsEl.innerHTML = html;

    if (metTalaInfo) {
      metTalaInfo.textContent = p.structure ? 'ರಚನೆ (Structure): ' + p.structure : p.name;
    }
  }

  function onMetronomeBeat(beatIndex, totalBeats, isAccent) {
    clearBeatBalls();
    var b = document.getElementById('beat-ball-' + beatIndex);
    if (b) {
      b.classList.add('active');
      if (isAccent) b.classList.add('accent');
    }
  }

  function clearBeatBalls() {
    if (!metBeatsEl) return;
    metBeatsEl.querySelectorAll('.beat-ball').forEach(function (el) {
      el.classList.remove('active', 'accent');
    });
  }

  // ─── Audio Key & BPM Detector ─────────────────────────────────────────────
  function acceptAudioFile(file) {
    if (!file) return;
    if (!dropzone || !detectResultEl) return;

    progressWrap.hidden = false;
    progressBar.style.width = '15%';
    progressLabel.textContent = 'Loading audio ' + file.name + '…';

    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      progressLabel.textContent = 'Web Audio API not supported.';
      return;
    }
    var ctx = new AC();

    file.arrayBuffer().then(function (buf) {
      progressBar.style.width = '40%';
      progressLabel.textContent = 'Decoding ' + file.name + '…';
      return ctx.decodeAudioData(buf);
    }).then(function (audioBuffer) {
      progressBar.style.width = '75%';
      progressLabel.textContent = 'Analyzing pitch, key & tempo…';

      var res = BK.analyzeKeyAndBpm(audioBuffer);
      currentDetected = res;
      currentDetected.fileName = file.name;

      progressBar.style.width = '100%';
      progressLabel.textContent = 'Done!';
      setTimeout(function () { progressWrap.hidden = true; }, 600);

      renderDetectionResult(res);
      try { ctx.close(); } catch (e) {}
    }).catch(function (err) {
      progressLabel.textContent = 'Error: ' + String(err && err.message || err);
      try { ctx.close(); } catch (e) {}
    });
  }

  function renderDetectionResult(res) {
    if (!detectResultEl) return;
    var html = '<div class="panel bk-detect-card">';
    html += '<div class="bk-res-head">';
    html += '<h3>Audio Detection — ' + escapeHtml(res.fileName || 'Audio Track') + '</h3>';
    html += '<span class="hint">' + res.duration.toFixed(1) + ' seconds analyzed</span>';
    html += '</div>';

    html += '<div class="bk-res-grid">';
    html += '<div class="bk-res-item"><div class="bk-res-val">' + res.bpm + ' <small>BPM</small></div><div class="bk-res-lbl">Detected Tempo</div></div>';
    html += '<div class="bk-res-item"><div class="bk-res-val">' + escapeHtml(res.keyName) + '</div><div class="bk-res-lbl">Detected Key / Scale</div></div>';
    html += '<div class="bk-res-item"><div class="bk-res-val">' + BK.getTempoName(res.bpm).split('/')[0] + '</div><div class="bk-res-lbl">Tempo Classification</div></div>';
    html += '</div>';

    // Matching Ragas
    if (res.matchingRagas && res.matchingRagas.length) {
      html += '<div class="bk-ragas-box">';
      html += '<h4>ಸರಿಹೊಂದುವ ರಾಗಗಳು (Matching Indian Ragas):</h4>';
      html += '<div class="bk-raga-chips">';
      res.matchingRagas.forEach(function (rag) {
        html += '<div class="bk-raga-chip"><strong>' + escapeHtml(rag.name) + '</strong><span>' + escapeHtml(rag.desc) + '</span></div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // 12-semitone chroma display
    if (res.chroma && res.chroma.length === 12) {
      html += '<div class="bk-chroma-box">';
      html += '<span class="hint">12-Semitone Pitch Class Profile (Chroma Energy):</span>';
      html += '<div class="bk-chroma-bars">';
      BK.NOTE_NAMES.forEach(function (name, idx) {
        var val = res.chroma[idx] || 0;
        var pct = Math.round(val * 100);
        var isRoot = name === res.key;
        html += '<div class="bk-c-col' + (isRoot ? ' root' : '') + '">';
        html += '<div class="bk-c-bar-wrap"><div class="bk-c-fill" style="height:' + pct + '%"></div></div>';
        html += '<span class="bk-c-name">' + name + '</span>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // Actions
    html += '<div class="controls" style="margin-top:12px">';
    html += '<button type="button" class="btn primary" id="bk-apply-suno-all">⚡ Apply Key & BPM to Suno Prompt</button>';
    html += '<button type="button" class="btn" id="bk-apply-met-bpm">Set Metronome to ' + res.bpm + ' BPM</button>';
    html += '<button type="button" class="btn" id="bk-apply-song-studio">Add to Song Studio</button>';
    html += '</div>';

    html += '</div>';
    detectResultEl.innerHTML = html;

    // Bind action buttons
    var applySunoAll = document.getElementById('bk-apply-suno-all');
    if (applySunoAll) {
      applySunoAll.addEventListener('click', function () {
        var spTempo = document.getElementById('sp-tempo');
        var spKey = document.getElementById('sp-key');
        if (spTempo) {
          var optVal = res.bpm < 80 ? 'Slow — 60–80 BPM' :
                       res.bpm < 110 ? 'Mid — 80–110 BPM' :
                       res.bpm < 130 ? 'Mid-fast — 110–130 BPM' : 'Fast — 130+ BPM';
          spTempo.value = optVal;
          spTempo.dispatchEvent(new Event('change'));
        }
        if (spKey) {
          var targetVal = res.keyName.toLowerCase();
          var found = false;
          for (var i = 0; i < spKey.options.length; i++) {
            if (spKey.options[i].value.toLowerCase().indexOf(targetVal) >= 0) {
              spKey.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            var opt = document.createElement('option');
            opt.value = res.keyName;
            opt.textContent = res.keyName;
            spKey.appendChild(opt);
            spKey.value = res.keyName;
          }
          spKey.dispatchEvent(new Event('change'));
        }
        if (window.RaagaStudio && window.RaagaStudio.switchTo) {
          window.RaagaStudio.switchTo('suno');
        }
      });
    }

    var applyMet = document.getElementById('bk-apply-met-bpm');
    if (applyMet) {
      applyMet.addEventListener('click', function () {
        setMetronomeBpm(res.bpm);
      });
    }

    var applySong = document.getElementById('bk-apply-song-studio');
    if (applySong) {
      applySong.addEventListener('click', function () {
        if (window.RaagaStudio && window.RaagaStudio.switchTo) {
          window.RaagaStudio.switchTo('songs');
        }
        var ssBpm = document.getElementById('ss-bpm');
        var ssKey = document.getElementById('ss-key');
        if (ssBpm) ssBpm.value = res.bpm;
        if (ssKey) ssKey.value = res.keyName;
      });
    }
  }

  function initFileDrop() {
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (fileInput.files[0]) acceptAudioFile(fileInput.files[0]);
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
        if (e.dataTransfer.files[0]) acceptAudioFile(e.dataTransfer.files[0]);
      });
      dropzone.addEventListener('click', function () { fileInput.click(); });
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    initMetronome();
    initFileDrop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
