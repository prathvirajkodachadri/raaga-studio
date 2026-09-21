/**
 * app.js — ಛಂದಸ್ಸು (prosody) controller.
 */
'use strict';

(function () {
  var P = window.PROSODY;
  var inputEl = document.getElementById('input');
  var resultEl = document.getElementById('result');
  var shatpadiEl = document.getElementById('shatpadi');
  var loadDemoBtn = document.getElementById('loadDemo');
  var clearBtn = document.getElementById('clear');
  var copyAllBtn = document.getElementById('copyAll');
  var rulesEl = document.getElementById('rules');
  var flashEl = document.getElementById('prosody-flash');

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

  var lastRawLines = [];
  var lastLines = [];

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderRules() {
    var html = '';
    P.PROSODY_RULES.forEach(function (r, i) {
      html += '<details' + (i === 0 ? ' open' : '') + '>' +
        '<summary>ನಿಯಮ ' + (i + 1) + '</summary>' +
        '<div class="body"><p>' + escapeHtml(r) + '</p></div></details>';
    });
    rulesEl.innerHTML = html;
  }

  function formatCopyBlock(line, originalLine) {
    if (!(originalLine || '').trim()) return '';

    var annotated = [];
    line.cells.forEach(function (c) {
      if (c.symbol && c.symbol !== '·') {
        annotated.push(c.symbol);
      } else if (c.symbol == null && c.text === '\t') {
        annotated.push('|');
      }
    });

    // Copy one complete poem as a single text block. Each poem line keeps
    // its own Laghu/Guru pattern, and a literal TAB is represented as |.
    return annotated.join(' ') + '\n' + originalLine + '\n' +
      'ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ';
  }

  function formatAllCopy() {
    var blocks = [];
    for (var i = 0; i < lastLines.length; i++) {
      var raw = lastRawLines[i] || '';
      if (!raw.trim()) continue;
      blocks.push(formatCopyBlock(lastLines[i], raw));
    }
    return blocks.join('\n\n');
  }

  function buildHtmlForLine(line, originalLine) {
    var symbols = [];
    line.cells.forEach(function (c) {
      if (c.symbol && c.symbol !== '·') symbols.push(c.symbol);
    });
    return '<div style="margin:0 0 12px 0;font-family:\'Noto Sans Kannada\',sans-serif;">' +
      '<div style="font-size:14px;letter-spacing:1px;color:#9a6b1a;font-weight:600;">' +
      escapeHtml(symbols.join(' ')) + '</div>' +
      '<div style="font-size:18px;line-height:1.6;color:#3b3226;">' +
      escapeHtml(originalLine) + '</div>' +
      '<div style="font-size:12px;color:#82755f;">ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ</div>' +
      '</div>';
  }

  function buildHtmlForAll() {
    var htmlParts = [];
    for (var i = 0; i < lastLines.length; i++) {
      var raw = lastRawLines[i] || '';
      if (!raw.trim()) continue;
      htmlParts.push(buildHtmlForLine(lastLines[i], raw));
    }
    return '<div>' + htmlParts.join('') + '</div>';
  }

  function copyToClipboard(plainText, htmlText, onDone) {
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        var item = new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([htmlText], { type: 'text/html' })
        });
        navigator.clipboard.write([item]).then(function () {
          onDone(true);
        }).catch(function () {
          fallbackCopy(plainText, onDone);
        });
        return;
      } catch (e) {}
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(plainText).then(function () {
        onDone(true);
      }).catch(function () {
        fallbackCopy(plainText, onDone);
      });
      return;
    }

    fallbackCopy(plainText, onDone);
  }

  function fallbackCopy(text, onDone) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    onDone(ok);
  }

  function flash(msg, isError) {
    if (!flashEl) return;
    flashEl.textContent = msg;
    flashEl.style.borderColor = isError ? '#c73a63' : '#c9971c';
    flashEl.classList.add('show');
    clearTimeout(flashEl._t);
    flashEl._t = setTimeout(function () {
      flashEl.classList.remove('show');
    }, 2600);
  }

  function render() {
    var text = inputEl.value;
    lastRawLines = String(text == null ? '' : text).split('\n');
    lastLines = P.scanText(text, { shatpadi: shatpadiEl.checked });

    var html = '';

    for (var li = 0; li < lastLines.length; li++) {
      var line = lastLines[li];
      var rawLine = lastRawLines[li] || '';
      var isEmpty = !rawLine.trim();

      html += '<div class="outline' + (isEmpty ? ' empty' : '') + '">';
      html += '<div class="line-head">';
      html += '<span class="line-no">ಸಾಲು ' + (li + 1) + ' · ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ' + (isEmpty ? ' · (ಖಾಲಿ)' : '') + '</span>';
      html += '</div>';

      html += '<span class="sym">';

      for (var c = 0; c < line.cells.length; c++) {
        var cell = line.cells[c];

        if (cell.symbol == null) {
          // Show literal TABs as the requested | separator.
          if (cell.text === '\t') {
            html += '<span class="tab-separator" aria-label="separator">|</span>';
          } else if (cell.text === ' ') {
            html += '<span class="sp"></span>';
          } else {
            html += '<span class="sp" style="width:auto;margin-right:2px;">' +
              escapeHtml(cell.text) + '</span>';
          }
          continue;
        }

        var cls = cell.symbol === 'U' ? 'laghu' :
          (cell.symbol === '—' ? 'guru' :
          (cell.symbol === '3' ? 'pluta' : 'none'));

        html += '<span class="ak ' + cls + '">' +
          '<span class="badge">' + escapeHtml(cell.symbol) + '</span>' +
          '<span class="ch">' + escapeHtml(cell.text) + '</span>' +
          '</span>';
      }

      html += '</span>';

      if (!isEmpty) {
        var symOnly = line.cells
          .filter(function (x) { return x.symbol && x.symbol !== '·'; })
          .map(function (x) { return x.symbol; })
          .join(' ');

        html += '<div class="metra-line">ಚಿಹ್ನೆ: <b>' + escapeHtml(symOnly || '—') +
          '</b> <span style="font-size:11px;color:var(--muted);">' +
          '(Tab = | · Copy All copies the complete poem)' +
          '</span></div>';
      }

      html += '</div>';
    }

    resultEl.innerHTML = html || '<p class="hint">ಇಲ್ಲಿ ಫಲಿತಾಂಶ ಕಾಣುತ್ತದೆ.</p>';
  }

  function handleCopyAll() {
    if (!lastLines.length) {
      flash('Nothing to copy', true);
      return;
    }

    var hasContent = lastRawLines.some(function (l) { return l.trim(); });
    if (!hasContent) {
      flash('Type some Kannada first', true);
      return;
    }

    var plainAll = formatAllCopy();
    var htmlAll = buildHtmlForAll();

    if (!plainAll.trim()) {
      flash('Nothing to copy', true);
      return;
    }

    var origText = copyAllBtn ? copyAllBtn.textContent : '';
    if (copyAllBtn) copyAllBtn.textContent = 'Copying...';

    copyToClipboard(plainAll, htmlAll, function (ok) {
      if (copyAllBtn) copyAllBtn.textContent = ok ? 'Copied All!' : 'Failed';
      flash(ok ? 'All poem lines copied with laghu/guru and ಮಾತ್ರೆ' : 'Copy failed', !ok);
      if (copyAllBtn) {
        setTimeout(function () {
          copyAllBtn.textContent = origText;
        }, 2000);
      }
    });
  }

  // Keep TAB inside the poem editor so the Prosody output can show it as |.
  inputEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();

    var start = inputEl.selectionStart;
    var end = inputEl.selectionEnd;
    var value = inputEl.value;
    inputEl.value = value.slice(0, start) + '\t' + value.slice(end);
    inputEl.selectionStart = inputEl.selectionEnd = start + 1;
    render();
  });

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

  if (copyAllBtn) copyAllBtn.addEventListener('click', handleCopyAll);

  renderRules();
  inputEl.value = DEMO;
  render();
})();
