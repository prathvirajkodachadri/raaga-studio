/**
 * tracks-compose-app.js — Tracks Compose page controller (UI only).
 * Renders whatever TRACKS_COMPOSE data is loaded: the arrangement order, the
 * filters, the stats and the editable table. All naming/filtering logic lives
 * in tracks-compose.js so the page can never disagree with the tests.
 */
'use strict';

(function () {
  var TC = window.TRACKS_COMPOSE;
  if (!TC) { console.error('TRACKS_COMPOSE engine missing'); return; }

  var listEl = document.getElementById('tc-order-list');
  var tbody = document.getElementById('tc-tbody');
  var emptyEl = document.getElementById('tc-empty');
  var searchEl = document.getElementById('tc-search');
  var familyEl = document.getElementById('tc-family');
  var roleEl = document.getElementById('tc-role');
  var pluginEl = document.getElementById('tc-plugin');
  var resetEl = document.getElementById('tc-reset');
  var copyAllEl = document.getElementById('tc-copy-all');
  var exportEl = document.getElementById('tc-export');
  var shownEl = document.getElementById('tc-shown');
  var totalEl = document.getElementById('tc-total');
  var familyCountEl = document.getElementById('tc-family-count');
  var flashEl = document.getElementById('tc-flash');
  if (!tbody || !familyEl) return;

  var families = window.TRACKS_COMPOSE_FAMILIES || [];
  var data = (window.TRACKS_COMPOSE_TRACKS || []).slice();
  var activeFamily = '';
  var uid = 0;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function label(v) { return String(v == null ? '' : v).replace(/_/g, ' '); }

  function flash(msg) {
    if (!flashEl) return;
    flashEl.textContent = msg;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { flashEl.textContent = ''; }, 2200);
  }

  function filter() {
    return {
      q: searchEl ? searchEl.value : '',
      family: familyEl.value,
      role: roleEl ? roleEl.value : '',
      plugin: pluginEl ? pluginEl.value : ''
    };
  }

  function currentRows() { return TC.filterRows(data, filter()); }

  // ─── filter dropdowns ─────────────────────────────────────────────────────
  function fillSelect(el, values, placeholder) {
    if (!el) return;
    var keep = el.value;
    var options = values.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(label(v)) + '</option>';
    }).join('');
    el.innerHTML = '<option value="">' + placeholder + '</option>' + options;
    if (keep && values.some(function (v) { return v === keep; })) el.value = keep;
  }

  // ─── arrangement order sidebar ────────────────────────────────────────────
  function renderOrder() {
    if (!listEl) return;
    var used = TC.familiesInUse(data, families);
    var counts = {};
    data.forEach(function (row) {
      var f = TC.familyOf(row);
      counts[f] = (counts[f] || 0) + 1;
    });
    listEl.innerHTML = used.map(function (name, i) {
      var meta = TC.familyMeta(families, name);
      var num = (i + 1 < 10 ? '0' : '') + (i + 1);
      return '<button type="button" class="tc-seq' + (activeFamily === name ? ' active' : '') + '"' +
        ' data-family="' + esc(name) + '" style="--seq-color:' + esc(meta.color) + '"' +
        ' aria-pressed="' + (activeFamily === name ? 'true' : 'false') + '"' +
        ' title="' + esc(meta.note || name) + '">' +
        '<span class="tc-num">' + num + '</span><span>' + esc(label(name)) + '</span>' +
        '<span class="tc-seq-count">' + (counts[name] || 0) + '</span></button>';
    }).join('');
  }

  // ─── table ────────────────────────────────────────────────────────────────
  function render() {
    // SEQ stays stable while filtering: it is the row's place in the full library.
    TC.arrange(data, families).forEach(function (row, i) { row.__seq = i + 1; });

    var rows = currentRows();
    var arranged = TC.arrange(rows, families);
    var stats = TC.stats(data, rows, families);

    tbody.innerHTML = arranged.map(function (row) {
      var name = TC.familyOf(row);
      var meta = TC.familyMeta(families, name);
      if (!row.__id) row.__id = 'tc' + (++uid);
      var id = row.__id;
      return '<tr data-id="' + id + '">' +
        '<td class="tc-num">' + (row.__seq < 10 ? '0' : '') + row.__seq + '</td>' +
        '<td><span class="tc-badge" style="background:' + esc(meta.color) + '">' + esc(label(name)) + '</span></td>' +
        '<td><input class="tc-edit tc-instrument" type="text" value="' + esc(TC.instrumentOf(row)) + '" data-id="' + id + '" aria-label="Instrument for ' + esc(TC.trackNameOf(row)) + '"></td>' +
        '<td>' + esc(label(TC.roleOf(row))) + '</td>' +
        '<td><input class="tc-edit tc-plugin" type="text" value="' + esc(TC.pluginOf(row)) + '" data-id="' + id + '" aria-label="Plugin for ' + esc(TC.trackNameOf(row)) + '"></td>' +
        '<td class="tc-track" data-track="' + id + '">' + esc(TC.trackNameOf(row)) + '</td>' +
        '<td><button type="button" class="tc-copy" data-id="' + id + '">Copy</button></td>' +
        '</tr>';
    }).join('');

    emptyEl.hidden = arranged.length > 0;
    if (shownEl) shownEl.textContent = stats.shown;
    if (totalEl) totalEl.textContent = stats.total;
    if (familyCountEl) familyCountEl.textContent = stats.families;
    renderOrder();
  }

  function rowById(id) {
    for (var i = 0; i < data.length; i++) if (data[i].__id === id) return data[i];
    return null;
  }

  function refreshTrackName(row) {
    var cell = tbody.querySelector('[data-track="' + row.__id + '"]');
    if (cell) cell.textContent = TC.trackNameOf(row);
  }

  // ─── clipboard / download ─────────────────────────────────────────────────
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ─── events ───────────────────────────────────────────────────────────────
  if (searchEl) searchEl.addEventListener('input', render);
  familyEl.addEventListener('change', function () { activeFamily = familyEl.value; render(); });
  if (roleEl) roleEl.addEventListener('change', render);
  if (pluginEl) pluginEl.addEventListener('change', render);

  if (resetEl) {
    resetEl.addEventListener('click', function () {
      if (searchEl) searchEl.value = '';
      familyEl.value = ''; activeFamily = '';
      if (roleEl) roleEl.value = '';
      if (pluginEl) pluginEl.value = '';
      data.forEach(function (row) {
        Object.keys(row.__original || {}).forEach(function (k) { row[k] = row.__original[k]; });
        delete row.__edited;
      });
      render();
      flash('Library reset to the original names.');
    });
  }

  if (listEl) {
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.tc-seq') : null;
      if (!btn) return;
      var fam = btn.getAttribute('data-family') || '';
      var next = familyEl.value === fam ? '' : fam;
      familyEl.value = next; activeFamily = next;
      render();
      var main = document.querySelector('.tc-main');
      if (main && next && main.scrollIntoView) {
        try { main.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) { main.scrollIntoView(); }
      }
    });
  }

  tbody.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.classList || (!el.classList.contains('tc-instrument') && !el.classList.contains('tc-plugin'))) return;
    var row = rowById(el.getAttribute('data-id'));
    if (!row) return;
    if (el.classList.contains('tc-instrument')) {
      row.INSTRUMENT = el.value;
    } else if (Object.prototype.hasOwnProperty.call(row, 'PLUGIN EXAMPLE') && !Object.prototype.hasOwnProperty.call(row, 'PLUGIN')) {
      row['PLUGIN EXAMPLE'] = el.value;
    } else {
      row.PLUGIN = el.value;
    }
    row.__edited = true;
    refreshTrackName(row);
  });

  tbody.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.tc-copy') : null;
    if (!btn) return;
    var row = rowById(btn.getAttribute('data-id'));
    if (!row) return;
    copyText(TC.trackNameOf(row)).then(function () {
      var old = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('copied'); }, 900);
    });
  });

  if (copyAllEl) {
    copyAllEl.addEventListener('click', function () {
      var rows = TC.arrange(currentRows(), families);
      copyText(rows.map(function (r) { return TC.trackNameOf(r); }).join('\n'))
        .then(function () { flash(rows.length + ' track names copied in arrangement order.'); });
    });
  }

  if (exportEl) {
    exportEl.addEventListener('click', function () {
      download('raaga-tracks-compose.csv', TC.toCsv(currentRows(), families), 'text/csv;charset=utf-8');
      flash('CSV exported.');
    });
  }

  // ─── boot ─────────────────────────────────────────────────────────────────
  data.forEach(function (row) {
    row.__original = {};
    Object.keys(row).forEach(function (k) {
      if (k.indexOf('__') !== 0) row.__original[k] = row[k];
    });
  });

  var inUse = TC.familiesInUse(data, families);
  fillSelect(familyEl, inUse, 'All families');
  fillSelect(roleEl, TC.uniqueValues(data, 'ROLE'), 'All roles');
  fillSelect(pluginEl, TC.uniqueValues(data, 'PLUGIN').concat(TC.uniqueValues(data, 'PLUGIN EXAMPLE')), 'All plugins');
  render();

  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.tracksCompose = {
    rows: currentRows,
    trackNames: function () { return TC.nameList(currentRows(), families); },
    csv: function () { return TC.toCsv(currentRows(), families); },
    makeTrackName: TC.makeTrackName,
    setSearch: function (v) { if (searchEl) { searchEl.value = v; render(); } },
    setFamily: function (v) { familyEl.value = v; activeFamily = v; render(); }
  };
})();
