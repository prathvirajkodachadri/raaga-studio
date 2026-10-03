/**
 * index_markup_test.js — guards index.html against being gutted or truncated.
 *
 * The studio tools keep their markup inline in index.html and their controllers
 * only take over once that markup exists (e.g. practical-eq-app.js returns early
 * when #pq-dropzone is missing). If index.html is ever replaced by a skeleton,
 * every panel renders empty and the published site looks blank even though the
 * Pages build still succeeds — exactly the outage this test prevents.
 *
 * Run with: node test/index_markup_test.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var INDEX = path.join(ROOT, 'index.html');

var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✓ ' + msg);
  } else {
    failed++;
    console.error('  ✗ ' + msg);
  }
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function idsIn(html) {
  var set = {};
  var re = /id="([^"]+)"/g;
  var m;
  while ((m = re.exec(html))) set[m[1]] = true;
  return set;
}

function scriptsIn(html) {
  var out = [];
  var re = /<script[^>]+src="([^"]+)"/g;
  var m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function stylesIn(html) {
  var out = [];
  var re = /<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*rel="stylesheet"/g;
  var m;
  while ((m = re.exec(html))) out.push(m[1] || m[2]);
  return out;
}

console.log('index.html markup contract tests\n');

/* ---- 1. the file itself ---- */
var html = '';
assert(fs.existsSync(INDEX), 'index.html exists');
if (!fs.existsSync(INDEX)) {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(1);
}
html = read(INDEX);

var ids = idsIn(html);

/* ---- 2. every tab button has its panel, and every panel has real markup ---- */
var tabIds = [];
var reTab = /data-tab="([^"]+)"/g;
var mm;
while ((mm = reTab.exec(html))) {
  if (tabIds.indexOf(mm[1]) < 0) tabIds.push(mm[1]);
}

assert(tabIds.length >= 13, 'tab bar exposes all 13 studio tools (found ' + tabIds.length + ')');

var emptyPanels = [];
tabIds.forEach(function (id) {
  var panelRe = new RegExp('<section[^>]*id="tab-' + id + '"[^>]*>([\\s\\S]*?)<\\/section>');
  var m = panelRe.exec(html);
  if (!m) {
    emptyPanels.push(id + ' (panel missing)');
    return;
  }
  // The panel must carry its own controls; a controller cannot build them.
  if (m[1].replace(/\s+/g, '').length < 200) emptyPanels.push(id + ' (panel is empty)');
});

assert(emptyPanels.length === 0,
  'every tab panel ships its own markup in index.html' +
  (emptyPanels.length ? ' — empty: ' + emptyPanels.join(', ') : ''));

/* ---- 3. referenced local assets exist ---- */
var assets = scriptsIn(html).concat(stylesIn(html));
var missingAssets = [];
assets.forEach(function (a) {
  if (/^(https?:)?\/\//.test(a) || a.charAt(0) === '#') return;
  if (!fs.existsSync(path.join(ROOT, a))) missingAssets.push(a);
});
assert(assets.length > 20, 'index.html links its stylesheets and controllers (' + assets.length + ' assets)');
assert(missingAssets.length === 0,
  'every linked css/js file exists' + (missingAssets.length ? ' — missing: ' + missingAssets.join(', ') : ''));

/* ---- 4. every getElementById() lookup can resolve ---- */
var jsFiles = ['app.js', 'practical-eq-app.js', 'master-check-app.js', 'mix-check-app.js',
  'tempo-lab-app.js', 'lyrics-lab.js', 'song-studio.js', 'raga-reference.js',
  'suno-prompts.js', 'suno-cheats.js', 'mix-tools.js', 'cubase-routing.js',
  'tracks-compose-app.js', 'audio-calculators.js', 'key-chords.js', 'nav.js'];

var allHtmlIds = {};
fs.readdirSync(ROOT).filter(function (f) { return /\.html$/.test(f); }).forEach(function (f) {
  var idsInFile = idsIn(read(path.join(ROOT, f)));
  Object.keys(idsInFile).forEach(function (k) { allHtmlIds[k] = true; });
});

var jsSource = jsFiles.map(function (f) {
  return fs.existsSync(path.join(ROOT, 'js', f)) ? read(path.join(ROOT, 'js', f)) : '';
}).join('\n');

var unresolved = [];
jsFiles.forEach(function (f) {
  var file = path.join(ROOT, 'js', f);
  if (!fs.existsSync(file)) return;
  var src = read(file);
  var re = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
  var m;
  while ((m = re.exec(src))) {
    var id = m[1];
    if (allHtmlIds[id]) continue;
    // controllers may create their own nodes (canvas, overlays) at runtime
    var made = new RegExp('id\\s*[:=]\\s*[\'"`]' + id + '[\'"`]').test(jsSource);
    if (made) continue;
    unresolved.push(f + ' → #' + id);
  }
});
assert(unresolved.length === 0,
  'no controller looks up an element that nothing renders' +
  (unresolved.length ? ' — unresolved: ' + unresolved.join(', ') : ''));

/* ---- 5. the panels that were blanked during the outage stay populated ---- */
['practical-eq', 'vocal-eq', 'suno', 'raga', 'mix', 'master', 'cubase-routing',
  'tempo', 'songs', 'lyrics', 'quick-access'].forEach(function (id) {
    var m = new RegExp('id="tab-' + id + '"').exec(html);
    assert(!!m, 'panel #tab-' + id + ' is present with its controls');
  });

assert(html.length > 100000, 'index.html keeps the complete studio markup (no skeleton regression)');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
