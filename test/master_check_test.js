/**
 * master_check_test.js — unit tests for MASTER_CHECK helpers (Node).
 * Full audio decode tests run in the browser; here we cover pure helpers.
 */
'use strict';

// Minimal browser shims not needed — engine guards AudioContext for analyzeFile only.
var MC = require('../js/master-check.js');

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

console.log('MASTER_CHECK unit tests\n');

// grade scale
assert(MC.gradeOf(95) === 'A', 'grade 95 → A');
assert(MC.gradeOf(80) === 'B', 'grade 80 → B');
assert(MC.gradeOf(65) === 'C', 'grade 65 → C');
assert(MC.gradeOf(45) === 'D', 'grade 45 → D');
assert(MC.gradeOf(10) === 'F', 'grade 10 → F');
assert(MC.gradeLabel('A').indexOf('Excellent') >= 0, 'gradeLabel A');

// formatters
assert(MC.fmtDb(-1.0) === '-1.0 dB', 'fmtDb -1.0');
assert(MC.fmtLufs(-14).indexOf('-14.0') >= 0, 'fmtLufs -14');
assert(MC.fmtDur(65.5) === '1:05.50', 'fmtDur 65.5');
assert(MC.fmtBytes(2048).indexOf('KB') >= 0, 'fmtBytes KB');

// ISRC
var ok = MC.validateIsrc('USRC17607839');
assert(ok.valid === true, 'ISRC valid without dashes');
assert(ok.formatted === 'US-RC1-76-07839', 'ISRC formatted');
var bad = MC.validateIsrc('NOT-AN-ISRC');
assert(bad.valid === false, 'ISRC invalid rejected');
assert(MC.validateIsrc(null).valid === false, 'ISRC missing');

// platforms & genres present
assert(MC.PLATFORMS.length >= 7, 'platforms defined');
assert(MC.PLATFORMS.some(function (p) { return p.id === 'spotify' && p.target === -14; }), 'Spotify -14');
assert(MC.PLATFORMS.some(function (p) { return p.id === 'apple' && p.target === -16; }), 'Apple -16');
assert(MC.PLATFORMS.some(function (p) { return p.id === 'broadcast' && p.target === -23; }), 'EBU -23');
assert(MC.GENRE_DR['pop-edm'].failBelow === 4, 'Pop/EDM failBelow');
assert(MC.GENRE_DR.jazz.min === 12, 'Jazz DR min 12');

// API surface
assert(typeof MC.analyzeFile === 'function', 'analyzeFile exported');
assert(typeof MC.reportToJSON === 'function', 'reportToJSON exported');

// reportToJSON handles Infinity
var json = MC.reportToJSON({ x: Infinity, y: -Infinity, z: 1 });
assert(json.indexOf('null') >= 0 && json.indexOf('1') >= 0, 'reportToJSON sanitizes Infinity');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
