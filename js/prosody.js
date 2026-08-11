/**
 * prosody.js — Kannada mātra / laghu / guru prosody scanner.
 *
 * Implements the rules of the ಕನ್ನಡ ದೀವಿಗೆ article "ಮಾತ್ರೆ-ಲಘು-ಗುರು"
 * (kannadadeevige.blogspot.com/2013/11/blog-post_8282.html).
 *
 * Symbols: 'U' = ಲಘು (1 mātra), '—' = ಗುರು (2 mātra), '3' = ಪ್ಲುತ (3 mātra),
 *          '·' = no symbol (matra 0, word-final single halant consonant).
 */
'use strict';

var CONS = [
  'ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ', 'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ',
  'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ', 'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ',
  'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ', 'ಯ', 'ರ', 'ಱ', 'ಲ', 'ಳ',
  'ವ', 'ಶ', 'ಷ', 'ಸ', 'ಹ'
];
var CONS_IDX = {};
CONS.forEach(function (c) { CONS_IDX[c] = true; });

var VOWEL_SIGNS = {
  'ಾ': 'long', 'ಿ': 'short', 'ೀ': 'long', 'ು': 'short', 'ೂ': 'long',
  'ೃ': 'short', 'ೄ': 'long', 'ೆ': 'short', 'ೇ': 'long', 'ೈ': 'long',
  'ೊ': 'short', 'ೋ': 'long', 'ೌ': 'long'
};
var VIRAMA = '್';
var ANUSVARA = 'ಂ';
var VISARGA = 'ಃ';
var SHORT_VOWELS = ['ಅ', 'ಇ', 'ಉ', 'ಋ', 'ಎ', 'ಒ'];
var LONG_VOWELS = ['ಆ', 'ಈ', 'ಊ', 'ೠ', 'ಏ', 'ಐ', 'ಓ', 'ಔ'];

/**
 * Parse Kannada text into akshara items.
 * akshara item: { type:'akshara', text, cons, vowel:'short'|'long'|'none',
 *                 anu, vis }
 * everything else: { type:'other', text }
 */
function parseKannada(text) {
  var items = [];
  var i = 0;
  var t = String(text == null ? '' : text);
  while (i < t.length) {
    var ch = t[i];
    if (CONS_IDX[ch]) {
      var start = i;
      var cons = 1;
      var vowel = 'none';
      var anu = false, vis = false;
      var hasVowelSign = false;
      var trailingVirama = false;
      i++;
      // greedy cluster: c1 ್ c2 ್ c3 …
      while (i < t.length && t[i] === VIRAMA) {
        trailingVirama = true;
        i++; // consume virama
        if (i < t.length && CONS_IDX[t[i]]) { cons++; trailingVirama = false; i++; }
        else break;
      }
      if (i < t.length && VOWEL_SIGNS[t[i]] != null) { vowel = VOWEL_SIGNS[t[i]]; hasVowelSign = true; i++; }
      if (i < t.length && t[i] === ANUSVARA) { anu = true; i++; }
      if (i < t.length && t[i] === VISARGA) { vis = true; i++; }
      // a single consonant with no vowel sign and no virama carries the
      // inherent short ಅ (so `ಕ` alone is ka — ಲಘು). A cluster or a
      // consonant with a trailing virama stays consonant-only.
      if (!hasVowelSign && !trailingVirama && cons === 1) vowel = 'short';
      items.push({ type: 'akshara', text: t.slice(start, i), cons: cons, vowel: vowel, anu: anu, vis: vis });
    } else if (SHORT_VOWELS.indexOf(ch) !== -1 || LONG_VOWELS.indexOf(ch) !== -1) {
      var start2 = i;
      var vowel2 = SHORT_VOWELS.indexOf(ch) !== -1 ? 'short' : 'long';
      var anu2 = false, vis2 = false;
      i++;
      if (i < t.length && t[i] === ANUSVARA) { anu2 = true; i++; }
      if (i < t.length && t[i] === VISARGA) { vis2 = true; i++; }
      items.push({ type: 'akshara', text: t.slice(start2, i), cons: 0, vowel: vowel2, anu: anu2, vis: vis2 });
    } else {
      items.push({ type: 'other', text: ch });
      i++;
    }
  }
  // attach symbols
  return attachSymbols(items);
}

function attachSymbols(items) {
  for (var p = 0; p < items.length; p++) {
    var a = items[p];
    if (a.type !== 'akshara') continue;
    var wordFinal = (p + 1 >= items.length) || (items[p + 1].type === 'other');
    var nextAk = (p + 1 < items.length && items[p + 1].type === 'akshara') ? items[p + 1] : null;
    var isNextGem = !!(nextAk && nextAk.cons >= 2);
    var isNextHalantFinal = !!(nextAk && nextAk.vowel === 'none' && nextAk.cons === 1 &&
      (p + 2 >= items.length || items[p + 2].type === 'other'));

    var symbol, matra;
    if (a.vowel === 'none') {
      if (wordFinal && a.cons === 1) { symbol = '·'; matra = 0; }
      else { symbol = 'U'; matra = 1; }
    } else if (a.vowel === 'long' && a.vis) {
      symbol = '3'; matra = 3;
    } else if (a.anu || a.vis) {
      symbol = '—'; matra = 2;
    } else if (a.vowel === 'long') {
      symbol = '—'; matra = 2;
    } else {
      // short vowel, no anu/vis
      if (isNextGem || isNextHalantFinal) { symbol = '—'; matra = 2; }
      else { symbol = 'U'; matra = 1; }
    }
    a.symbol = symbol;
    a.matra = matra;
  }
  return items;
}

/** Scan one line (or arbitrary text) -> { cells, matraTotal } */
function scanLine(text) {
  var items = parseKannada(text);
  var cells = [];
  var matraTotal = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.type === 'akshara') {
      cells.push({ text: it.text, symbol: it.symbol, matra: it.matra });
      matraTotal += it.matra;
    } else {
      cells.push({ text: it.text, symbol: null, matra: 0 });
    }
  }
  return { cells: cells, matraTotal: matraTotal };
}

/**
 * Scan multi-line text -> array of lines (each a scanLine result).
 * opts.shatpadi: in the 3rd and 6th lines the final syllable counts as
 * guru even if it is laghu.
 */
function scanText(text, opts) {
  opts = opts || {};
  var raw = String(text == null ? '' : text).split('\n');
  var lines = raw.map(function (ln) { return scanLine(ln); });
  if (opts.shatpadi) {
    [2, 5].forEach(function (li) {
      var line = lines[li];
      if (!line) return;
      // promote the last akshara cell (find last cell with a symbol)
      var last = null;
      for (var i = line.cells.length - 1; i >= 0; i--) {
        if (line.cells[i].symbol != null) { last = line.cells[i]; break; }
      }
      if (last && last.symbol === 'U') {
        last.symbol = '—';
        last.matra = 2;
        line.matraTotal += 1;
      }
    });
  }
  return lines;
}

/** Symbols-only string (excluding the '·' no-symbol markers). */
function symbolsOf(text) {
  var items = parseKannada(text);
  var out = '';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.type === 'akshara' && it.symbol && it.symbol !== '·') out += it.symbol;
  }
  return out;
}

var PROSODY_RULES = [
  'ಲಘು (U, 1 ಮಾತ್ರೆ): short vowels (ಅ ಇ ಉ ಋ ಎ ಒ) and syllables built on them — ಕ ಕಿ ಕು ಚ ಟ ತ ಕೆ ಕೊ ಸು ಸೊ ಸೃ ಕೃ.',
  'ಗುರು (—, 2 ಮಾತ್ರೆ): long vowels (ಆ ಈ ಊ ೠ ಏ ಐ ಓ ಔ) and long-vowel syllables — ಕಾ ಕೀ ಚೇ ಚೈ ಸೈ ನಾ ರೋ ಸೌ; clusters ಕ್ಕಾ ಸ್ನೇ ತ್ರೇ ಪ್ರೈ ಕ್ರೋ ಧ್ಯಾ ಲೋ.',
  'ಗುರು: a syllable with ಅನುಸ್ವಾರ (ಂ) or ವಿಸರ್ಗ (ಃ) — ಅಂ ಅಃ ತಂ ತಃ ಸಂ ಸಃ ಕಂ.',
  'ಗುರು: the syllable before a ಒತ್ತಕ್ಷರ (geminate) — ಕಲ್ಲು → —U, ಮಣ್ಣು → —U, ನಿಲ್ಲು → —U, ಮೆತ್ತಗೆ → —UU.',
  'ಗುರು: the syllable before a closing (halant) consonant — ಕಲ್ ನಿಲ್ ಪಣ್ ತಿನ್ ಮೇಣ್ ಕಾಲ್ ಮೇಲ್ ತಾಯ್ → all —. The closing consonant itself gets no symbol.',
  'ಒಂದೇ ಚಿಹ್ನೆ, ಅನೇಕ ಕಾರಣಗಳಿದ್ದರೂ — ಶಾಸ್ತ್ರ → —U, ಕಾಂಕ್ಷೆ → —U. ಪ್ಲುತ (3): long vowel + ವಿಸರ್ಗ (ಆಃ).'
];

if (typeof module !== 'undefined') module.exports = {
  parseKannada: parseKannada, scanLine: scanLine, scanText: scanText,
  symbolsOf: symbolsOf, PROSODY_RULES: PROSODY_RULES
};
if (typeof window !== 'undefined') {
  window.PROSODY = {
    parseKannada: parseKannada, scanLine: scanLine, scanText: scanText,
    symbolsOf: symbolsOf, PROSODY_RULES: PROSODY_RULES
  };
}
