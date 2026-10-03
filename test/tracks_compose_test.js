/**
 * tracks_compose_test.js — QA for the Tracks Compose naming engine.
 * Run with: node test/tracks_compose_test.js
 */
'use strict';

global.window = global;
require('../js/tracks-compose-data.js');
var TC = require('../js/tracks-compose.js');

var pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + '\n    expected: ' + b + '\n    actual:   ' + a); }

console.log('Tracks Compose tests\n');

/* ---- 1. naming convention ---- */
check('FAMILY_INSTRUMENT_ROLE_PLUGIN_INSTANCE format', function () {
  eq(TC.makeTrackName({ FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE', PLUGIN: 'Kontakt' }),
    'DRONE_TANPURA_DRONE_KONTAKT_01');
});
check('multi-word values become single underscores', function () {
  eq(TC.makeTrackName({ FAMILY: 'BACKING_VOCALS', INSTRUMENT: 'Harmony Stack', ROLE: 'HARM', PLUGIN: 'East West' }),
    'BACKING_VOCALS_HARMONY_STACK_HARM_EAST_WEST_01');
});
check('punctuation is stripped, not doubled', function () {
  eq(TC.makeTrackName({ FAMILY: 'melody', INSTRUMENT: 'Violin (Solo)', ROLE: 'lead', PLUGIN: 'SWAM 3.x' }),
    'MELODY_VIOLIN_SOLO_LEAD_SWAM_3_X_01');
});
check('placeholder plugins are dropped', function () {
  ['', '—', '-', '\u2013'].forEach(function (p) {
    eq(TC.makeTrackName({ FAMILY: 'FX', INSTRUMENT: 'Riser', ROLE: 'FX', PLUGIN: p }), 'FX_RISER_FX_01', 'plugin: "' + p + '"');
  });
});
check('instance defaults to 01 and pads to two digits', function () {
  eq(TC.makeTrackName({ FAMILY: 'DRUMS', INSTRUMENT: 'Kick', ROLE: 'PERC', INSTANCE: 2 }), 'DRUMS_KICK_PERC_02');
  eq(TC.makeTrackName({ FAMILY: 'DRUMS', INSTRUMENT: 'Kick', ROLE: 'PERC', INSTANCE: 'DL' }), 'DRUMS_KICK_PERC_DL');
});
check('Kannada instrument names survive the slug', function () {
  eq(TC.makeTrackName({ FAMILY: 'FOLK', INSTRUMENT: 'ಯಕ್ಷಗಾನ', ROLE: 'LEAD' }), 'FOLK_ಯಕ್ಷಗಾನ_LEAD_01');
});
check('a supplied TRACK NAME wins over the generated one', function () {
  var row = { FAMILY: 'FX', INSTRUMENT: 'Riser', ROLE: 'FX', 'TRACK NAME': 'MY_CUSTOM_NAME' };
  eq(TC.trackNameOf(row), 'MY_CUSTOM_NAME');
  eq(TC.trackNameOf({ FAMILY: 'FX', INSTRUMENT: 'Riser', ROLE: 'FX' }), 'FX_RISER_FX_01');
});
check('column names are matched case- and separator-insensitively', function () {
  eq(TC.trackNameOf({ family: 'bass', instrument: 'Sub Bass', role: 'sub', 'plugin example': 'Serum' }),
    'BASS_SUB_BASS_SUB_SERUM_01');
});

/* ---- 2. arrangement order ---- */
var ORDER = TC.familyNames(window.TRACKS_COMPOSE_FAMILIES);
check('arrange() follows the recommended family order', function () {
  var shuffled = [
    { FAMILY: 'VOCALS', INSTRUMENT: 'Male Lead', ROLE: 'LEAD' },
    { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE' },
    { FAMILY: 'BASS', INSTRUMENT: 'Sub Bass', ROLE: 'SUB' }
  ];
  var out = TC.arrange(shuffled, window.TRACKS_COMPOSE_FAMILIES).map(TC.familyOf);
  eq(out.join(','), 'DRONE,BASS,VOCALS');
});
check('order inside a family is preserved', function () {
  var rows = [
    { FAMILY: 'DRUMS', INSTRUMENT: 'Kick', ROLE: 'PERC' },
    { FAMILY: 'DRUMS', INSTRUMENT: 'Snare', ROLE: 'PERC' },
    { FAMILY: 'DRUMS', INSTRUMENT: 'Hats', ROLE: 'PERC' }
  ];
  eq(TC.arrange(rows, window.TRACKS_COMPOSE_FAMILIES).map(function (r) { return r.INSTRUMENT; }).join(','), 'Kick,Snare,Hats');
});
check('an unknown family sorts last instead of breaking the order', function () {
  var rows = [
    { FAMILY: 'MYSTERY', INSTRUMENT: 'X', ROLE: 'FX' },
    { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE' }
  ];
  eq(TC.arrange(rows, window.TRACKS_COMPOSE_FAMILIES).map(TC.familyOf).join(','), 'DRONE,MYSTERY');
});
check('familiesInUse reports only families that hold rows, in order', function () {
  var rows = [
    { FAMILY: 'FX', INSTRUMENT: 'Riser', ROLE: 'FX' },
    { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE' }
  ];
  eq(TC.familiesInUse(rows, window.TRACKS_COMPOSE_FAMILIES).join(','), 'DRONE,FX');
});
check('familyMeta falls back to a neutral colour', function () {
  eq(TC.familyMeta(window.TRACKS_COMPOSE_FAMILIES, 'DRONE').color, '#D9EAD3');
  eq(TC.familyMeta(window.TRACKS_COMPOSE_FAMILIES, 'NOT_A_FAMILY').color, '#E8DFC8');
});

/* ---- 3. filtering ---- */
var DATA = [
  { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE', PLUGIN: 'Kontakt', NOTES: 'tuned to the song key' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Bansuri', ROLE: 'LEAD', PLUGIN: 'Kontakt' },
  { FAMILY: 'MELODY', INSTRUMENT: 'Sitar', ROLE: 'LEAD', PLUGIN: 'Omnisphere' }
];
check('search matches instrument, family, role, plugin and track name', function () {
  eq(TC.filterRows(DATA, { q: 'bansuri' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'melody' }).length, 2);
  eq(TC.filterRows(DATA, { q: 'omnisphere' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'MELODY_SITAR_LEAD' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'song key' }).length, 1, 'notes are searchable');
});
check('search is case and separator insensitive', function () {
  eq(TC.filterRows(DATA, { q: 'SITAR' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'lead' }).length, 2);
});
check('family filter is exact, not a substring match', function () {
  eq(TC.filterRows(DATA, { family: 'MELODY' }).length, 2);
  eq(TC.filterRows(DATA, { family: 'MEL' }).length, 0);
});
check('role and plugin filters combine with search', function () {
  eq(TC.filterRows(DATA, { role: 'LEAD', plugin: 'Kontakt' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'lead', plugin: 'Omnisphere' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'bansuri', family: 'MELODY', role: 'LEAD' }).length, 1);
  eq(TC.filterRows(DATA, { q: 'bansuri', family: 'DRONE' }).length, 0);
});
check('an empty filter keeps everything', function () {
  eq(TC.filterRows(DATA, {}).length, 3);
  eq(TC.filterRows(DATA, null).length, 3);
});
check('stats report shown, total and family count', function () {
  var rows = TC.filterRows(DATA, { family: 'MELODY' });
  var s = TC.stats(DATA, rows, window.TRACKS_COMPOSE_FAMILIES);
  eq(s.shown, 2); eq(s.total, 3); eq(s.families, 2);
});

/* ---- 4. export ---- */
check('CSV has a header and one line per arranged row', function () {
  var lines = TC.toCsv(DATA, window.TRACKS_COMPOSE_FAMILIES).split('\n');
  eq(lines[0], 'SEQ,FAMILY,INSTRUMENT,ROLE,PLUGIN,TRACK NAME');
  eq(lines.length, DATA.length + 1);
  eq(lines[1], '1,DRONE,Tanpura,DRONE,Kontakt,DRONE_TANPURA_DRONE_KONTAKT_01');
});
check('CSV quotes values containing commas or quotes', function () {
  var csv = TC.toCsv([{ FAMILY: 'FX', INSTRUMENT: 'Riser, Long', ROLE: 'FX', PLUGIN: 'A"B' }], window.TRACKS_COMPOSE_FAMILIES);
  eq(csv.split('\n')[1], '1,FX,"Riser, Long",FX,"A""B",FX_RISER_LONG_FX_A_B_01');
});
check('nameList is in arrangement order', function () {
  var rows = [
    { FAMILY: 'VOCALS', INSTRUMENT: 'Male Lead', ROLE: 'LEAD' },
    { FAMILY: 'DRONE', INSTRUMENT: 'Tanpura', ROLE: 'DRONE' }
  ];
  eq(TC.nameList(rows, window.TRACKS_COMPOSE_FAMILIES).join(' | '),
    'DRONE_TANPURA_DRONE_01 | VOCALS_MALE_LEAD_LEAD_01');
});

/* ---- 5. the shipped library ---- */
var TRACKS = window.TRACKS_COMPOSE_TRACKS;
var FAMILIES = window.TRACKS_COMPOSE_FAMILIES;
check('the library ships rows and families', function () {
  if (!TRACKS || TRACKS.length < 40) throw new Error('expected a usable starter library, got ' + (TRACKS || []).length);
  if (!FAMILIES || FAMILIES.length < 8) throw new Error('expected at least 8 families');
});
check('every row has a family and an instrument', function () {
  TRACKS.forEach(function (row, i) {
    if (!row.FAMILY) throw new Error('row ' + i + ' has no FAMILY');
    if (!row.INSTRUMENT) throw new Error('row ' + i + ' has no INSTRUMENT');
    if (!row.ROLE) throw new Error('row ' + i + ' has no ROLE');
  });
});
check('every row belongs to a declared family', function () {
  var known = TC.familyNames(FAMILIES);
  TRACKS.forEach(function (row) {
    if (known.indexOf(TC.familyOf(row)) < 0) throw new Error('undeclared family: ' + row.FAMILY);
  });
});
check('every family colour is a hex value', function () {
  FAMILIES.forEach(function (f) {
    if (!/^#[0-9a-f]{6}$/i.test(f.color)) throw new Error(f.name + ' has colour ' + f.color);
  });
});
check('all generated track names are unique', function () {
  var names = TC.nameList(TRACKS, FAMILIES);
  var seen = {};
  names.forEach(function (n) {
    if (seen[n]) throw new Error('duplicate track name: ' + n);
    seen[n] = true;
  });
  eq(names.length, TRACKS.length);
});
check('generated names follow the convention', function () {
  TC.nameList(TRACKS, FAMILIES).forEach(function (n) {
    if (n !== n.toUpperCase()) throw new Error('not upper case: ' + n);
    if (n.indexOf('__') >= 0) throw new Error('double underscore in ' + n);
    if (n.charAt(0) === '_' || n.charAt(n.length - 1) === '_') throw new Error('stray underscore in ' + n);
    if (/\s/.test(n)) throw new Error('whitespace in ' + n);
    if (!/_\d{2}$/.test(n)) throw new Error('missing two-digit instance: ' + n);
  });
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
