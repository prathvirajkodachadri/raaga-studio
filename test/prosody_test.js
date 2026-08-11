/**
 * prosody_test.js — QA for the ಛಂದಸ್ಸು (ಮಾತ್ರೆ-ಲಘು-ಗುರು) scanner.
 * Run with: node test/prosody_test.js
 */
'use strict';

var P = require('../js/prosody.js');
var assert = require('assert');

var pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
function eq(a, b, msg) { assert.strictEqual(a, b, msg); }

console.log('ಮಾತ್ರೆ-ಲಘು-ಗುರು tests\n');

/* ---- 1. The full example table from the article ---- */
var SYMBOLS = {
  'ಅ ಇ ಉ ಋ ಎ ಒ': 'UUUUUU',
  'ಕ ಕಿ ಕು ಚ ಟ ತ ಕೆ ಕೊ ಸು ಸೊ ಸೃ ಕೃ': 'UUUUUUUUUUUU',
  'ಆ ಈ ಊ ೠ ಏ ಐ ಓ': '———————',
  'ಕಾ ಕೀ ಚೇ ಚೈ ಸೈ ನಾ ರೋ ಸೌ': '————————',
  'ಕ್ಕಾ ಸ್ನೇ ತ್ರೇ ಪ್ರೈ ಕ್ರೋ ಧ್ಯಾ ಲೋ': '———————',
  'ಅಂ ಅಃ ತಂ ತಃ ಸಂ ಸಃ ಕಂ': '———————',
  'ಕಲ್ಲು ಮಣ್ಣು ನಿಲ್ಲು': '—U—U—U',
  'ಮೆತ್ತಗೆ': '—UU',
  'ಕಲ್ ನಿಲ್ ಪಣ್ ತಿನ್ ಮೇಣ್ ಕಾಲ್ ಮೇಲ್ ತಾಯ್': '————————',
  'ಶಾಸ್ತ್ರ ಕಾಂಕ್ಷೆ': '—U—U',
  'ಆಃ': '3',
  'ಅರಮನೆ': 'UUUU',
  'ಕನ್ನಡಿಗರು': '—UUUU'
};
var symIdx = 0;
for (var inText in SYMBOLS) {
  (function (t, expect) {
    var n = ++symIdx;
    check('symbols #' + n + ' "' + t + '"', function () {
      eq(P.symbolsOf(t), expect, 'got ' + P.symbolsOf(t) + ', expected ' + expect);
    });
  })(inText, SYMBOLS[inText]);
}

/* ---- 2. mātra totals ---- */
var MATRA = [
  ['ಶಾಸ್ತ್ರ', 3], ['ಕಾಂಕ್ಷೆ', 3], ['ಆಃ', 3], ['ಕಲ್ಲು', 3], ['ಮೆತ್ತಗೆ', 4], ['ಅರಮನೆ', 4]
];
MATRA.forEach(function (m) {
  check('matra total ' + m[0] + ' = ' + m[1], function () {
    eq(P.scanLine(m[0]).matraTotal, m[1]);
  });
});

/* ---- 3. parseKannada structure ---- */
check('parseKannada returns akshara with fields', function () {
  var it = P.parseKannada('ಕಾ')[0];
  eq(it.type, 'akshara');
  eq(it.vowel, 'long');
  eq(it.cons, 1);
});
check('cluster is one akshara (ಸ್ತ್ರ)', function () {
  var items = P.parseKannada('ಸ್ತ್ರ').filter(function (x) { return x.type === 'akshara'; });
  eq(items.length, 1);
  eq(items[0].cons, 3);
});
check('geminate with vowel (ಕ್ಕಾ) is one akshara', function () {
  var items = P.parseKannada('ಕ್ಕಾ').filter(function (x) { return x.type === 'akshara'; });
  eq(items.length, 1);
  eq(items[0].vowel, 'long');
  eq(items[0].cons, 2);
});
check('standalone consonant carries inherent short ಅ', function () {
  eq(P.parseKannada('ಕ')[0].vowel, 'short');
  eq(P.symbolsOf('ಕ'), 'U');
});
check('trailing virama is consonant-only (no symbol)', function () {
  var it = P.parseKannada('ಕಲ್');
  // ಕ (before halant consonant ಲ್) → guru; ಲ್ is consonant-only → no symbol
  eq(it[0].symbol, '—');
  eq(it[1].symbol, '·');
  eq(it[1].vowel, 'none');
});

/* ---- 4. multi-word and multi-line ---- */
check('multi-word symbols', function () {
  eq(P.symbolsOf('ಕಲ್ಲು ಮಣ್ಣು'), '—U—U');
});
check('multi-line scanText returns per-line objects', function () {
  var lines = P.scanText('ಕಲ್ಲು\nಮಣ್ಣು');
  eq(lines.length, 2);
  eq(lines[0].matraTotal, 3);
  eq(lines[1].matraTotal, 3);
});

/* ---- 5. ಷಟ್ಪದಿ option ---- */
check('shatpadi: 3rd line final laghu promoted (ಮೆತ್ತಗೆ 4→5)', function () {
  var lines = P.scanText('ಅ\nಬ\nಮೆತ್ತಗೆ', { shatpadi: true });
  eq(lines[2].matraTotal, 5);
  eq(lines[2].cells[2].symbol, '—');
});
check('shatpadi: 6th line final laghu promoted', function () {
  var lines = P.scanText('1\n2\n3\n4\n5\nಅರಮನೆ', { shatpadi: true });
  eq(lines[5].matraTotal, 5); // last ಗೆ → guru
});
check('without shatpadi final laghu stays U', function () {
  var lines = P.scanText('ಅ\nಬ\nಮೆತ್ತಗೆ', {});
  eq(lines[2].matraTotal, 4);
  eq(lines[2].cells[2].symbol, 'U');
});

/* ---- 6. robustness ---- */
check('empty input', function () {
  eq(P.symbolsOf(''), '');
  eq(P.scanText('').length, 1);
});
check('punctuation ignored in symbols', function () {
  eq(P.symbolsOf('ಕಲ್ಲು, ಮಣ್ಣು!'), '—U—U');
});
check('mixed-script (Latin + Kannada) robustness', function () {
  var out = P.symbolsOf('abc ಕಲ್ಲು xyz');
  eq(out, '—U');
});

/* ---- 7. API surface ---- */
check('API exports present', function () {
  eq(typeof P.parseKannada, 'function');
  eq(typeof P.scanLine, 'function');
  eq(typeof P.scanText, 'function');
  eq(typeof P.symbolsOf, 'function');
  eq(Array.isArray(P.PROSODY_RULES), true);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
