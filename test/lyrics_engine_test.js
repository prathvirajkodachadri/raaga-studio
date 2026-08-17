/**
 * lyrics_engine_test.js — phonetic, generation and structured-analysis QA.
 * Run with: node test/lyrics_engine_test.js
 */
'use strict';

var E = require('../js/lyrics-engine.js');
var assert = require('assert');
var pass = 0, fail = 0;

function check(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (error) { fail++; console.error('  ✗ ' + name + '\n    ' + error.message); }
}
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); }
function ok(value, message) { assert.ok(value, message); }

console.log('Lyrics Lab engine tests\n');

/* Kannada Unicode + phonetic normalization */
check('Kannada word is split into spoken akshara units', function () {
  var p = E.parseKannadaWord('ಪ್ರೀತಿ');
  eq(p.syllables, 2);
  eq(p.normalized, 'prii-ti');
  eq(p.finalVowel, 'i');
});
check('Kannada normalization removes zero-width joiners', function () {
  eq(E.cleanText('ಪ್ರೀ\u200dತಿ'), 'ಪ್ರೀತಿ');
});
check('Kannada suffix is recognized from normalized text', function () {
  eq(E.parseKannadaWord('ನಿನ್ನಲ್ಲಿ').suffix, 'ನಲ್ಲಿ');
});
check('Kannada ending retains two pronunciation-oriented aksharas', function () {
  eq(E.parseKannadaWord('ಕನಸು').ending, 'ನಸು');
});
check('Kannada perfect family: ಪ್ರೀತಿ / ರೀತಿ', function () {
  var c = E.compareWords('ಪ್ರೀತಿ', 'ರೀತಿ', { language: 'kannada' });
  eq(c.type, 'Perfect'); ok(c.phonetic >= 95);
});
check('Kannada multisyllabic family: ಕನಸು / ಮನಸು', function () {
  var c = E.compareWords('ಕನಸು', 'ಮನಸು', { language: 'kannada' });
  eq(c.type, 'Multisyllabic'); ok(c.overall >= 85);
});
check('Kannada vowel-family relationship: ನೀನು / ನಾನು', function () {
  var c = E.compareWords('ನೀನು', 'ನಾನು', { language: 'kannada' });
  ok(c.type.indexOf('Vowel-family') >= 0); ok(c.overall >= 75);
});
check('Kannada voiced consonant change is near, not perfect', function () {
  var c = E.compareWords('ಪ್ರೀತಿ', 'ಬೀದಿ', { language: 'kannada' });
  eq(c.type, 'Near / Slant'); eq(c.exact, false);
});
check('Kannada suffix rhyme is identified as suffix', function () {
  var c = E.compareWords('ಕಣ್ಣಲಿ', 'ಕನಸಲಿ', { language: 'kannada', style: 'suffix' });
  ok(c.type.indexOf('Suffix') >= 0); eq(c.suffixMatch, true);
});
check('Different Kannada endings are not promoted by spelling', function () {
  var c = E.compareWords('ಮಳೆ', 'ಹೃದಯ', { language: 'kannada' });
  ok(c.phonetic < 75);
});

/* English pronunciation + stress */
check('English lexicon extracts stressed rhyme nucleus', function () {
  var p = E.parseEnglishWord('desire');
  ok(p.nucleus.indexOf('AY ER') >= 0); eq(p.syllables, 3);
});
check('English night / light is perfect', function () {
  eq(E.compareWords('night', 'light', { language: 'english' }).type, 'Perfect');
});
check('English fire / desire is multisyllabic', function () {
  eq(E.compareWords('fire', 'desire', { language: 'english' }).type, 'Multisyllabic');
});
check('English heart / hard is slant, not perfect', function () {
  var c = E.compareWords('heart', 'hard', { language: 'english' });
  eq(c.type, 'Near / Slant'); eq(c.exact, false);
});
check('English through / rough rejects spelling-only rhyme', function () {
  var c = E.compareWords('through', 'rough', { language: 'english' });
  ok(c.overall < 45); eq(c.type, 'Weak');
});
check('English day / way open-vowel rhyme is perfect', function () {
  eq(E.compareWords('day', 'way', { language: 'english' }).type, 'Perfect');
});
check('Unknown English words use fallback without crashing', function () {
  var p = E.parseEnglishWord('starlit');
  ok(p.tokens.length > 0); ok(p.syllables >= 1);
});

/* Syllables, language detection and schemes */
check('Kannada line syllables are counted from aksharas', function () {
  eq(E.countSyllables('ಕನಸು ಮನಸು', 'kannada'), 6);
});
check('English line syllables use pronunciation tokens', function () {
  eq(E.countSyllables('night light', 'english'), 2);
});
check('Mixed Kannada-English language is detected', function () {
  eq(E.detectLanguage('ನೀನು are my light'), 'bilingual');
});
check('Auto romantic hook uses AABB', function () { eq(E.resolveScheme('Chorus/Hook', 'Romantic'), 'AABB'); });
check('Auto celebration hook uses AAAA', function () { eq(E.resolveScheme('Chorus/Hook', 'Celebration'), 'AAAA'); });
check('Auto verse uses ABAB', function () { eq(E.resolveScheme('Verse', 'Happy'), 'ABAB'); });
check('Auto melancholic verse uses ABCB', function () { eq(E.resolveScheme('Verse', 'Melancholic'), 'ABCB'); });
check('Auto bridge uses ABBA', function () { eq(E.resolveScheme('Bridge', 'Romantic'), 'ABBA'); });
check('All requested scheme definitions exist', function () {
  ['AAAA','AABB','ABAB','ABBA','ABCB','AABA','AAAB','ABAC','AABC','AAXA'].forEach(function (s) {
    ok(E.SCHEMES[s] && E.SCHEMES[s].description, s + ' missing');
  });
});

/* Generation */
check('Kannada generation preserves supplied key phrase', function () {
  var g = E.generateLyrics({ language: 'kannada', idea: 'ಮಳೆಯಲ್ಲೊಂದು ಪ್ರೇಮಕಥೆ', section: 'Chorus/Hook', scheme: 'AABB' });
  ok(g.text.indexOf('ಮಳೆಯಲ್ಲೊಂದು ಪ್ರೇಮಕಥೆ') >= 0);
});
check('English generation preserves supplied story detail', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'the last bus home', section: 'Verse', scheme: 'ABAB' });
  ok(g.text.toLowerCase().indexOf('the last bus home') >= 0);
});
check('Bilingual generation contains both scripts', function () {
  var g = E.generateLyrics({ language: 'bilingual', idea: 'ಮಳೆ and memory', section: 'Verse', scheme: 'ABAB' });
  ok(/[\u0C80-\u0CFF]/.test(g.text)); ok(/[A-Za-z]/.test(g.text));
});
check('Full Song generates four focused sections', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'finding home', section: 'Full Song', scheme: 'auto' });
  eq(g.sections.length, 4); ok(g.text.indexOf('[Bridge]') >= 0); ok(g.text.indexOf('[Chorus / Hook]') >= 0);
});
check('Short preference produces shorter lines than long preference', function () {
  var a = E.generateLyrics({ language: 'english', idea: 'hope', section: 'Verse', scheme: 'ABAB', syllables: 'short' });
  var b = E.generateLyrics({ language: 'english', idea: 'hope', section: 'Verse', scheme: 'ABAB', syllables: 'long' });
  var aa = E.analyzeLyrics(a.text, { language: 'english', section: 'Verse', scheme: 'ABAB' }).lines;
  var bb = E.analyzeLyrics(b.text, { language: 'english', section: 'Verse', scheme: 'ABAB' }).lines;
  var avgA = aa.reduce(function (n, x) { return n + x.syllableCount; }, 0) / aa.length;
  var avgB = bb.reduce(function (n, x) { return n + x.syllableCount; }, 0) / bb.length;
  ok(avgA < avgB, avgA + ' should be shorter than ' + avgB);
});
check('Devotional mood changes Kannada imagery and vocabulary', function () {
  var g = E.generateLyrics({ language: 'kannada', idea: 'ಬೆಳಗಿನ ಪ್ರಾರ್ಥನೆ', mood: 'Devotional', section: 'Chorus/Hook', scheme: 'AABB' });
  ok(g.text.indexOf('ನಾಮ') >= 0 || g.text.indexOf('ಕರುಣೆ') >= 0);
});
check('Sad mood changes the English emotional world', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'the room after goodbye', mood: 'Sad', section: 'Verse', scheme: 'ABAB' });
  ok(g.text.indexOf('shadow') >= 0 || g.text.indexOf('empty') >= 0 || g.text.indexOf('goodbye') >= 0);
});
check('Kannada Film Song mode changes a line with cinematic imagery', function () {
  var g = E.generateLyrics({ language: 'kannada', idea: 'ಮತ್ತೆ ಸಿಕ್ಕ ಪ್ರೀತಿ', section: 'Chorus/Hook', scheme: 'AABB', filmMode: true });
  ok(g.text.indexOf('ಬೆಳ್ಳಿತೆರೆಯ') >= 0);
});
check('Poetic register adds imagery but preserves rhyme ending', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'new hope', section: 'Verse', scheme: 'ABAB', vocabulary: 'poetic' });
  ok(g.text.indexOf('Beneath the patient moon') >= 0);
});

/* Structured line-level analysis */
check('AABB analysis assigns expected labels', function () {
  var text = '[Chorus]\nನಿನ್ನ ಕಣ್ಣಲ್ಲಿ ಹೊಸ ಪ್ರೀತಿ\nಮೌನ ಹಾಡಿದ ಮಧುರ ಗೀತಿ\nನಮ್ಮ ಚಿಕ್ಕ ಕನಸು\nಹಗುರಾಯಿತು ಮನಸು';
  var a = E.analyzeLyrics(text, { language: 'kannada', section: 'Chorus/Hook', scheme: 'AABB' });
  eq(a.lines.map(function (x) { return x.rhymeLabel; }).join(''), 'AABB');
  eq(a.quality.schemeBreaks, 0);
});
check('ABAB analysis assigns alternating labels', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'hope', section: 'Verse', scheme: 'ABAB' });
  var a = E.analyzeLyrics(g.text, { language: 'english', section: 'Verse', scheme: 'ABAB' });
  eq(a.lines.map(function (x) { return x.rhymeLabel; }).join(''), 'ABAB');
});
check('ABBA analysis assigns enclosed labels', function () {
  var g = E.generateLyrics({ language: 'kannada', idea: 'ಮೌನ', section: 'Bridge', scheme: 'ABBA' });
  var a = E.analyzeLyrics(g.text, { language: 'kannada', section: 'Bridge', scheme: 'ABBA' });
  eq(a.lines.map(function (x) { return x.rhymeLabel; }).join(''), 'ABBA');
});
check('ABCB recognizes open A and C anchors', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'memory', section: 'Verse', scheme: 'ABCB' });
  var a = E.analyzeLyrics(g.text, { language: 'english', section: 'Verse', scheme: 'ABCB' });
  eq(a.lines.map(function (x) { return x.rhymeLabel; }).join(''), 'ABCB');
});
check('AAAA generated hook remains one family', function () {
  var g = E.generateLyrics({ language: 'kannada', idea: 'ನೀನು', section: 'Chorus/Hook', scheme: 'AAAA' });
  var a = E.analyzeLyrics(g.text, { language: 'kannada', section: 'Chorus/Hook', scheme: 'AAAA' });
  eq(a.lines.map(function (x) { return x.rhymeLabel; }).join(''), 'AAAA');
  eq(a.quality.schemeBreaks, 0);
});
check('A deliberately broken pair gets a scheme warning', function () {
  var a = E.analyzeLyrics('[Verse]\nnight\nrough\nfire\ndesire', { language: 'english', section: 'Verse', scheme: 'AABB', style: 'perfect' });
  ok(a.quality.schemeBreaks >= 1); ok(a.lines[1].warnings.length >= 1);
});
check('Every analyzed line has the structured data contract', function () {
  var a = E.analyzeLyrics('[Verse]\nnight light\nbright sight', { language: 'english', scheme: 'AAAA' });
  a.lines.forEach(function (line) {
    ['text','rhymeLabel','rhymeType','rhymeTarget','syllableCount','phoneticEnding','rhythmScore','semanticScore','warnings'].forEach(function (key) {
      ok(Object.prototype.hasOwnProperty.call(line, key), key + ' missing');
    });
  });
});
check('Internal rhyme is detected from actual words', function () {
  var a = E.analyzeLyrics('[Verse]\nI see the light in the night', { language: 'english', scheme: 'AAXA', style: 'internal' });
  ok(a.lines[0].internalRhyme && a.lines[0].internalRhyme.overall >= 80);
});
check('Two internal rhyme points are identified as double internal', function () {
  var a = E.analyzeLyrics('[Verse]\nlight in the night, bright in my sight', { language: 'english', scheme: 'AAXA', style: 'internal' });
  eq(a.lines[0].internalRhyme.internalType, 'Double internal');
});
check('A returning word inside one line is recognized as echo rhyme', function () {
  var a = E.analyzeLyrics('[Hook]\nhome is where I remember home', { language: 'english', scheme: 'AAAA', style: 'internal' });
  ok(a.lines[0].internalRhyme && ['Echo','Double internal'].indexOf(a.lines[0].internalRhyme.internalType) >= 0);
});
check('Repeated rhyme word triggers warning', function () {
  var a = E.analyzeLyrics('[Hook]\ncome home\ncome home\nfind home\nstay home', { language: 'english', section: 'Chorus/Hook', scheme: 'AAAA' });
  ok(a.quality.repetitionCount > 0); ok(a.lines.some(function (x) { return x.warnings.indexOf('Repeated rhyme word') >= 0; }));
});
check('Quality panel values are bounded percentages', function () {
  var a = E.analyzeLyrics('[Verse]\nnight\nlight\nfire\ndesire', { language: 'english', scheme: 'AABB' });
  ['rhymeConsistency','syllableConsistency','rhythmConsistency','naturalLanguage','semanticCoherence'].forEach(function (key) {
    ok(a.quality[key] >= 0 && a.quality[key] <= 100, key + ' out of range');
  });
});
check('Hook analysis produces Hook Strength', function () {
  var g = E.generateLyrics({ language: 'english', idea: 'stay with me', section: 'Chorus/Hook', scheme: 'AAAA' });
  var a = E.analyzeLyrics(g.text, { language: 'english', section: 'Chorus/Hook', scheme: 'AAAA' });
  ok(typeof a.quality.hookStrength === 'number');
});
check('Auto Full Song resolves schemes separately by heading', function () {
  var g = E.generateLyrics({ language: 'kannada', idea: 'ಹೊಸ ದಾರಿ', section: 'Full Song', scheme: 'auto' });
  var a = E.analyzeLyrics(g.text, { language: 'kannada', section: 'Full Song', scheme: 'auto' });
  var schemes = a.lines.map(function (x) { return x.scheme; });
  ok(schemes.indexOf('ABAB') >= 0); ok(schemes.indexOf('AABB') >= 0); ok(schemes.indexOf('ABBA') >= 0);
});

/* Candidate separation and line-level refinement */
check('ಪ್ರೀತಿ strong suggestions contain ರೀತಿ, ನೀತಿ and ಗೀತಿ', function () {
  var s = E.suggestRhymes('ಪ್ರೀತಿ', { language: 'kannada' });
  var words = s.strong.map(function (x) { return x.word; });
  ['ರೀತಿ','ನೀತಿ','ಗೀತಿ'].forEach(function (word) { ok(words.indexOf(word) >= 0, word + ' missing'); });
});
check('ಪ್ರೀತಿ near suggestions keep ಬೀದಿ out of perfect group', function () {
  var s = E.suggestRhymes('ಪ್ರೀತಿ', { language: 'kannada' });
  ok(s.near.some(function (x) { return x.word === 'ಬೀದಿ'; }));
  ok(!s.strong.some(function (x) { return x.word === 'ಬೀದಿ'; }));
});
check('Meaning alternatives are separate from sound rhymes', function () {
  var s = E.suggestRhymes('ಪ್ರೀತಿ', { language: 'kannada' });
  var semantic = s.semantic.map(function (x) { return x.word; });
  ['ಮಮತೆ','ಒಲವು','ಬಂಧ'].forEach(function (word) { ok(semantic.indexOf(word) >= 0); });
});
check('English suggestions use pronunciation, not spelling', function () {
  var s = E.suggestRhymes('through', { language: 'english' });
  ok(!s.strong.some(function (x) { return x.word === 'rough'; }));
});
check('Improve-rhyme refinement returns line alternatives', function () {
  var r = E.refineLine('I carry hope through the night', 'improve-rhyme', { language: 'english', targetWord: 'light' });
  ok(r.length > 0); ok(r.every(function (x) { return x.text && x.reason; }));
});
check('Keep-rhyme refinement preserves selected ending', function () {
  var r = E.refineLine('ನಿನ್ನ ಕಣ್ಣಲ್ಲಿ ಹೊಸ ಪ್ರೀತಿ', 'keep-rhyme-improve-meaning', { language: 'kannada' });
  ok(r.every(function (x) { return E.lastWord(x.text) === 'ಪ್ರೀತಿ'; }));
});
check('Natural refinement simplifies known literary phrasing', function () {
  var r = E.refineLine('ತದನಂತರ ಮನದಾಳದೊಳಗೆ ಹಾಡು', 'natural', { language: 'kannada' });
  ok(r[0].text.indexOf('ನಂತರ') >= 0); ok(r[0].text.indexOf('ಮನದೊಳಗೆ') >= 0);
});
check('Hook refinement uses the supplied key phrase', function () {
  var r = E.refineLine('Stay with me tonight', 'hook', { language: 'english', idea: 'stay with me' });
  ok(r[0].text.toLowerCase().indexOf('stay with me, stay with me') >= 0);
});
check('replaceWord changes only the final selected occurrence', function () {
  eq(E.replaceWord('love is love', 'love', 'light'), 'love is light');
});
check('Empty lyric input remains safe', function () {
  var a = E.analyzeLyrics('', { language: 'kannada', scheme: 'AABB' });
  eq(a.lines.length, 0); eq(a.quality.schemeBreaks, 0);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
