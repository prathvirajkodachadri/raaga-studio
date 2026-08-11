/**
 * raga_bpm_test.js — unit tests for Ragas, BPM & Key, Reference Compare,
 * Release Planner & DAW Guides (Node).
 */
'use strict';

var R = require('../js/ragas.js');
var BK = require('../js/bpm-key.js');
var RC = require('../js/ref-compare.js');
var RP = require('../js/release-planner.js');
var DG = require('../js/daw-guides.js');

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

console.log('Ragas, BPM, Reference Compare & Release Planner Unit Tests\n');

/* ─── 1. Raga Database & Swara Math ─── */
assert(R.RAGA_LIST.length >= 16, 'Raga database loaded (16+ ragas)');
var mohanam = R.getRagaById('mohanam');
assert(mohanam && mohanam.arohana === 'S R2 G3 P D2 S^', 'Mohanam arohana verified');

var freqSa = R.getTonicFrequency('C');
var freqPa = R.getSwaraFrequency('P', 'C');
assert(Math.abs(freqPa / freqSa - 1.498) < 0.05, 'Panchama (P) frequency is approx 1.5× Sa');

var wNote = R.getWesternNoteName('G3', 'C');
assert(wNote === 'E', 'Antara Gandhara (G3) with tonic C is note E');

var wNoteMohan = R.getWesternNoteName('D2', 'C');
assert(wNoteMohan === 'A', 'Chatushruti Dhaivata (D2) with tonic C is note A');

assert(typeof R.Tanpura.getStatus === 'function', 'Tanpura engine exported');

/* ─── 2. BPM, Tap Tempo & Metronome ─── */
var tap = BK.createTapTempo();
assert(typeof tap.tap === 'function', 'Tap tempo created');

assert(BK.TALA_PATTERNS['adi'].beats === 8, 'Adi Tala has 8 beats');
assert(BK.TALA_PATTERNS['rupaka'].beats === 6, 'Rupaka Tala defined');
assert(BK.TALA_PATTERNS['misra_chapu'].beats === 7, 'Misra Chapu has 7 beats');
assert(BK.TALA_PATTERNS['khanda_chapu'].beats === 5, 'Khanda Chapu has 5 beats');

assert(BK.getTempoName(70).indexOf('ಮಂದಗತಿ') >= 0 || BK.getTempoName(70).indexOf('Adagio') >= 0, 'Tempo classification for 70 BPM');
assert(BK.getTempoName(120).indexOf('Moderato') >= 0, 'Tempo classification for 120 BPM');

/* ─── 3. Reference Track Comparator ─── */
var mockMy = {
  fileName: 'my_mix.wav',
  loudness: { integrated: -16.0 },
  levels: { dynamicRange: 7.0, crestFactor: 9.0 },
  stereo: { correlation: 0.85 },
  spectrum: { subBassRatio: 0.08, airRatio: 0.02, midRatio: 0.5 }
};
var mockRef = {
  fileName: 'commercial_ref.wav',
  loudness: { integrated: -14.0 },
  levels: { dynamicRange: 8.5, crestFactor: 10.0 },
  stereo: { correlation: 0.90 },
  spectrum: { subBassRatio: 0.04, airRatio: 0.04, midRatio: 0.5 }
};

var cmp = RC.compareReports(mockMy, mockRef);
assert(cmp !== null, 'compareReports generated');
assert(cmp.lufsDiff === -2.0, 'LUFS difference calculated');
assert(cmp.gainMatchOffset === 2.0, 'Gain match offset calculated (+2 dB)');
assert(cmp.advice.length > 0, 'Match EQ advice generated');

/* ─── 4. ISRC Generator & Distribution ─── */
var isrc = RP.generateIsrc('IN', 'RGS', 26, 1);
assert(isrc.formatted === 'IN-RGS-26-00001', 'ISRC generated with correct format');
assert(isrc.valid === true, 'Generated ISRC is valid');

var isrc2 = RP.generateIsrc('US', 'ABC', 25, 42);
assert(isrc2.formatted === 'US-ABC-25-00042', 'ISRC sequential padding verified');

assert(RP.DISTRIBUTION_CHECKLIST.length >= 10, 'Distribution checklist items defined');

/* ─── 5. DAW Guides & Mastering Chains ─── */
assert(DG.DAW_TEMPLATES.cubase !== undefined, 'Cubase DAW template defined');
assert(DG.DAW_TEMPLATES.logic !== undefined, 'Logic Pro DAW template defined');
assert(DG.MASTERING_CHAINS.length >= 3, 'Mastering chain templates defined');
assert(DG.MASTERING_CHAINS[0].plugins.length >= 5, 'Mastering chain has plugin sequence');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
