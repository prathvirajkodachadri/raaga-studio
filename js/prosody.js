/**
 * prosody.js — Kannada mātra / laghu / guru prosody scanner & poetic analyzer.
 *
 * Implements:
 * 1. Kannada mātra-laghu-guru scanning (ಕನ್ನಡ ದೀವಿಗೆ article rules)
 * 2. Gana Division (ಗಣ ವಿಭಾಗ — ಅಕ್ಷರ ಗಣಗಳು: ಮ-ಯ-ರ-ಸ-ತ-ಜ-ಭ-ನ & ಮಾತ್ರಾ ಗಣಗಳು)
 * 3. Prasa / Rhyme schemes (ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ & ಅಂತ್ಯಪ್ರಾಸ)
 * 4. Metrical balance & rhythm metrics
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

// ─── Akshara Gana Definitions (ಯಮಾತಾರಾಜಭಾನಸಲಗಂ) ─────────────────────────
var AKSHARA_GANAS = {
  '———': { name: 'ಮ', label: 'ಮ-ಗಣ', desc: 'ಸರ್ವಗುರು (———)' },
  'U——': { name: 'ಯ', label: 'ಯ-ಗಣ', desc: 'ಆದಿಲಘು (U——)' },
  '—U—': { name: 'ರ', label: 'ರ-ಗಣ', desc: 'ಮಧ್ಯಲಘು (—U—)' },
  'UU—': { name: 'ಸ', label: 'ಸ-ಗಣ', desc: 'ಅಂತ್ಯಗುರು (UU—)' },
  '——U': { name: 'ತ', label: 'ತ-ಗಣ', desc: 'ಅಂತ್ಯಲಘು (——U)' },
  'U—U': { name: 'ಜ', label: 'ಜ-ಗಣ', desc: 'ಮಧ್ಯಗುರು (U—U)' },
  '—UU': { name: 'ಭ', label: 'ಭ-ಗಣ', desc: 'ಆದಿಗುರು (—UU)' },
  'UUU': { name: 'ನ', label: 'ನ-ಗಣ', desc: 'ಸರ್ವಲಘು (UUU)' }
};

var REMAINING_GANAS = {
  'U':   { name: 'ಲ', label: 'ಲಘು (U)', desc: 'ಒಂಟಿ ಲಘು' },
  '—':   { name: 'ಗ', label: 'ಗುರು (—)', desc: 'ಒಂಟಿ ಗುರು' },
  'UU':  { name: 'ಲಲ', label: 'ಲಲ (UU)', desc: 'ಎರಡು ಲಘು' },
  '——':  { name: 'ಗಗ', label: 'ಗಗ (——)', desc: 'ಎರಡು ಗುರು' },
  'U—':  { name: 'ಲಗ (ವ)', label: 'ಲಗ (U—)', desc: 'ವ-ಗಣ / ಲಗ' },
  '—U':  { name: 'ಗಲ (ಹ)', label: 'ಗಲ (—U)', desc: 'ಹ-ಗಣ / ಗಲ' }
};

/**
 * Parse Kannada text into akshara items.
 * akshara item: { type:'akshara', text, cons, vowel:'short'|'long'|'none',
 *                 anu, vis, baseCons: 'ಕ' }
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
      var baseCons = ch;
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
      items.push({
        type: 'akshara',
        text: t.slice(start, i),
        cons: cons,
        baseCons: baseCons,
        vowel: vowel,
        anu: anu,
        vis: vis
      });
    } else if (SHORT_VOWELS.indexOf(ch) !== -1 || LONG_VOWELS.indexOf(ch) !== -1) {
      var start2 = i;
      var vowel2 = SHORT_VOWELS.indexOf(ch) !== -1 ? 'short' : 'long';
      var anu2 = false, vis2 = false;
      i++;
      if (i < t.length && t[i] === ANUSVARA) { anu2 = true; i++; }
      if (i < t.length && t[i] === VISARGA) { vis2 = true; i++; }
      items.push({
        type: 'akshara',
        text: t.slice(start2, i),
        cons: 0,
        baseCons: ch,
        vowel: vowel2,
        anu: anu2,
        vis: vis2
      });
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

/** Scan one line (or arbitrary text) -> { cells, matraTotal, aksharaCount, ganas } */
function scanLine(text) {
  var items = parseKannada(text);
  var cells = [];
  var matraTotal = 0;
  var aksharaCount = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.type === 'akshara') {
      cells.push({
        text: it.text,
        symbol: it.symbol,
        matra: it.matra,
        baseCons: it.baseCons
      });
      matraTotal += it.matra;
      if (it.symbol && it.symbol !== '·') aksharaCount++;
    } else {
      cells.push({ text: it.text, symbol: null, matra: 0 });
    }
  }

  // Akshara gana division
  var symCells = cells.filter(function (c) { return c.symbol && c.symbol !== '·'; });
  var symStr = symCells.map(function (c) { return c.symbol === '3' ? '—' : c.symbol; }).join('');
  var ganas = divideAksharaGanas(symStr, symCells);

  return {
    cells: cells,
    matraTotal: matraTotal,
    aksharaCount: aksharaCount,
    ganas: ganas,
    symbols: symStr
  };
}

/**
 * Divide symbols into 3-akshara ganas (ಮ-ಯ-ರ-ಸ-ತ-ಜ-ಭ-ನ).
 */
function divideAksharaGanas(symStr, symCells) {
  var ganas = [];
  var i = 0;
  while (i < symStr.length) {
    if (i + 3 <= symStr.length) {
      var chunk = symStr.slice(i, i + 3);
      var def = AKSHARA_GANAS[chunk] || { name: '?', label: chunk, desc: chunk };
      var chunkCells = symCells ? symCells.slice(i, i + 3) : [];
      ganas.push({
        name: def.name,
        label: def.label,
        desc: def.desc,
        symbols: chunk,
        text: chunkCells.map(function (c) { return c.text; }).join(''),
        count: 3
      });
      i += 3;
    } else {
      var rem = symStr.slice(i);
      var rdef = REMAINING_GANAS[rem] || { name: rem, label: rem, desc: rem };
      var remCells = symCells ? symCells.slice(i) : [];
      ganas.push({
        name: rdef.name,
        label: rdef.label,
        desc: rdef.desc,
        symbols: rem,
        text: remCells.map(function (c) { return c.text; }).join(''),
        count: rem.length
      });
      i += rem.length;
    }
  }
  return ganas;
}

/**
 * Divide a line into Matra Ganas (ಮಾತ್ರಾಗಣ — e.g. 3, 4, or 5 matras per gana).
 */
function divideMatraGanas(cells, targetMatras) {
  targetMatras = targetMatras || 4;
  var ganas = [];
  var curGana = { matras: 0, cells: [], symbols: '' };
  var activeCells = cells.filter(function (c) { return c.symbol && c.symbol !== '·'; });

  for (var i = 0; i < activeCells.length; i++) {
    var c = activeCells[i];
    curGana.cells.push(c);
    curGana.matras += c.matra;
    curGana.symbols += c.symbol;
    if (curGana.matras >= targetMatras) {
      ganas.push({
        matras: curGana.matras,
        symbols: curGana.symbols,
        text: curGana.cells.map(function (x) { return x.text; }).join(''),
        cells: curGana.cells
      });
      curGana = { matras: 0, cells: [], symbols: '' };
    }
  }
  if (curGana.cells.length > 0) {
    ganas.push({
      matras: curGana.matras,
      symbols: curGana.symbols,
      text: curGana.cells.map(function (x) { return x.text; }).join(''),
      cells: curGana.cells
    });
  }
  return ganas;
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
        if (line.cells[i].symbol != null && line.cells[i].symbol !== '·') {
          last = line.cells[i];
          break;
        }
      }
      if (last && last.symbol === 'U') {
        last.symbol = '—';
        last.matra = 2;
        line.matraTotal += 1;
        // recalculate ganas
        var symCells = line.cells.filter(function (c) { return c.symbol && c.symbol !== '·'; });
        var symStr = symCells.map(function (c) { return c.symbol === '3' ? '—' : c.symbol; }).join('');
        line.symbols = symStr;
        line.ganas = divideAksharaGanas(symStr, symCells);
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

/**
 * Analyze Prasa (Rhyme schemes):
 * 1. Dvitiyakshara Prasa (ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ — 2nd syllable consonant matches across lines)
 * 2. Antya Prasa (ಅಂತ್ಯಪ್ರಾಸ — End rhyme / last syllable sound matches)
 */
function analyzePrasa(lines) {
  var nonEmpty = lines.filter(function (l) { return l.cells.some(function (c) { return c.symbol != null; }); });
  if (nonEmpty.length < 2) {
    return {
      dvitiyakshara: { matched: false, reason: 'At least 2 lines required', details: [] },
      antyaPrasa: { matched: false, reason: 'At least 2 lines required', details: [] }
    };
  }

  // 1. Dvitiyakshara Prasa
  var dvitDetails = [];
  var dvitCons = [];
  for (var li = 0; li < nonEmpty.length; li++) {
    var l = nonEmpty[li];
    var aksharas = l.cells.filter(function (c) { return c.symbol != null && c.symbol !== '·'; });
    if (aksharas.length >= 2) {
      var secondAk = aksharas[1];
      dvitDetails.push({ lineIndex: li, akshara: secondAk.text, baseCons: secondAk.baseCons });
      dvitCons.push(secondAk.baseCons || secondAk.text);
    } else {
      dvitDetails.push({ lineIndex: li, akshara: '—', baseCons: null });
      dvitCons.push(null);
    }
  }

  var firstCons = dvitCons[0];
  var dvitMatched = firstCons != null && dvitCons.every(function (c) { return c != null && c === firstCons; });

  // 2. Antya Prasa (End Rhyme)
  var antyaDetails = [];
  var antyaWords = [];
  for (var li2 = 0; li2 < nonEmpty.length; li2++) {
    var l2 = nonEmpty[li2];
    var aksharas2 = l2.cells.filter(function (c) { return c.symbol != null && c.symbol !== '·'; });
    if (aksharas2.length > 0) {
      var lastAk = aksharas2[aksharas2.length - 1];
      antyaDetails.push({ lineIndex: li2, akshara: lastAk.text, baseCons: lastAk.baseCons });
      antyaWords.push(lastAk.text);
    } else {
      antyaDetails.push({ lineIndex: li2, akshara: '—', baseCons: null });
      antyaWords.push(null);
    }
  }

  var firstAntya = antyaWords[0];
  var antyaMatched = firstAntya != null && antyaWords.every(function (w) { return w != null && w === firstAntya; });

  return {
    dvitiyakshara: {
      matched: dvitMatched,
      rhymeLetter: firstCons || null,
      details: dvitDetails,
      description: dvitMatched
        ? 'ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ ಹೊಂದಿಕೆಯಾಗಿದೆ (Rhyme letter: "' + firstCons + '")'
        : 'ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ ಪೂರ್ಣವಾಗಿಲ್ಲ (2nd syllables differ)'
    },
    antyaPrasa: {
      matched: antyaMatched,
      rhymeEnding: firstAntya || null,
      details: antyaDetails,
      description: antyaMatched
        ? 'ಅಂತ್ಯಪ್ರಾಸ ಹೊಂದಿಕೆಯಾಗಿದೆ (End rhyme: "' + firstAntya + '")'
        : 'ಅಂತ್ಯಪ್ರಾಸ ಪೂರ್ಣವಾಗಿಲ್ಲ'
    }
  };
}

/**
 * Metric & rhythm statistics across multi-line lyrics.
 */
function analyzeRhythm(lines) {
  var nonEmpty = lines.filter(function (l) { return l.cells.some(function (c) { return c.symbol != null; }); });
  if (!nonEmpty.length) {
    return { lineCount: 0, totalMatras: 0, avgMatras: 0, totalAksharas: 0, balanced: true };
  }
  var totalM = 0;
  var totalA = 0;
  var matraCounts = [];
  nonEmpty.forEach(function (l) {
    totalM += l.matraTotal;
    totalA += l.aksharaCount;
    matraCounts.push(l.matraTotal);
  });
  var avgM = totalM / nonEmpty.length;
  var minM = Math.min.apply(null, matraCounts);
  var maxM = Math.max.apply(null, matraCounts);
  var balanced = (maxM - minM) <= 2; // steady rhythm if variance is small

  return {
    lineCount: nonEmpty.length,
    totalMatras: totalM,
    avgMatras: Math.round(avgM * 10) / 10,
    minMatras: minM,
    maxMatras: maxM,
    totalAksharas: totalA,
    matraVariance: maxM - minM,
    balanced: balanced
  };
}

var PROSODY_RULES = [
  'ಲಘು (U, 1 ಮಾತ್ರೆ): short vowels (ಅ ಇ ಉ ಋ ಎ ಒ) and syllables built on them — ಕ ಕಿ ಕು ಚ ಟ ತ ಕೆ ಕೊ ಸು ಸೊ ಸೃ ಕೃ.',
  'ಗುರು (—, 2 ಮಾತ್ರೆ): long vowels (ಆ ಈ ಊ ೠ ಏ ಐ ಓ ಔ) and long-vowel syllables — ಕಾ ಕೀ ಚೇ ಚೈ ಸೈ ನಾ ರೋ ಸೌ; clusters ಕ್ಕಾ ಸ್ನೇ ತ್ರೇ ಪ್ರೈ ಕ್ರೋ ಧ್ಯಾ ಲೋ.',
  'ಗುರು: a syllable with ಅನುಸ್ವಾರ (ಂ) or ವಿಸರ್ಗ (ಃ) — ಅಂ ಅಃ ತಂ ತಃ ಸಂ ಸಃ ಕಂ.',
  'ಗುರು: the syllable before a ಒತ್ತಕ್ಷರ (geminate) — ಕಲ್ಲು → —U, ಮಣ್ಣು → —U, ನಿಲ್ಲು → —U, ಮೆತ್ತಗೆ → —UU.',
  'ಗುರು: the syllable before a closing (halant) consonant — ಕಲ್ ನಿಲ್ ಪಣ್ ತಿನ್ ಮೇಣ್ ಕಾಲ್ ಮೇಲ್ ತಾಯ್ → all —. The closing consonant itself gets no symbol.',
  'ಒಂದೇ ಚಿಹ್ನೆ, ಅನೇಕ ಕಾರಣಗಳಿದ್ದರೂ — ಶಾಸ್ತ್ರ → —U, ಕಾಂಕ್ಷೆ → —U. ಪ್ಲುತ (3): long vowel + ವಿಸರ್ಗ (ಆಃ).',
  'ಅಕ್ಷರ ಗಣಗಳು (ಯಮಾತಾರಾಜಭಾನಸಲಗಂ): ಮ=———, ಯ=U——, ರ=—U—, ಸ=UU—, ತ=——U, ಜ=U—U, ಭ=—UU, ನ=UUU.',
  'ಪ್ರಾಸಗಳು: ದ್ವಿತೀಯಾಕ್ಷರ ಪ್ರಾಸ (2nd akshara rhyme) ಮತ್ತು ಅಂತ್ಯಪ್ರಾಸ (line ending rhyme).'
];

if (typeof module !== 'undefined') {
  module.exports = {
    parseKannada: parseKannada,
    scanLine: scanLine,
    scanText: scanText,
    symbolsOf: symbolsOf,
    divideAksharaGanas: divideAksharaGanas,
    divideMatraGanas: divideMatraGanas,
    analyzePrasa: analyzePrasa,
    analyzeRhythm: analyzeRhythm,
    AKSHARA_GANAS: AKSHARA_GANAS,
    REMAINING_GANAS: REMAINING_GANAS,
    PROSODY_RULES: PROSODY_RULES
  };
}
if (typeof window !== 'undefined') {
  window.PROSODY = {
    parseKannada: parseKannada,
    scanLine: scanLine,
    scanText: scanText,
    symbolsOf: symbolsOf,
    divideAksharaGanas: divideAksharaGanas,
    divideMatraGanas: divideMatraGanas,
    analyzePrasa: analyzePrasa,
    analyzeRhythm: analyzeRhythm,
    AKSHARA_GANAS: AKSHARA_GANAS,
    REMAINING_GANAS: REMAINING_GANAS,
    PROSODY_RULES: PROSODY_RULES
  };
}
