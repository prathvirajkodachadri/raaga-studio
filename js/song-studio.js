/**
 * song-studio.js — Song Studio tab: project registry, workflow & DAW setup guides.
 * One card per song: status (Idea → … → Released), Suno links, session notes,
 * stem-export / mix / master checklists, and a version log. Stored in
 * localStorage, exportable/importable as JSON.
 */
'use strict';

(function () {
  var LS_KEY = 'raaga.songs';
  var DG = window.DAW_GUIDES;

  var STATUSES = ['Idea', 'Composing', 'Suno', 'Mixing', 'Mastering', 'Released'];

  var CHECKLISTS = {
    suno: [
      'Download the final full mix (WAV) from Suno',
      'Download instrumental / stems (vocals, music)',
      'Name stems consistently — SongTitle_Stem_Vocals.wav',
      'Confirm sample rate & bit depth (48 kHz / 24-bit)',
      'Import stems into Cubase, align to project grid',
      'Trim head/tail silence before mixing'
    ],
    mix: [
      'Gain-stage stems so the bus sits ≈ −18 dBFS',
      'High-pass mud out of non-bass tracks',
      'Balance levels before EQ / compression',
      'Check mono compatibility (phase)',
      'A/B against a reference track (Reference Compare)',
      'Leave headroom — peaks ≤ −6 dBFS',
      'Bounce mixdown as WAV 24-bit for Mix Check'
    ],
    master: [
      'Run Mix Check on the mixdown (Mix Check tab)',
      'Master with limiter ceiling ≤ −1 dBTP',
      'Target platform loudness (−14 Spotify / −16 Apple)',
      'Run Master Check on the final master',
      'Embed metadata + ISRC in Release Planner',
      'Attach 3000×3000 artwork (validate in Release Planner)',
      'Export release files (WAV 24-bit + 16-bit CD)'
    ]
  };

  // ─── Element refs ────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  var stripEl = $('ss-strip');
  var listEl = $('ss-list');
  var editorEl = $('ss-editor');
  var editorTitle = $('ss-editor-title');
  var addBtn = $('ss-add');
  var exportAllBtn = $('ss-export-all');
  var importBtn = $('ss-import-btn');
  var importInput = $('ss-import');
  var saveBtn = $('ss-save');
  var closeBtn = $('ss-close');
  var deleteBtn = $('ss-delete');
  var exportOneBtn = $('ss-export-one');
  var gotoMixBtn = $('ss-goto-mix');
  var gotoMasterBtn = $('ss-goto-master');
  var gotoReleaseBtn = $('ss-goto-release');

  var fields = {
    title: $('ss-title'),
    artist: $('ss-artist'),
    genre: $('ss-genre'),
    bpm: $('ss-bpm'),
    key: $('ss-key'),
    status: $('ss-status'),
    links: $('ss-links'),
    notes: $('ss-notes')
  };
  var chkEls = { suno: $('ss-suno-chk'), mix: $('ss-mix-chk'), master: $('ss-master-chk') };
  var verName = $('ss-ver-name');
  var verNotes = $('ss-ver-notes');
  var verAddBtn = $('ss-ver-add');
  var versionsEl = $('ss-versions');
  var dawGuideEl = $('ss-daw-guide');
  var chainPresetsEl = $('ss-chain-presets');

  // ─── State ───────────────────────────────────────────────────────────────
  var songs = load();
  var currentId = null;

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(songs)); } catch (e) {}
  }

  function today() {
    return new Date().toLocaleDateString();
  }

  function newSong() {
    return {
      id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: '', artist: '', genre: '', bpm: '', key: '',
      status: 'Idea', links: '', notes: '',
      checklists: { suno: {}, mix: {}, master: {} },
      versions: [],
      createdAt: today(), updatedAt: today()
    };
  }

  // ─── Status strip ────────────────────────────────────────────────────────
  function renderStrip() {
    if (!stripEl) return;
    var counts = {};
    STATUSES.forEach(function (s) { counts[s] = 0; });
    songs.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
    var html = '';
    STATUSES.forEach(function (s, i) {
      html += '<div class="ss-stage' + (i < STATUSES.length - 1 ? ' arrow' : '') + '">' +
        '<span class="ss-stage-name">' + s + '</span>' +
        '<span class="ss-stage-count' + (counts[s] ? ' has' : '') + '">' + counts[s] + '</span></div>';
    });
    stripEl.innerHTML = '<div class="ss-strip-inner">' + html + '</div>';
  }

  // ─── List ────────────────────────────────────────────────────────────────
  function renderList() {
    if (!listEl) return;
    if (!songs.length) {
      listEl.innerHTML = '<div class="panel ss-empty"><h3>No songs yet</h3>' +
        '<p class="hint">Hit “+ New song” to start tracking a track — from the Suno prompt through mixing and mastering.</p></div>';
      return;
    }
    listEl.innerHTML = '<div class="ss-cards">' + songs.map(function (s, i) {
      var meta = [s.bpm && (s.bpm + ' BPM'), s.key, s.genre].filter(Boolean);
      var progress = overallProgress(s);
      return '<div class="panel ss-card">' +
        '<div class="ss-card-top">' +
        '<div class="ss-card-idx">' + (i + 1) + '</div>' +
        '<div class="ss-card-titles"><div class="ss-card-title">' + escapeHtml(s.title || 'Untitled') + '</div>' +
        '<div class="ss-card-artist">' + escapeHtml(s.artist || '—') + '</div></div>' +
        '<span class="ss-badge st-' + cssClass(s.status) + '">' + escapeHtml(s.status) + '</span>' +
        '</div>' +
        '<div class="ss-card-meta">' + (meta.length ? meta.map(escapeHtml).join(' · ') : '') + '</div>' +
        '<div class="ss-card-bottom">' +
        '<span class="ss-card-progress">' + progress.done + '/' + progress.total + ' checklist items</span>' +
        '<span class="ss-card-date">' + escapeHtml(s.updatedAt || '') + '</span>' +
        '<div class="ss-card-actions">' +
        '<button type="button" class="btn sm" data-edit="' + s.id + '">Edit</button>' +
        '<button type="button" class="btn sm danger" data-del="' + s.id + '">Delete</button>' +
        '</div></div></div>';
    }).join('') + '</div>';
    listEl.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { openEditor(b.getAttribute('data-edit')); });
    });
    listEl.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { deleteSong(b.getAttribute('data-del')); });
    });
  }

  function overallProgress(s) {
    var done = 0, total = 0;
    Object.keys(CHECKLISTS).forEach(function (k) {
      CHECKLISTS[k].forEach(function (_, idx) {
        total++;
        if (s.checklists && s.checklists[k] && s.checklists[k][idx]) done++;
      });
    });
    return { done: done, total: total };
  }

  function cssClass(status) {
    return String(status).toLowerCase().replace(/[^a-z]/g, '');
  }

  // ─── Editor ──────────────────────────────────────────────────────────────
  function openEditor(id) {
    var s = songs.find(function (x) { return x.id === id; });
    if (!s) return;
    currentId = id;
    fields.title.value = s.title || '';
    fields.artist.value = s.artist || '';
    fields.genre.value = s.genre || '';
    fields.bpm.value = s.bpm || '';
    fields.key.value = s.key || '';
    fields.status.value = STATUSES.indexOf(s.status) >= 0 ? s.status : 'Idea';
    fields.links.value = s.links || '';
    fields.notes.value = s.notes || '';
    editorTitle.textContent = (s.title || 'Untitled') + ' — song details';
    renderChecklists();
    renderVersions();
    renderDawGuides();
    editorEl.hidden = false;
    editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEditor() {
    currentId = null;
    editorEl.hidden = true;
  }

  function saveCurrent() {
    var s = currentId ? songs.find(function (x) { return x.id === currentId; }) : null;
    if (!s) { s = newSong(); songs.unshift(s); }
    s.title = fields.title.value.trim();
    s.artist = fields.artist.value.trim();
    s.genre = fields.genre.value.trim();
    s.bpm = fields.bpm.value.trim();
    s.key = fields.key.value.trim();
    s.status = STATUSES.indexOf(fields.status.value) >= 0 ? fields.status.value : 'Idea';
    s.links = fields.links.value;
    s.notes = fields.notes.value;
    s.updatedAt = today();
    persist();
    currentId = s.id;
    renderStrip();
    renderList();
    editorTitle.textContent = (s.title || 'Untitled') + ' — song details';
    if (editorEl.hidden) { editorEl.hidden = false; }
    flash('Saved “' + (s.title || 'Untitled') + '”.');
  }

  function deleteSong(id) {
    var s = songs.find(function (x) { return x.id === id; });
    if (!s) return;
    if (!confirm('Delete “' + (s.title || 'Untitled') + '”? This cannot be undone.')) return;
    songs = songs.filter(function (x) { return x.id !== id; });
    if (currentId === id) closeEditor();
    persist();
    renderStrip();
    renderList();
  }

  // ─── Checklists ──────────────────────────────────────────────────────────
  function renderChecklists() {
    var s = currentId ? songs.find(function (x) { return x.id === currentId; }) : null;
    if (!s) return;
    Object.keys(CHECKLISTS).forEach(function (k) {
      var el = chkEls[k];
      if (!el) return;
      var items = CHECKLISTS[k];
      var done = 0;
      items.forEach(function (label, idx) {
        if (s.checklists[k] && s.checklists[k][idx]) done++;
      });
      el.innerHTML = items.map(function (label, idx) {
        var on = !!(s.checklists[k] && s.checklists[k][idx]);
        return '<label class="chk ss-chk' + (on ? ' on' : '') + '">' +
          '<input type="checkbox" data-g="' + k + '" data-i="' + idx + '"' + (on ? ' checked' : '') + '>' +
          '<span>' + escapeHtml(label) + '</span></label>';
      }).join('') +
        '<div class="ss-chk-progress">' + done + '/' + items.length + ' done</div>';
      el.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var g = cb.getAttribute('data-g');
          var i = +cb.getAttribute('data-i');
          var song = songs.find(function (x) { return x.id === currentId; });
          if (!song) return;
          if (!song.checklists[g]) song.checklists[g] = {};
          if (cb.checked) song.checklists[g][i] = true;
          else delete song.checklists[g][i];
          song.updatedAt = today();
          persist();
          renderChecklists();
          renderList();
        });
      });
    });
  }

  // ─── Versions ────────────────────────────────────────────────────────────
  function renderVersions() {
    var s = currentId ? songs.find(function (x) { return x.id === currentId; }) : null;
    if (!versionsEl || !s) return;
    if (!s.versions.length) {
      versionsEl.innerHTML = '<p class="hint">No versions logged yet. Add “Mix v1”, “Master v2”… or choose a mastering chain preset below.</p>';
      return;
    }
    versionsEl.innerHTML = s.versions.map(function (v, i) {
      return '<div class="ss-ver">' +
        '<div class="ss-ver-info"><b>' + escapeHtml(v.name) + '</b>' +
        (v.notes ? '<span class="ss-ver-notes">' + escapeHtml(v.notes) + '</span>' : '') +
        '<span class="ss-ver-date">' + escapeHtml(v.at) + '</span></div>' +
        '<button type="button" class="btn sm danger" data-vi="' + i + '">✕</button></div>';
    }).join('');
    versionsEl.querySelectorAll('[data-vi]').forEach(function (b) {
      b.addEventListener('click', function () {
        var song = songs.find(function (x) { return x.id === currentId; });
        if (!song) return;
        song.versions.splice(+b.getAttribute('data-vi'), 1);
        song.updatedAt = today();
        persist();
        renderVersions();
      });
    });
  }

  function addVersion(name, notes) {
    var s = currentId ? songs.find(function (x) { return x.id === currentId; }) : null;
    if (!s) return;
    name = (name || (verName ? verName.value : '') || '').trim();
    notes = (notes || (verNotes ? verNotes.value : '') || '').trim();
    if (!name && !notes) { flash('Give the version a name (e.g. Mix v2).'); return; }
    s.versions.unshift({ name: name || 'Version ' + (s.versions.length + 1), notes: notes, at: today() });
    s.updatedAt = today();
    if (verName) verName.value = '';
    if (verNotes) verNotes.value = '';
    persist();
    renderVersions();
    flash('Version added.');
  }

  // ─── DAW Guides & Chain Presets ──────────────────────────────────────────
  function renderDawGuides() {
    if (!DG) return;

    if (chainPresetsEl && DG.MASTERING_CHAINS) {
      var cHtml = '<div class="ss-chain-grid">';
      DG.MASTERING_CHAINS.forEach(function (ch) {
        cHtml += '<div class="panel ss-chain-card">';
        cHtml += '<h5>' + escapeHtml(ch.name) + '</h5>';
        cHtml += '<span class="ss-chain-target">Target: ' + escapeHtml(ch.target) + '</span>';
        cHtml += '<ol class="ss-chain-steps">';
        ch.plugins.forEach(function (p) {
          cHtml += '<li><strong>' + escapeHtml(p.type) + ':</strong> ' + escapeHtml(p.settings) + '</li>';
        });
        cHtml += '</ol>';
        cHtml += '<button type="button" class="btn sm ss-add-chain-btn" data-chain-id="' + ch.id + '">+ Log this chain in Versions</button>';
        cHtml += '</div>';
      });
      cHtml += '</div>';
      chainPresetsEl.innerHTML = cHtml;

      chainPresetsEl.querySelectorAll('.ss-add-chain-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cid = btn.getAttribute('data-chain-id');
          var chain = DG.MASTERING_CHAINS.find(function (c) { return c.id === cid; });
          if (!chain) return;
          var notesStr = chain.name + ' (' + chain.target + '): ' +
            chain.plugins.map(function (p) { return p.order + '. ' + p.type; }).join(' → ');
          addVersion('Master Chain (' + chain.name.split(' ')[0] + ')', notesStr);
        });
      });
    }

    if (dawGuideEl && DG.DAW_TEMPLATES) {
      var dHtml = '<div class="ss-daw-accordion">';
      Object.keys(DG.DAW_TEMPLATES).forEach(function (k) {
        var t = DG.DAW_TEMPLATES[k];
        dHtml += '<details class="ss-daw-details">';
        dHtml += '<summary><strong>' + escapeHtml(t.name) + '</strong> — ' + escapeHtml(t.summary) + '</summary>';
        dHtml += '<div class="body"><ol>';
        t.steps.forEach(function (st) {
          dHtml += '<li><strong>' + escapeHtml(st.step) + ':</strong> ' + escapeHtml(st.text) + '</li>';
        });
        dHtml += '</ol></div></details>';
      });
      dHtml += '</div>';
      dawGuideEl.innerHTML = dHtml;
    }
  }

  // ─── Export / Import ─────────────────────────────────────────────────────
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function exportAll() {
    if (!songs.length) { flash('Nothing to export — add a song first.'); return; }
    download('raaga-studio-songs-' + today().replace(/\//g, '-') + '.json', JSON.stringify(songs, null, 2));
  }

  function exportOne() {
    var s = currentId ? songs.find(function (x) { return x.id === currentId; }) : null;
    if (!s) { flash('Open a song first.'); return; }
    download((s.title || 'song').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.json',
      JSON.stringify(s, null, 2));
  }

  function importSongs(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var arr = Array.isArray(data) ? data : (data.songs ? data.songs : null);
        if (!arr || !arr.length) throw new Error('no songs found');
        var count = 0;
        arr.forEach(function (incoming) {
          if (!incoming || !incoming.id || !incoming.title) return;
          var existing = songs.find(function (x) { return x.id === incoming.id; });
          var merged = Object.assign(newSong(), existing || {}, incoming);
          merged.checklists = Object.assign({ suno: {}, mix: {}, master: {} }, incoming.checklists || {});
          merged.versions = Array.isArray(incoming.versions) ? incoming.versions : [];
          if (existing) { songs[songs.indexOf(existing)] = merged; } else { songs.push(merged); }
          count++;
        });
        persist();
        renderStrip();
        renderList();
        flash('Imported ' + count + ' song(s).');
      } catch (e) {
        flash('Import failed: ' + String(e.message || e));
      }
    };
    reader.readAsText(file);
  }

  // ─── Flash ───────────────────────────────────────────────────────────────
  var flashEl = null;
  function flash(msg) {
    if (!flashEl) {
      flashEl = document.createElement('div');
      flashEl.className = 'ss-flash';
      var strip = $('ss-strip');
      (strip || listEl || editorEl).parentNode.appendChild(flashEl);
    }
    flashEl.textContent = msg;
    flashEl.classList.add('show');
    clearTimeout(flashEl._t);
    flashEl._t = setTimeout(function () { flashEl.classList.remove('show'); }, 2400);
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  function init() {
    if (fields.status) {
      fields.status.innerHTML = STATUSES.map(function (s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
    }

    if (addBtn) addBtn.addEventListener('click', function () {
      var s = newSong();
      songs.unshift(s);
      currentId = s.id;
      persist();
      renderStrip();
      renderList();
      openEditor(s.id);
    });
    if (saveBtn) saveBtn.addEventListener('click', saveCurrent);
    if (closeBtn) closeBtn.addEventListener('click', closeEditor);
    if (deleteBtn) deleteBtn.addEventListener('click', function () { deleteSong(currentId); });
    if (exportAllBtn) exportAllBtn.addEventListener('click', exportAll);
    if (exportOneBtn) exportOneBtn.addEventListener('click', exportOne);
    if (importBtn && importInput) {
      importBtn.addEventListener('click', function () { importInput.click(); });
      importInput.addEventListener('change', function () {
        if (importInput.files[0]) importSongs(importInput.files[0]);
        importInput.value = '';
      });
    }
    if (verAddBtn) verAddBtn.addEventListener('click', function () { addVersion(); });
    if (verName) verName.addEventListener('keydown', function (e) { if (e.key === 'Enter') addVersion(); });
    if (gotoMixBtn && window.RaagaStudio) {
      gotoMixBtn.addEventListener('click', function () { window.RaagaStudio.switchTo('mix'); });
    }
    if (gotoMasterBtn && window.RaagaStudio) {
      gotoMasterBtn.addEventListener('click', function () { window.RaagaStudio.switchTo('master'); });
    }
    if (gotoReleaseBtn && window.RaagaStudio) {
      gotoReleaseBtn.addEventListener('click', function () { window.RaagaStudio.switchTo('release'); });
    }

    renderStrip();
    renderList();
    renderDawGuides();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
