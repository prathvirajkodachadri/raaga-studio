/**
 * app.js — ಛಂದಸ್ಸು (prosody) controller.
 * Drives the ಮಾತ್ರೆ-ಲಘು-ಗುರು scanner, ಗಣ ವಿಭಾಗ (Gana division),
 * ಪ್ರಾಸ (Prasa / Rhyme schemes) and rhythm analysis UI.
 */
'use strict';

(function () {
  var P = window.PROSODY;
  var inputEl = document.getElementById('input');
  var resultEl = document.getElementById('result');
  var shatpadiEl = document.getElementById('shatpadi');
  var showGanasEl = document.getElementById('showGanas');
  var loadDemoBtn = document.getElementById('loadDemo');
  var clearBtn = document.getElementById('clear');
  var rulesEl = document.getElementById('rules');
  var sendToSunoBtn = document.getElementById('sendToSuno');
  var prasaEl = document.getElementById('prasa-analysis');
  var rhythmEl = document.getElementById('rhythm-stats');

  var DEMO = [
    'ಅ ಇ ಉ ಋ ಎ ಒ',
    'ಕ ಕಿ ಕು ಚ ಟ ತ ಕೆ ಕೊ ಸು ಸೊ ಸೃ ಕೃ',
    'ಆ ಈ ಊ ೠ ಏ ಐ ಓ',
    'ಕಾ ಕೀ ಚೇ ಚೈ ಸೈ ನಾ ರೋ ಸೌ',
    'ಕ್ಕಾ ಸ್ನೇ ತ್ರೇ ಪ್ರೈ ಕ್ರೋ ಧ್ಯಾ ಲೋ',
    'ಅಂ ಅಃ ತಂ ತಃ ಸಂ ಸಃ ಕಂ',
    'ಕಲ್ಲು ಮಣ್ಣು ನಿಲ್ಲು',
    'ಮೆತ್ತಗೆ',
    'ಕಲ್ ನಿಲ್ ಪಣ್ ತಿನ್ ಮೇಣ್ ಕಾಲ್ ಮೇಲ್ ತಾಯ್',
    'ಶಾಸ್ತ್ರ ಕಾಂಕ್ಷೆ',
    'ಆಃ',
    'ಅರಮನೆ',
    'ಕನ್ನಡಿಗರು',
    '',
    'ನಿನ್ನ ನೋಡಿದಾಗ',
    'ಮನಸ್ಸು ಕದಲಿತು',
    'ಕಣ್ಣಿನ ಕಳೆಯಲಿ',
    'ಕಳೆದು ಹೋದೆನು',
    'ನಕ್ಷತ್ರಗಳು ನಗುತ್ತಿವೆ',
    'ನಿನ್ನ ಪ್ರೀತಿಯ ನೋಡಿ'
  ].join('\n');

  function renderRules() {
    if (!rulesEl) return;
    var html = '';
    P.PROSODY_RULES.forEach(function (r, i) {
      html += '<details' + (i === 0 ? ' open' : '') + '>' +
        '<summary>ನಿಯಮ ' + (i + 1) + '</summary>' +
        '<div class="body"><p>' + escapeHtml(r) + '</p></div></details>';
    });
    rulesEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    if (!inputEl || !resultEl) return;
    var text = inputEl.value;
    var lines = P.scanText(text, { shatpadi: shatpadiEl ? shatpadiEl.checked : false });
    var showGanas = showGanasEl ? showGanasEl.checked : true;

    var html = '';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      if (!line.cells.length && !text.split('\n')[li]) {
        html += '<div class="outline empty-line"></div>';
        continue;
      }
      html += '<div class="outline">';
      html += '<div class="outline-head">' +
        '<span class="line-no">ಸಾಲು ' + (li + 1) + ' · <strong>' + line.matraTotal + '</strong> ಮಾತ್ರೆ · ' +
        line.aksharaCount + ' ಅಕ್ಷರ</span>' +
        '</div>';
      html += '<span class="sym">';
      for (var c = 0; c < line.cells.length; c++) {
        var cell = line.cells[c];
        if (cell.symbol == null) {
          html += '<span class="sp"></span>';
          continue;
        }
        var cls = cell.symbol === 'U' ? 'laghu' : (cell.symbol === '—' ? 'guru' : (cell.symbol === '3' ? 'pluta' : 'none'));
        var badge = cell.symbol === '·' ? '·' : cell.symbol;
        html += '<span class="ak ' + cls + '"><span class="badge">' + badge + '</span><span class="ch">' + escapeHtml(cell.text) + '</span></span>';
      }
      html += '</span>';

      // Symbols and Ganas
      var symOnly = line.cells.filter(function (x) { return x.symbol && x.symbol !== '·'; }).map(function (x) { return x.symbol; }).join('');
      html += '<div class="metra-line">';
      html += '<span>ಚಿಹ್ನೆ: <b>' + escapeHtml(symOnly) + '</b></span>';
      if (showGanas && line.ganas && line.ganas.length) {
        html += '<div class="gana-badges">';
        line.ganas.forEach(function (g) {
          html += '<span class="gana-chip" title="' + escapeHtml(g.desc || '') + '">' +
            '<strong>' + escapeHtml(g.name) + '</strong> (' + escapeHtml(g.symbols) + ')' +
            '</span>';
        });
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
    }
    resultEl.innerHTML = html || '<p class="hint">ಇಲ್ಲಿ ಫಲಿತಾಂಶ ಕಾಣುತ್ತದೆ.</p>';

    // Render Prasa analysis
    if (prasaEl) {
      var prasa = P.analyzePrasa(lines);
      var dvit = prasa.dvitiyakshara;
      var antya = prasa.antyaPrasa;
      var phtml = '<div class="prasa-box">';
      phtml += '<div class="prasa-item ' + (dvit.matched ? 'pass' : 'neutral') + '">';
      phtml += '<strong>ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ:</strong> <span>' + (dvit.matched ? '✅ ' : 'ℹ️ ') + escapeHtml(dvit.description) + '</span>';
      phtml += '</div>';
      phtml += '<div class="prasa-item ' + (antya.matched ? 'pass' : 'neutral') + '">';
      phtml += '<strong>ಅಂತ್ಯಪ್ರಾಸ (End Rhyme):</strong> <span>' + (antya.matched ? '✅ ' : 'ℹ️ ') + escapeHtml(antya.description) + '</span>';
      phtml += '</div>';
      phtml += '</div>';
      prasaEl.innerHTML = phtml;
    }

    // Render Rhythm metrics
    if (rhythmEl) {
      var rh = P.analyzeRhythm(lines);
      var rhtml = '<div class="rhythm-grid">';
      rhtml += '<div class="r-card"><span class="r-v">' + rh.lineCount + '</span><span class="r-l">ಸಾಲುಗಳು</span></div>';
      rhtml += '<div class="r-card"><span class="r-v">' + rh.totalMatras + '</span><span class="r-l">ಒಟ್ಟು ಮಾತ್ರೆ</span></div>';
      rhtml += '<div class="r-card"><span class="r-v">' + rh.avgMatras + '</span><span class="r-l">ಸರಾಸರಿ / ಸಾಲು</span></div>';
      rhtml += '<div class="r-card"><span class="r-v">' + (rh.balanced ? '🟢 ಸುಲಲಿತ' : '🟡 ವೈವಿಧ್ಯ') + '</span><span class="r-l">ಲಯ (Rhythm)</span></div>';
      rhtml += '</div>';
      rhythmEl.innerHTML = rhtml;
    }
  }

  if (inputEl) inputEl.addEventListener('input', render);
  if (shatpadiEl) shatpadiEl.addEventListener('change', render);
  if (showGanasEl) showGanasEl.addEventListener('change', render);
  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', function () {
      inputEl.value = DEMO;
      render();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      inputEl.value = '';
      render();
    });
  }

  if (sendToSunoBtn) {
    sendToSunoBtn.addEventListener('click', function () {
      var text = inputEl ? inputEl.value.trim() : '';
      if (!text) return;
      var spExtra = document.getElementById('sp-extra');
      if (spExtra) {
        spExtra.value = text;
        spExtra.dispatchEvent(new Event('input'));
      }
      if (window.RaagaStudio && window.RaagaStudio.switchTo) {
        window.RaagaStudio.switchTo('suno');
      }
    });
  }

  renderRules();
  if (inputEl) {
    inputEl.value = DEMO;
    render();
  }
})();
