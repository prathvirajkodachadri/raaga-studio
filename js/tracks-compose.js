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

  // ─── import: bring in your own studio standard ────────────────────────────
  var HEADER_ALIASES = {
    FAMILY: 'FAMILY', FAMILIES: 'FAMILY', FOLDER: 'FAMILY', GROUP: 'FAMILY', 'TRACK GROUP': 'FAMILY',
    INSTRUMENT: 'INSTRUMENT', INSTRUMENTS: 'INSTRUMENT', 'INSTRUMENT NAME': 'INSTRUMENT', SOURCE: 'INSTRUMENT',
    ROLE: 'ROLE', ROLES: 'ROLE', TYPE: 'ROLE',
    PLUGIN: 'PLUGIN', PLUGINS: 'PLUGIN', 'PLUGIN EXAMPLE': 'PLUGIN', VST: 'PLUGIN', INSTRUMENT_PLUGIN: 'PLUGIN',
    'TRACK NAME': 'TRACK NAME', 'PROFESSIONAL TRACK NAME': 'TRACK NAME', NAME: 'TRACK NAME',
    SEQ: 'SEQ', 'S.NO': 'SEQ', 'SR NO': 'SEQ', NO: 'SEQ',
    NOTES: 'NOTES', NOTE: 'NOTES', COMMENT: 'NOTES', COMMENTS: 'NOTES'
  };

  var POSITIONAL = ['FAMILY', 'INSTRUMENT', 'ROLE', 'PLUGIN', 'TRACK NAME'];

  var PASTEL = ['#E8DFC8', '#DCE9DA', '#F6E2CE', '#D8E4F2', '#EFE3F7',
    '#F7DCDC', '#DDEBEB', '#E9E4C9', '#E4E8D5', '#F2E4D8'];

  function headerKey(cell) {
    var k = String(cell == null ? '' : cell).replace(/[_*]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    return HEADER_ALIASES[k] || '';
  }

  function decodeEntities(s) {
    return String(s == null ? '' : s)
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); });
  }

  function stripTags(html) {
    return decodeEntities(String(html || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Split a CSV/TSV block into a grid, honouring quoted cells. */
  function parseDelimited(text, delimiter) {
    var src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    var delim = delimiter;
    if (!delim) {
      var tabs = (src.match(/\t/g) || []).length;
      var commas = (src.match(/,/g) || []).length;
      delim = tabs > commas ? '\t' : ',';
    }
    var grid = [], row = [], cell = '', quoted = false;
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (quoted) {
        if (c === '"') {
          if (src[i + 1] === '"') { cell += '"'; i++; }
          else quoted = false;
        } else cell += c;
      } else if (c === '"') {
        quoted = true;
      } else if (c === delim) {
        row.push(cell); cell = '';
      } else if (c === '\n') {
        row.push(cell); grid.push(row); row = []; cell = '';
      } else {
        cell += c;
      }
    }
    row.push(cell);
    grid.push(row);
    return grid
      .map(function (r) { return r.map(function (v) { return String(v).trim(); }); })
      .filter(function (r) { return r.some(function (v) { return v !== ''; }); });
  }

  /** Turn a grid into rows using the header when present, position otherwise. */
  function rowsFromGrid(grid) {
    if (!grid || !grid.length) return { rows: [], header: false };
    var mapped = grid[0].map(headerKey);
    var hasHeader = mapped.filter(Boolean).length >= 2;
    var order = hasHeader ? mapped : POSITIONAL.slice();
    var body = hasHeader ? grid.slice(1) : grid;
    var rows = [];
    body.forEach(function (cells) {
      var row = {};
      order.forEach(function (key, i) {
        if (!key) return;
        var v = cells[i];
        if (v === undefined || v === '') return;
        // A supplied TRACK NAME cell that is just the generated name is noise.
        row[key] = v;
      });
      if (row.INSTRUMENT || row.FAMILY || row['TRACK NAME']) rows.push(row);
    });
    return { rows: rows, header: hasHeader };
  }

  /** Pull rows out of an exported HTML page: an embedded array, else a table. */
  function rowsFromHtml(html) {
    var src = String(html == null ? '' : html);

    // 1. an embedded JS/JSON array, e.g. const DATA = [{FAMILY:"DRONE", …}]
    var arrayMatch = src.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      var literal = arrayMatch[0];
      var parsed = null;
      try {
        parsed = JSON.parse(literal);
      } catch (e) {
        try {
          parsed = JSON.parse(literal
            .replace(/([{,]\s*)([A-Za-z_$][\w$\s]*?)\s*:/g, '$1"$2":')
            .replace(/'/g, '"'));
        } catch (e2) { parsed = null; }
      }
      if (parsed && parsed.length && typeof parsed[0] === 'object') {
        return { rows: normalizeRows(parsed), header: false };
      }
    }

    // 2. a real <table>
    if (/<t[rd]/i.test(src)) {
      var grid = [];
      var rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      var m;
      while ((m = rowRe.exec(src))) {
        var cells = [], cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, c;
        while ((c = cellRe.exec(m[1]))) cells.push(stripTags(c[1]));
        if (cells.length) grid.push(cells);
      }
      if (grid.length) {
        var out = rowsFromGrid(grid);
        if (out.rows.length) return out;
      }
    }
    return { rows: [], header: false };
  }

  /** Rename arbitrary object keys onto the canonical columns. */
  function normalizeRows(rows) {
    var out = [];
    (rows || []).forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      var mapped = {};
      Object.keys(row).forEach(function (k) {
        var key = headerKey(k) || (String(k).trim().toUpperCase() === 'FAMILY' ? 'FAMILY' : '');
        if (!key) return;
        var v = row[k];
        if (v === undefined || v === null || v === '') return;
        mapped[key] = String(v);
      });
      if (mapped.INSTRUMENT || mapped.FAMILY) out.push(mapped);
    });
    return out;
  }

  /**
   * Read a library from a user's own file: CSV/TSV, JSON, or an exported HTML
   * page (embedded array or table). Returns { rows, header }.
   */
  function parseImport(text, filename) {
    var name = String(filename || '').toLowerCase();
    var src = String(text == null ? '' : text);
    if (!src.trim()) throw new Error('The file is empty.');

    var result;
    if (/\.json$/.test(name)) {
      var data = JSON.parse(src);
      if (Array.isArray(data)) result = { rows: normalizeRows(data), header: false };
      else if (data && Array.isArray(data.tracks)) result = { rows: normalizeRows(data.tracks), header: false };
      else if (data && Array.isArray(data.rows)) result = { rows: normalizeRows(data.rows), header: false };
      else throw new Error('No track rows found in that JSON.');
    } else if (/\.html?$/.test(name) || /<\/?(table|tr|td|th)[\s>]/i.test(src)) {
      result = rowsFromHtml(src);
    } else {
      result = rowsFromGrid(parseDelimited(src));
    }

    var rows = (result.rows || []).filter(function (r) { return r.INSTRUMENT || r['TRACK NAME']; });
    if (!rows.length) throw new Error('No track rows found. Expected columns like FAMILY, INSTRUMENT, ROLE, PLUGIN.');
    return { rows: rows, header: !!result.header };
  }

  /** Give every family in an imported library a colour and a place in the order. */
  function familiesFromRows(rows, knownFamilies) {
    var list = families(knownFamilies);
    var colours = {};
    list.forEach(function (f) { colours[f.name] = f.color; });
    familiesInUse(rows, list).forEach(function (name) {
      if (colours[name]) return;
      list.push({
        name: name,
        color: PASTEL[list.length % PASTEL.length],
        note: 'Imported family'
      });
    });
    return list;
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
    parseDelimited: parseDelimited, rowsFromGrid: rowsFromGrid, rowsFromHtml: rowsFromHtml,
    normalizeRows: normalizeRows, parseImport: parseImport, familiesFromRows: familiesFromRows,
    rowsForExport: rowsForExport, toCsv: toCsv, nameList: nameList
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TRACKS_COMPOSE = api;
})(typeof window !== 'undefined' ? window : globalThis);
