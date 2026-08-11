/**
 * app.js — ಛಂದಸ್ಸು (prosody) controller.
 * Drives the मಾತ್ರೆ-ಲಘು-ಗುರು scanner UI on top of window.PROSODY.
 */
'use strict';

(function () {
  var P = window.PROSODY;
  var inputEl = document.getElementById('input');
  var resultEl = document.getElementById('result');
  var shatpadiEl = document.getElementById('shatpadi');
  var loadDemoBtn = document.getElementById('loadDemo');
  var clearBtn = document.getElementById('clear');
  var rulesEl = document.getElementById('rules');

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
    var html = '';
    P.PROSODY_RULES.forEach(function (r, i) {
      html += '<details' + (i === 0 ? ' open' : '') + '>' +
        '<summary>ನಿಯಮ ' + (i + 1) + '</summary>' +
        '<div class="body"><p>' + escapeHtml(r) + '</p></div></details>';
    });
    rulesEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    var text = inputEl.value;
    var lines = P.scanText(text, { shatpadi: shatpadiEl.checked });
    var html = '';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      html += '<div class="outline">';
      html += '<span class="line-no">ಸಾಲು ' + (li + 1) + ' · ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ</span>';
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
      html += '<div class="metra-line">ಚಿಹ್ನೆ: <b>' + escapeHtml(line.cells.filter(function (x) { return x.symbol && x.symbol !== '·'; }).map(function (x) { return x.symbol; }).join('')) + '</b></div>';
      html += '</div>';
    }
    resultEl.innerHTML = html || '<p class="hint">ಇಲ್ಲಿ ಫಲಿತಾಂಶ ಕಾಣುತ್ತದೆ.</p>';
  }

  inputEl.addEventListener('input', render);
  shatpadiEl.addEventListener('change', render);
  loadDemoBtn.addEventListener('click', function () {
    inputEl.value = DEMO;
    render();
  });
  clearBtn.addEventListener('click', function () {
    inputEl.value = '';
    render();
  });

  renderRules();
  inputEl.value = DEMO;
  render();
})();
