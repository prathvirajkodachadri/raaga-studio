/**
 * app.js — ಛಂದಸ್ಸು (prosody) controller.
 * Drives the ಮಾತ್ರೆ-ಲಘು-ಗುರು scanner UI on top of window.PROSODY.
 * Fixed vertical-paste issue + added Copy per line & Copy All (2 lines: laghu/guru on top, words below + matra).
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

  // holds last scan for copy
  var lastRawLines = [];
  var lastLines = [];

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
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Format one line for copy: 2 lines (laghu/guru on top, words below) + matra
  // Example:
  // U — — U
  // ನಿನ್ನ ನೋಡಿದಾಗ
  // ಒಟ್ಟು 8 ಮಾತ್ರೆ
  function formatCopyBlock(line, originalLine, lineIdx) {
    var origTrim = (originalLine || '').trim();
    if (!origTrim) return '';
    var symbolsArr = line.cells.filter(function (c) { return c.symbol && c.symbol !== '·'; }).map(function (c) { return c.symbol; });
    var symbolsLine = symbolsArr.join(' ');
    // If no symbols (e.g. only punctuation), don't return empty — still give words+matra
    if (!symbolsLine) symbolsLine = '(no akshara)';
    var wordsLine = originalLine; // keep original spacing
    var matraLine = 'ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ';
    // For per-line we include line number comment? optional but useful for Copy All
    // For single line copy we don't need line number prefix, but add for clarity in Copy All via caller
    return symbolsLine + '\n' + wordsLine + '\n' + matraLine;
  }

  function formatCopyBlockWithLineNo(line, originalLine, lineIdx) {
    var block = formatCopyBlock(line, originalLine, lineIdx);
    if (!block) return '';
    return 'ಸಾಲು ' + (lineIdx + 1) + ' · ' + block.split('\n')[2] + '\n' + block.split('\n')[0] + '\n' + block.split('\n')[1];
    // Actually order user wants: laghu/guru on top, words below, then matra. Let's keep that:
    // We'll redo correctly:
  }

  // Revised: correct order = symbols, words, matra ; but for All we prefix line no in matra line already.
  function formatCopyBlockExact(line, originalLine) {
    var origTrim = (originalLine || '').trim();
    if (!origTrim) return '';
    var symbolsArr = line.cells.filter(function (c) { return c.symbol && c.symbol !== '·'; }).map(function (c) { return c.symbol; });
    var symbolsLine = symbolsArr.join(' ');
    if (!symbolsLine) symbolsLine = '';
    var wordsLine = originalLine;
    var matraLine = 'ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ';
    if (symbolsLine) {
      return symbolsLine + '\n' + wordsLine + '\n' + matraLine;
    } else {
      return wordsLine + '\n' + matraLine;
    }
  }

  function formatAllCopy() {
    var blocks = [];
    for (var i = 0; i < lastLines.length; i++) {
      var raw = lastRawLines[i] || '';
      if (!raw.trim()) continue;
      var line = lastLines[i];
      var symbols = line.cells.filter(function (c) { return c.symbol && c.symbol !== '·'; }).map(function (c) { return c.symbol; }).join(' ');
      if (!symbols) symbols = '';
      // Desired order for user: laghu/guru on top, words below, then ಒಟ್ಟು ಮಾತ್ರೆ (with line no for All)
      // So final 3 lines per stanza, but top 2 are strictly laghu/guru + words
      var block;
      if (symbols) {
        block = symbols + '\n' + raw + '\n' + 'ಸಾಲು ' + (i + 1) + ' · ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ';
      } else {
        block = raw + '\n' + 'ಸಾಲು ' + (i + 1) + ' · ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ';
      }
      blocks.push(block);
    }
    return blocks.join('\n\n');
  }

  // Build HTML fallback for rich paste (keeps stacked look in Word/Google Docs)
  function buildHtmlForLine(line, originalLine, lineIdx) {
    var symbolsArr = line.cells.filter(function (c) { return c.symbol && c.symbol !== '·'; }).map(function (c) { return c.symbol; });
    var symbolsLine = escapeHtml(symbolsArr.join(' '));
    var wordsLine = escapeHtml(originalLine);
    var matraLine = escapeHtml('ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ');
    return '<div style="margin:0 0 12px 0;font-family:\'Noto Sans Kannada\',sans-serif;">' +
      '<div style="font-size:12px;color:#a89f94;">ಸಾಲು ' + (lineIdx + 1) + ' · ' + matraLine + '</div>' +
      '<div style="font-size:14px;letter-spacing:1px;color:#e0b36a;font-weight:600;">' + symbolsLine + '</div>' +
      '<div style="font-size:18px;line-height:1.6;color:#f3ede6;">' + wordsLine + '</div>' +
      '</div>';
  }

  function buildHtmlForAll() {
    var htmlParts = [];
    for (var i = 0; i < lastLines.length; i++) {
      var raw = lastRawLines[i] || '';
      if (!raw.trim()) continue;
      htmlParts.push(buildHtmlForLine(lastLines[i], raw, i));
    }
    return '<div>' + htmlParts.join('') + '</div>';
  }

  function copyToClipboard(plainText, htmlText, onDone) {
    // Try modern async clipboard with HTML support
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        var blobPlain = new Blob([plainText], { type: 'text/plain' });
        var blobHtml = new Blob([htmlText], { type: 'text/html' });
        // eslint-disable-next-line no-undef
        var item = new ClipboardItem({ 'text/plain': blobPlain, 'text/html': blobHtml });
        navigator.clipboard.write([item]).then(function () {
          onDone(true);
        }).catch(function () {
          fallbackCopy(plainText, onDone);
        });
        return;
      } catch (e) {
        // fall through
      }
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
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    onDone(ok);
  }

  function flash(msg, isError) {
    if (!flashEl) {
      // create if missing
      flashEl = document.createElement('div');
      flashEl.id = 'prosody-flash';
      flashEl.className = 'prosody-flash';
      document.body.appendChild(flashEl);
    }
    flashEl.textContent = msg;
    flashEl.style.borderColor = isError ? '#e4577f' : '#e0b36a';
    flashEl.classList.add('show');
    clearTimeout(flashEl._t);
    flashEl._t = setTimeout(function () { flashEl.classList.remove('show'); }, 2600);
  }

  function render() {
    var text = inputEl.value;
    lastRawLines = String(text == null ? '' : text).split('\n');
    var lines = P.scanText(text, { shatpadi: shatpadiEl.checked });
    lastLines = lines;

    var html = '';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var rawLine = lastRawLines[li] || '';
      var isEmpty = !rawLine.trim();
      html += '<div class="outline' + (isEmpty ? ' empty' : '') + '">';
      html += '<div class="line-head">';
      html += '<span class="line-no">ಸಾಲು ' + (li + 1) + ' · ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ' + (isEmpty ? ' · (ಖಾಲಿ)' : '') + '</span>';
      if (!isEmpty) {
        html += '<button class="btn sm copy-line" type="button" data-li="' + li + '" aria-label="Copy line ' + (li + 1) + ' with laghu guru on top">Copy</button>';
      }
      html += '</div>';
      html += '<span class="sym">';
      for (var c = 0; c < line.cells.length; c++) {
        var cell = line.cells[c];
        if (cell.symbol == null) {
          if (cell.text === ' ') {
            html += '<span class="sp"></span>';
          } else {
            html += '<span class="sp" style="width:auto;margin-right:2px;">' + escapeHtml(cell.text) + '</span>';
          }
          continue;
        }
        var cls = cell.symbol === 'U' ? 'laghu' : (cell.symbol === '—' ? 'guru' : (cell.symbol === '3' ? 'pluta' : 'none'));
        var badge = cell.symbol === '·' ? '·' : cell.symbol;
        html += '<span class="ak ' + cls + '"><span class="badge">' + badge + '</span><span class="ch">' + escapeHtml(cell.text) + '</span></span>';
      }
      html += '</span>';
      if (!isEmpty) {
        var symOnly = line.cells.filter(function (x) { return x.symbol && x.symbol !== '·'; }).map(function (x) { return x.symbol; }).join(' ');
        html += '<div class="metra-line">ಚಿಹ್ನೆ: <b>' + escapeHtml(symOnly || '—') + '</b> <span style="font-size:11px;color:var(--muted);">(Copy gives: laghu/guru line on top + words + ಒಟ್ಟು ಮಾತ್ರೆ)</span></div>';
      }
      html += '</div>';
    }
    resultEl.innerHTML = html || '<p class="hint">ಇಲ್ಲಿ ಫಲಿತಾಂಶ ಕಾಣುತ್ತದೆ.</p>';

    // wire copy-line buttons
    var copyBtns = resultEl.querySelectorAll('.copy-line');
    copyBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-li'), 10);
        if (isNaN(idx) || !lastLines[idx]) return;
        var raw = lastRawLines[idx] || '';
        var line = lastLines[idx];
        var plain = formatCopyBlockExact(line, raw);
        var plainWithHeader = 'ಸಾಲು ' + (idx + 1) + ' · ಒಟ್ಟು ' + line.matraTotal + ' ಮಾತ್ರೆ\n' + plain.split('\n')[0] + '\n' + raw;
        // For exact spec: 2 lines (symbols + words) + matra line. Let's use plain (symbols, words, matra)
        var finalPlain = plain; // symbols\nwords\nmatra
        // If user wanted include matra, plain already has it
        var htmlFallback = buildHtmlForLine(line, raw, idx);
        btn.textContent = '...';
        copyToClipboard(finalPlain, htmlFallback, function (ok) {
          btn.textContent = ok ? 'Copied!' : 'Failed';
          flash(ok ? 'ಸಾಲು ' + (idx + 1) + ' copied — 2 lines (U/— on top, words below, with ಮಾತ್ರೆ)' : 'Copy failed — please select manually', !ok);
          setTimeout(function () { btn.textContent = 'Copy'; }, 1800);
        });
      });
    });
  }

  // Copy All handler
  function handleCopyAll() {
    if (!lastLines.length) { flash('Nothing to copy', true); return; }
    var hasContent = lastRawLines.some(function (l) { return l.trim(); });
    if (!hasContent) { flash('Type some Kannada first', true); return; }
    var plainAll = formatAllCopy();
    var htmlAll = buildHtmlForAll();
    if (!plainAll.trim()) { flash('Nothing to copy', true); return; }
    var btn = copyAllBtn;
    var origText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Copying...';
    copyToClipboard(plainAll, htmlAll, function (ok) {
      if (btn) btn.textContent = ok ? 'Copied All!' : 'Failed';
      flash(ok ? 'All lines copied — each block: laghu/guru on top, words below, ಒಟ್ಟು ಮಾತ್ರೆ' : 'Copy failed', !ok);
      if (btn) setTimeout(function () { btn.textContent = origText; }, 2000);
    });
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
  if (copyAllBtn) copyAllBtn.addEventListener('click', handleCopyAll);

  renderRules();
  inputEl.value = DEMO;
  render();
})();
