/**
 * release-planner-app.js — UI controller for Release Planner & Artwork Validator tab.
 */
'use strict';

(function () {
  var RP = window.RELEASE_PLANNER;
  if (!RP) return;

  var LS_DIST_CHECK = 'raaga.distributionChecklist';

  // Artwork elements
  var artDropzone = document.getElementById('rp-art-dropzone');
  var artFile = document.getElementById('rp-art-file');
  var artBrowseBtn = document.getElementById('rp-art-browse');
  var artResults = document.getElementById('rp-art-results');
  var artMockupImg = document.getElementById('rp-mockup-img');
  var artMockupTitle = document.getElementById('rp-mockup-title');
  var artMockupArtist = document.getElementById('rp-mockup-artist');

  // ISRC elements
  var isrcCountry = document.getElementById('rp-isrc-country');
  var isrcReg = document.getElementById('rp-isrc-reg');
  var isrcYear = document.getElementById('rp-isrc-year');
  var isrcSeq = document.getElementById('rp-isrc-seq');
  var isrcGenBtn = document.getElementById('rp-isrc-gen');
  var isrcOutput = document.getElementById('rp-isrc-output');
  var isrcCopyBtn = document.getElementById('rp-isrc-copy');

  // Metadata elements
  var metaTitle = document.getElementById('rp-meta-title');
  var metaArtist = document.getElementById('rp-meta-artist');
  var metaLyricist = document.getElementById('rp-meta-lyricist');
  var metaComposer = document.getElementById('rp-meta-composer');
  var metaGenre = document.getElementById('rp-meta-genre');
  var metaIsrc = document.getElementById('rp-meta-isrc');
  var metaExportJson = document.getElementById('rp-meta-export-json');
  var metaCopyText = document.getElementById('rp-meta-copy-text');

  // Distribution checklist element
  var distChkListEl = document.getElementById('rp-dist-checklist');

  var currentArtworkReport = null;

  // ─── Artwork Validation ──────────────────────────────────────────────────
  function handleArtwork(file) {
    if (!file) return;
    RP.validateArtwork(file).then(function (report) {
      currentArtworkReport = report;
      renderArtworkResults(report);
      if (artMockupImg) {
        artMockupImg.src = report.url;
        artMockupImg.hidden = false;
      }
    }).catch(function (err) {
      if (artResults) {
        artResults.innerHTML = '<div class="panel error"><p>Error validating artwork: ' + escapeHtml(err.message || err) + '</p></div>';
      }
    });
  }

  function renderArtworkResults(r) {
    if (!artResults) return;
    var stCls = r.ready ? 'pass' : (r.score >= 50 ? 'warn' : 'fail');
    var html = '<div class="panel rp-art-card ' + stCls + '">';
    html += '<div class="rp-art-head">';
    html += '<div><h3>' + escapeHtml(r.fileName) + '</h3><span class="hint">' + r.width + ' × ' + r.height + ' px · ' + r.sizeMb.toFixed(2) + ' MB</span></div>';
    html += '<div class="rp-art-score ' + stCls + '"><b>' + r.score + '</b><span>/100</span></div>';
    html += '</div>';

    html += '<div class="rp-art-status ' + stCls + '">' +
      (r.ready ? '✅ Artwork meets all major streaming store requirements (Spotify, Apple Music).' :
       '⚠️ Minor issues found — review the checklist below before distributing.') + '</div>';

    html += '<div class="rp-checks-list">';
    r.checks.forEach(function (c) {
      html += '<div class="rp-check-item ' + c.status + '">';
      html += '<span class="rp-ico">' + (c.status === 'pass' ? '🟢' : c.status === 'warn' ? '🟡' : '🔴') + '</span>';
      html += '<div class="rp-c-body">';
      html += '<div class="rp-c-top"><strong>' + escapeHtml(c.name) + ':</strong> <span class="rp-c-val">' + escapeHtml(c.value) + '</span></div>';
      html += '<div class="rp-c-target">Requirement: ' + escapeHtml(c.target) + '</div>';
      if (c.advice) html += '<div class="rp-c-advice">' + escapeHtml(c.advice) + '</div>';
      html += '</div></div>';
    });
    html += '</div></div>';

    artResults.innerHTML = html;
  }

  function initArtworkDrop() {
    if (artBrowseBtn && artFile) {
      artBrowseBtn.addEventListener('click', function () { artFile.click(); });
      artFile.addEventListener('change', function () {
        if (artFile.files[0]) handleArtwork(artFile.files[0]);
        artFile.value = '';
      });
    }

    if (artDropzone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        artDropzone.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          artDropzone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        artDropzone.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          artDropzone.classList.remove('dragover');
        });
      });
      artDropzone.addEventListener('drop', function (e) {
        if (e.dataTransfer.files[0]) handleArtwork(e.dataTransfer.files[0]);
      });
      artDropzone.addEventListener('click', function () { artFile.click(); });
    }
  }

  // ─── ISRC Generator ──────────────────────────────────────────────────────
  function initIsrc() {
    if (isrcGenBtn) {
      isrcGenBtn.addEventListener('click', function () {
        var c = isrcCountry ? isrcCountry.value : 'IN';
        var r = isrcReg ? isrcReg.value : 'RGS';
        var y = isrcYear ? isrcYear.value : (new Date().getFullYear() % 100);
        var s = isrcSeq ? +isrcSeq.value : 1;

        var isrcObj = RP.generateIsrc(c, r, y, s);
        if (isrcOutput) isrcOutput.value = isrcObj.formatted;
        if (metaIsrc) metaIsrc.value = isrcObj.formatted;

        // Auto increment seq for next track
        if (isrcSeq) isrcSeq.value = s + 1;
      });
    }

    if (isrcCopyBtn && isrcOutput) {
      isrcCopyBtn.addEventListener('click', function () {
        var code = isrcOutput.value.trim();
        if (!code) return;
        if (navigator.clipboard) navigator.clipboard.writeText(code);
        isrcCopyBtn.textContent = 'Copied!';
        setTimeout(function () { isrcCopyBtn.textContent = 'Copy ISRC'; }, 1500);
      });
    }
  }

  // ─── Metadata Form & Export ──────────────────────────────────────────────
  function initMetadata() {
    if (metaTitle && artMockupTitle) {
      metaTitle.addEventListener('input', function () {
        artMockupTitle.textContent = metaTitle.value || 'Song Title';
      });
    }
    if (metaArtist && artMockupArtist) {
      metaArtist.addEventListener('input', function () {
        artMockupArtist.textContent = metaArtist.value || 'Artist Name';
      });
    }

    if (metaExportJson) {
      metaExportJson.addEventListener('click', function () {
        var data = {
          title: metaTitle ? metaTitle.value.trim() : '',
          artist: metaArtist ? metaArtist.value.trim() : '',
          lyricist: metaLyricist ? metaLyricist.value.trim() : '',
          composer: metaComposer ? metaComposer.value.trim() : '',
          genre: metaGenre ? metaGenre.value.trim() : '',
          isrc: metaIsrc ? metaIsrc.value.trim() : '',
          artworkValidated: !!(currentArtworkReport && currentArtworkReport.ready),
          exportedAt: new Date().toISOString()
        };
        var text = JSON.stringify(data, null, 2);
        downloadFile((data.title || 'release-metadata').replace(/\s+/g, '-') + '.json', text, 'application/json');
      });
    }

    if (metaCopyText) {
      metaCopyText.addEventListener('click', function () {
        var lines = [
          'Track Title: ' + (metaTitle ? metaTitle.value : ''),
          'Primary Artist: ' + (metaArtist ? metaArtist.value : ''),
          'Kannada Lyricist: ' + (metaLyricist ? metaLyricist.value : ''),
          'Composer / Music Director: ' + (metaComposer ? metaComposer.value : ''),
          'Genre: ' + (metaGenre ? metaGenre.value : ''),
          'ISRC: ' + (metaIsrc ? metaIsrc.value : '')
        ];
        var text = lines.join('\n');
        if (navigator.clipboard) navigator.clipboard.writeText(text);
        metaCopyText.textContent = 'Copied!';
        setTimeout(function () { metaCopyText.textContent = 'Copy Release Text'; }, 1500);
      });
    }
  }

  // ─── Distribution Checklist ──────────────────────────────────────────────
  function loadDistChecklist() {
    try {
      return JSON.parse(localStorage.getItem(LS_DIST_CHECK) || '{}');
    } catch (e) { return {}; }
  }

  function saveDistChecklist(obj) {
    try { localStorage.setItem(LS_DIST_CHECK, JSON.stringify(obj)); } catch (e) {}
  }

  function renderDistChecklist() {
    if (!distChkListEl) return;
    var state = loadDistChecklist();
    var list = RP.DISTRIBUTION_CHECKLIST;
    var html = '';

    list.forEach(function (item) {
      var isChecked = !!state[item.id];
      html += '<label class="chk rp-dist-item' + (isChecked ? ' on' : '') + '">';
      html += '<input type="checkbox" data-chk-id="' + item.id + '"' + (isChecked ? ' checked' : '') + '>';
      html += '<span class="rp-chk-label"><small class="rp-chk-group">[' + item.group + ']</small> ' + escapeHtml(item.label) + '</span>';
      html += '</label>';
    });

    distChkListEl.innerHTML = html;

    distChkListEl.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-chk-id');
        var cur = loadDistChecklist();
        if (cb.checked) cur[id] = true;
        else delete cur[id];
        saveDistChecklist(cur);
        renderDistChecklist();
      });
    });
  }

  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    initArtworkDrop();
    initIsrc();
    initMetadata();
    renderDistChecklist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
