/**
 * raga-app.js — UI controller for the Raga & Shruti Explorer and Tanpura Drone.
 */
'use strict';

(function () {
  var R = window.RAGAS;
  if (!R) return;

  var tonicSelect = document.getElementById('rg-tonic');
  var searchInput = document.getElementById('rg-search');
  var filterRasa = document.getElementById('rg-rasa-filter');
  var ragaListEl = document.getElementById('rg-list');

  // Tanpura controls
  var tpPlayBtn = document.getElementById('tp-play');
  var tpTonic = document.getElementById('tp-tonic');
  var tpString = document.getElementById('tp-string');
  var tpTempo = document.getElementById('tp-tempo');
  var tpTempoVal = document.getElementById('tp-tempo-val');
  var tpVol = document.getElementById('tp-vol');

  var currentTonic = 'C';

  // ─── Initialize Selects ───────────────────────────────────────────────────
  function initSelects() {
    if (tonicSelect) {
      tonicSelect.innerHTML = R.NOTE_NAMES.map(function (n) {
        return '<option value="' + n + '"' + (n === 'C' ? ' selected' : '') + '>' + n + ' (Sa)</option>';
      }).join('');
      tonicSelect.addEventListener('change', function () {
        currentTonic = tonicSelect.value;
        if (tpTonic) tpTonic.value = currentTonic;
        R.Tanpura.setTonic(currentTonic);
        renderRagas();
      });
    }

    if (tpTonic) {
      tpTonic.innerHTML = R.NOTE_NAMES.map(function (n) {
        return '<option value="' + n + '"' + (n === 'C' ? ' selected' : '') + '>' + n + '</option>';
      }).join('');
      tpTonic.addEventListener('change', function () {
        R.Tanpura.setTonic(tpTonic.value);
        if (tonicSelect) tonicSelect.value = tpTonic.value;
        currentTonic = tpTonic.value;
        renderRagas();
      });
    }

    if (searchInput) searchInput.addEventListener('input', renderRagas);
    if (filterRasa) filterRasa.addEventListener('change', renderRagas);

    // Tanpura listeners
    if (tpPlayBtn) {
      tpPlayBtn.addEventListener('click', function () {
        var isPlaying = R.Tanpura.toggle({
          tonic: tpTonic ? tpTonic.value : currentTonic,
          firstString: tpString ? tpString.value : 'P',
          tempo: tpTempo ? +tpTempo.value : 48,
          volume: tpVol ? +tpVol.value / 100 : 0.35
        });
        updateTanpuraUi(isPlaying);
      });
    }

    if (tpString) {
      tpString.addEventListener('change', function () {
        R.Tanpura.setFirstString(tpString.value);
      });
    }

    if (tpTempo) {
      tpTempo.addEventListener('input', function () {
        var bpm = +tpTempo.value;
        if (tpTempoVal) tpTempoVal.textContent = bpm + ' BPM';
        R.Tanpura.setTempo(bpm);
      });
    }

    if (tpVol) {
      tpVol.addEventListener('input', function () {
        R.Tanpura.setVolume(+tpVol.value / 100);
      });
    }
  }

  function updateTanpuraUi(isPlaying) {
    if (!tpPlayBtn) return;
    if (isPlaying) {
      tpPlayBtn.textContent = '⏹ Stop Tanpura';
      tpPlayBtn.classList.add('playing');
    } else {
      tpPlayBtn.textContent = '▶ Play Tanpura Drone';
      tpPlayBtn.classList.remove('playing');
    }
  }

  // ─── Render Raga Cards ────────────────────────────────────────────────────
  function renderRagas() {
    if (!ragaListEl) return;
    var q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    var rasaQ = filterRasa ? filterRasa.value : 'all';

    var filtered = R.RAGA_LIST.filter(function (r) {
      var matchQ = !q || r.name.toLowerCase().indexOf(q) >= 0 ||
        r.arohana.toLowerCase().indexOf(q) >= 0 ||
        r.rasa.toLowerCase().indexOf(q) >= 0 ||
        r.melakarta.toLowerCase().indexOf(q) >= 0 ||
        (r.songs && r.songs.toLowerCase().indexOf(q) >= 0);

      var matchRasa = rasaQ === 'all' || r.rasa.toLowerCase().indexOf(rasaQ.toLowerCase()) >= 0;
      return matchQ && matchRasa;
    });

    if (!filtered.length) {
      ragaListEl.innerHTML = '<div class="panel rg-empty"><p class="hint">No matching ragas found for “' + escapeHtml(q) + '”.</p></div>';
      return;
    }

    var html = '';
    filtered.forEach(function (r) {
      html += '<div class="panel rg-card" id="raga-card-' + r.id + '">';
      html += '<div class="rg-card-head">';
      html += '<div class="rg-card-title-wrap">';
      html += '<h3 class="rg-card-title">' + escapeHtml(r.name) + '</h3>';
      html += '<span class="rg-tradition">' + escapeHtml(r.tradition) + ' · ' + escapeHtml(r.melakarta) + '</span>';
      html += '</div>';
      html += '<span class="rg-rasa-pill">' + escapeHtml(r.rasa.split('(')[0].trim()) + '</span>';
      html += '</div>';

      // Arohana / Avarohana Swara buttons
      html += '<div class="rg-swara-box">';
      html += '<div class="rg-swara-row"><span class="rg-swara-label">ಆರೋಹಣ (Arohana):</span><div class="rg-swara-chips">';
      r.arohana.split(' ').forEach(function (sw) {
        var wNote = R.getWesternNoteName(sw, currentTonic);
        html += '<button type="button" class="swara-btn" data-swara="' + sw + '" data-tonic="' + currentTonic + '" title="Play ' + sw + ' (' + wNote + ')">' +
          '<span class="sw-s">' + sw + '</span><span class="sw-w">' + wNote + '</span></button>';
      });
      html += '</div></div>';

      html += '<div class="rg-swara-row"><span class="rg-swara-label">ಅವರೋಹಣ (Avarohana):</span><div class="rg-swara-chips">';
      r.avarohana.split(' ').forEach(function (sw) {
        var wNote = R.getWesternNoteName(sw, currentTonic);
        html += '<button type="button" class="swara-btn" data-swara="' + sw + '" data-tonic="' + currentTonic + '" title="Play ' + sw + ' (' + wNote + ')">' +
          '<span class="sw-s">' + sw + '</span><span class="sw-w">' + wNote + '</span></button>';
      });
      html += '</div></div>';
      html += '</div>';

      // Details
      html += '<div class="rg-details">';
      html += '<div class="rg-detail-item"><strong>ಕನ್ನಡ ಸ್ವರಗಳು:</strong> ' + escapeHtml(r.swarasKannada) + '</div>';
      html += '<div class="rg-detail-item"><strong>Western Scale:</strong> ' + escapeHtml(r.westernIntervals) + '</div>';
      html += '<div class="rg-detail-item"><strong>ಗಾಯನ ಸಮಯ (Time):</strong> ' + escapeHtml(r.time) + '</div>';
      if (r.songs) {
        html += '<div class="rg-detail-item"><strong>ಪ್ರಸಿದ್ಧ ಕೃತಿಗಳು / ಹಾಡುಗಳು:</strong> ' + escapeHtml(r.songs) + '</div>';
      }
      html += '</div>';

      // Actions
      html += '<div class="rg-card-actions">';
      html += '<button type="button" class="btn sm primary play-scale-btn" data-raga="' + r.id + '">🎵 Play Scale</button>';
      html += '<button type="button" class="btn sm apply-suno-btn" data-raga="' + r.id + '">⚡ Use in Suno Prompt</button>';
      html += '<button type="button" class="btn sm apply-tanpura-btn" data-first="' + r.firstString + '">🪕 Tune Tanpura (' + r.firstString + ')</button>';
      html += '</div>';

      html += '</div>';
    });

    ragaListEl.innerHTML = html;

    // Bind Swara play clicks
    ragaListEl.querySelectorAll('.swara-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var sw = b.getAttribute('data-swara');
        var t = b.getAttribute('data-tonic') || currentTonic;
        R.playSwara(sw, t);
        b.classList.add('active');
        setTimeout(function () { b.classList.remove('active'); }, 400);
      });
    });

    // Bind Play Scale clicks
    ragaListEl.querySelectorAll('.play-scale-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var ragaId = b.getAttribute('data-raga');
        var card = document.getElementById('raga-card-' + ragaId);
        b.disabled = true;
        R.playScale(ragaId, currentTonic, function (swara, stepIdx, totalSteps) {
          if (card) {
            var chip = card.querySelectorAll('.swara-btn')[stepIdx];
            if (chip) {
              chip.classList.add('active');
              setTimeout(function () { chip.classList.remove('active'); }, 450);
            }
          }
          if (stepIdx >= totalSteps - 1) {
            setTimeout(function () { b.disabled = false; }, 600);
          }
        });
      });
    });

    // Bind Apply to Suno Prompt
    ragaListEl.querySelectorAll('.apply-suno-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var ragaId = b.getAttribute('data-raga');
        var r = R.getRagaById(ragaId);
        if (!r) return;

        // Set key select in Suno prompt
        var spKey = document.getElementById('sp-key');
        if (spKey) {
          var targetVal = r.name.split('/')[0].trim() + ' (raga)';
          // check if exists, otherwise add option
          var hasOpt = false;
          for (var i = 0; i < spKey.options.length; i++) {
            if (spKey.options[i].value.toLowerCase().indexOf(r.id) >= 0 || spKey.options[i].value.indexOf(r.name.split(' ')[0]) >= 0) {
              spKey.selectedIndex = i;
              hasOpt = true;
              break;
            }
          }
          if (!hasOpt) {
            var opt = document.createElement('option');
            opt.value = r.name + ' (' + currentTonic + ')';
            opt.textContent = opt.value;
            spKey.appendChild(opt);
            spKey.value = opt.value;
          }
          spKey.dispatchEvent(new Event('change'));
        }

        // Add raga sunoTag to extra notes if present
        var spExtra = document.getElementById('sp-extra');
        if (spExtra && r.sunoTag) {
          if (spExtra.value.indexOf(r.sunoTag) < 0) {
            spExtra.value = (spExtra.value ? spExtra.value + '\n\n' : '') + '[' + r.sunoTag + ']';
            spExtra.dispatchEvent(new Event('input'));
          }
        }

        if (window.RaagaStudio && window.RaagaStudio.switchTo) {
          window.RaagaStudio.switchTo('suno');
        }
      });
    });

    // Bind Tune Tanpura
    ragaListEl.querySelectorAll('.apply-tanpura-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var fs = b.getAttribute('data-first') || 'P';
        if (tpString) tpString.value = fs;
        R.Tanpura.setFirstString(fs);
        if (tpTonic) tpTonic.value = currentTonic;
        R.Tanpura.setTonic(currentTonic);
        R.Tanpura.start({ tonic: currentTonic, firstString: fs });
        updateTanpuraUi(true);
      });
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    initSelects();
    renderRagas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
