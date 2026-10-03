/**
 * tracks-compose.js — engine for the Tracks Compose page.
 * Pure helpers only: naming convention, arrangement order, filtering, stats
 * and CSV export. No DOM, no network, no audio. The page controller lives in
 * tracks-compose-app.js and the library itself in tracks-compose-data.js.
 *
 * Naming convention: FAMILY_INSTRUMENT_ROLE_PLUGIN_INSTANCE
 *   DRONE_TANPURA_DRONE_KONTAKT_01
 * The instance suffix keeps doubles (DL, HARM, room mics) apart in Cubase.
 */
'use strict';

(function (root) {
  var DEFAULT_FAMILIES = [
    { name: 'DRONE', color: '#D9EAD3', note: 'Tanpura and sruti — tune first, print last' },
    { name: 'PERCUSSION', color: '#FCE5CD', note: 'Mridangam, ghatam, kanjira, tabla, dholak' },
    { name: 'DRUMS', color: '#FFE8B5', note: 'Kit and program loops for film / fusion' },
    { name: 'BASS', color: '#CFE2F3', note: 'Bass guitar and synth sub' },
    { name: 'RHYTHMIC', color: '#FFF2CC', note: 'Rhythm guitars, mandolin, ukulele, veena rhythm' },
    { name: 'HARMONY', color: '#D9D2E9', note: 'Piano, harmonium, pads, beds' },
    { name: 'MELODY', color: '#C9DAF8', note: 'Lead instruments — flute, veena, sitar, violin' },
    { name: 'STRINGS', color: '#EADCF8', note: 'Violin sections, viola, cello, contrabass' },
    { name: 'WIND', color: '#B6D7A8', note: 'Bansuri, nadaswaram, shehnai, clarinet' },
    { name: 'SYNTHS', color: '#D0E0E3', note: 'Synth leads, arps, plucks, atmos' },
    { name: 'VOCALS', color: '#F4CCCC', note: 'Lead vocals and doubles' },
    { name: 'BACKING_VOCALS', color: '#F9CB9C', note: 'Harmony stack, chorus, group rows' },
    { name: 'FOLK', color: '#E6D0A8', note: 'Dollu, chande, yakshagana, bhajan' },
    { name: 'FX', color: '#CCCCCC', note: 'Risers, impacts, ambience, transitions' }
  ];

  var COLUMNS = ['SEQ', 'FAMILY', 'INSTRUMENT', 'ROLE', 'PLUGIN', 'TRACK NAME'];

  // ─── small helpers ────────────────────────────────────────────────────────
  function norm(v) {
    return String(v == null ? '' : v).trim().toLowerCase().replace(/[\s_]+/g, '_');
  }

  function pick(row, keys) {
    if (!row) return '';
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      for (var key in row) {
        if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
        if (norm(key) === norm(k)) {
          var v = row[key];
          if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
      }
    }
    return '';
  }

  /**
   * Upper-case token safe for a DAW track name. Kannada (and other Indic)
   * syllables are kept whole: letters, digits, combining marks such as the
   * virama and vowel signs, plus the zero-width joiners some scripts need.
   */
  var SLUG_KEEP = /[^\p{L}\p{N}\p{M}\u200c\u200d]+/gu;
  var SLUG_FALLBACK = /[^A-Za-z0-9]+/g;
  function slug(v) {
    var s = String(v == null ? '' : v).trim();
    try {
      s = s.replace(SLUG_KEEP, '_');
    } catch (e) {
      s = s.replace(SLUG_FALLBACK, '_');
    }
    return s.replace(/_+/g, '_').replace(/^_|_$/g, '').toUpperCase();
  }

  function familyOf(row) { return slug(pick(row, ['FAMILY']) || 'UNSORTED'); }
  function instrumentOf(row) { return pick(row, ['INSTRUMENT', 'INSTRUMENT NAME']) || 'INSTRUMENT'; }
  function roleOf(row) { return slug(pick(row, ['ROLE']) || 'ROLE'); }
  function pluginOf(row) { return pick(row, ['PLUGIN', 'PLUGIN EXAMPLE', 'PLUGIN_EXAMPLE']); }
  function instanceOf(row) {
    var n = pick(row, ['INSTANCE', 'INST']);
    if (n === '') return '01';
    var s = String(n).trim();
    return /^\d+$/.test(s) ? (s.length < 2 ? '0' + s : s) : slug(s);
  }

  /**
   * FAMILY_INSTRUMENT_ROLE_PLUGIN_INSTANCE. Placeholder plugins ("—", "-", "")
   * are dropped so the name never ends up with an empty segment.
   */
  function makeTrackName(row) {
    var parts = [familyOf(row), slug(instrumentOf(row)), roleOf(row)];
    var plugin = pluginOf(row);
    if (plugin && !/^[—–-]+$/.test(String(plugin).trim())) parts.push(slug(plugin));
    parts.push(instanceOf(row));
    return parts.filter(function (p) { return p !== ''; }).join('_');
  }

  /** Row's own TRACK NAME when supplied, otherwise the generated one. */
  function trackNameOf(row) {
    var given = pick(row, ['TRACK NAME', 'PROFESSIONAL TRACK NAME']);
    if (given) return String(given);
    return makeTrackName(row);
  }

  // ─── library shape ────────────────────────────────────────────────────────
  function families(list) {
    var source = (list && list.length ? list : DEFAULT_FAMILIES);
    return source.map(function (f) {
      if (typeof f === 'string') return { name: slug(f), color: '#E8DFC8', note: '' };
      return { name: slug(f.name || f.FAMILY), color: f.color || '#E8DFC8', note: f.note || '' };
    });
  }

  function familyNames(list) {
    return families(list).map(function (f) { return f.name; });
  }

  function familyMeta(list, name) {
    var all = families(list), want = slug(name);
    for (var i = 0; i < all.length; i++) if (all[i].name === want) return all[i];
    return { name: want, color: '#E8DFC8', note: '' };
  }

  /** Families present in the data, in recommended order (unknown ones last). */
  function familiesInUse(data, list) {
    var order = familyNames(list), seen = [], used = {};
    (data || []).forEach(function (row) {
      var f = familyOf(row);
      if (!used[f]) { used[f] = true; seen.push(f); }
    });
    return seen.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia < 0) ia = order.length + 1;
      if (ib < 0) ib = order.length + 1;
      if (ia !== ib) return ia - ib;
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }

  /** Arrangement order: family order first, original order inside a family. */
  function arrange(data, list) {
    var order = familyNames(list);
    return (data || []).map(function (row, i) { return { row: row, i: i }; })
      .sort(function (a, b) {
        var fa = order.indexOf(familyOf(a.row)), fb = order.indexOf(familyOf(b.row));
        if (fa < 0) fa = order.length + 1;
        if (fb < 0) fb = order.length + 1;
        if (fa !== fb) return fa - fb;
        return a.i - b.i;
      })
      .map(function (entry) { return entry.row; });
  }

  function uniqueValues(data, key) {
    var out = [], seen = {};
    (data || []).forEach(function (row) {
      var v = String(pick(row, [key]) || '').trim();
      if (!v || seen[norm(v)]) return;
      seen[norm(v)] = true; out.push(v);
    });
    return out.sort(function (a, b) { return a.localeCompare(b); });
  }

  function filterRows(data, filter) {
    var f = filter || {};
    var q = norm(f.q), fam = norm(f.family), role = norm(f.role), plugin = norm(f.plugin);
    return (data || []).filter(function (row) {
      if (fam && norm(familyOf(row)) !== fam) return false;
      if (role && norm(pick(row, ['ROLE'])) !== role) return false;
      if (plugin && norm(pluginOf(row)) !== plugin) return false;
      if (!q) return true;
      var haystack = [familyOf(row), instrumentOf(row), pick(row, ['ROLE']), pluginOf(row),
        trackNameOf(row), pick(row, ['NOTES', 'NOTE'])].map(norm).join(' ');
      return haystack.indexOf(q) >= 0;
    });
  }

  function stats(data, rows, list) {
    var shown = rows || data || [];
    return {
      shown: shown.length,
      total: (data || []).length,
      families: familiesInUse(data, list).length,
      edits: shown.filter(function (r) { return !!r.__edited; }).length
    };
  }

  // ─── export ───────────────────────────────────────────────────────────────
  function rowsForExport(data, list) {
    return arrange(data, list).map(function (row, i) {
      return {
        SEQ: String(i + 1),
        FAMILY: familyOf(row),
        INSTRUMENT: instrumentOf(row),
        ROLE: roleOf(row),
        PLUGIN: pluginOf(row),
        'TRACK NAME': trackNameOf(row)
      };
    });
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(data, list, columns) {
    var cols = columns && columns.length ? columns : COLUMNS;
    var lines = [cols.join(',')];
    rowsForExport(data, list).forEach(function (r) {
      lines.push(cols.map(function (c) { return csvCell(r[c]); }).join(','));
    });
    return lines.join('\n');
  }

  /** Track names in arrangement order — what you paste into a Cubase session. */
  function nameList(data, list) {
    return arrange(data, list).map(trackNameOf);
  }

  var api = {
    DEFAULT_FAMILIES: DEFAULT_FAMILIES,
    COLUMNS: COLUMNS,
    norm: norm, slug: slug, pick: pick,
    familyOf: familyOf, instrumentOf: instrumentOf, roleOf: roleOf,
    pluginOf: pluginOf, instanceOf: instanceOf,
    makeTrackName: makeTrackName, trackNameOf: trackNameOf,
    families: families, familyNames: familyNames, familyMeta: familyMeta,
    familiesInUse: familiesInUse, arrange: arrange,
    uniqueValues: uniqueValues, filterRows: filterRows, stats: stats,
    rowsForExport: rowsForExport, toCsv: toCsv, nameList: nameList
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TRACKS_COMPOSE = api;
})(typeof window !== 'undefined' ? window : globalThis);
