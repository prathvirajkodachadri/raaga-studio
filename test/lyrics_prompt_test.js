/**
 * lyrics_prompt_test.js — QA for the Lyrics Lab songwriting-prompt builder.
 * Run with: node test/lyrics_prompt_test.js
 */
'use strict';

var P = require('../js/lyrics-prompt.js');
var assert = require('assert');
var pass = 0, fail = 0;

function check(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (error) { fail++; console.error('  ✗ ' + name + '\n    ' + error.message); }
}
function ok(value, message) { assert.ok(value, message); }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); }
function build(extra) {
  return P.buildPrompt(Object.assign({
    language: 'kannada', idea: 'ಮೊದಲ ಮಳೆಯಲ್ಲಿ ಮತ್ತೆ ಭೇಟಿಯಾದ ಇಬ್ಬರು', mood: 'Romantic',
    section: 'Chorus/Hook', scheme: 'AABB', style: 'hybrid'
  }, extra || {}));
}

console.log('Lyrics Lab prompt-builder tests\n');

check('prompt builder is exported', function () { eq(typeof P.buildPrompt, 'function'); });
check('Auto plus ten rhyme schemes are defined', function () { eq(Object.keys(P.SCHEMES).length, 11); });
['AAAA','AABB','ABAB','ABBA','ABCB','AABA','AAAB','ABAC','AABC','AAXA'].forEach(function (scheme) {
  check(scheme + ' has bilingual guide copy', function () {
    eq(P.SCHEMES[scheme].pattern, scheme);
    ok(P.SCHEMES[scheme].en.length > 20);
    ok(P.SCHEMES[scheme].kn.length > 10);
  });
});
check('Auto scheme has bilingual explanation', function () {
  eq(P.SCHEMES.auto.pattern, 'AUTO'); ok(P.SCHEMES.auto.en && P.SCHEMES.auto.kn);
});

check('song idea is preserved exactly', function () {
  var idea = 'Ananya meets Kiran at Majestic during the first rain.';
  ok(build({ idea: idea }).indexOf('Idea / story: ' + idea) >= 0);
});
check('Kannada prompt requests Kannada script', function () {
  ok(build().indexOf('Write the lyrics in Kannada script') >= 0);
});
check('Kannada prompt prioritizes spoken grammar', function () {
  var prompt = build();
  ok(prompt.indexOf('natural spoken Kannada') >= 0);
  ok(prompt.indexOf('correct Kannada grammar') >= 0);
});
check('Kannada prompt discusses spoken akshara sound', function () {
  ok(build().indexOf('spoken akshara sound') >= 0);
});
check('English prompt uses pronunciation and stress', function () {
  var prompt = build({ language: 'english', idea: 'finding home' });
  ok(prompt.indexOf('pronunciation and stress') >= 0);
  ok(prompt.indexOf('natural English') >= 0);
});
check('Bilingual prompt gives script-switching rules', function () {
  var prompt = build({ language: 'bilingual', idea: 'ಮಳೆ and memory' });
  ok(prompt.indexOf('Kannada words in Kannada script') >= 0);
  ok(prompt.indexOf('English words in Latin script') >= 0);
  ok(prompt.indexOf('translate every Kannada line') >= 0);
});

check('Full Song lets the writing AI choose a natural structure', function () {
  var prompt = build({ section: 'Full Song' });
  ok(prompt.indexOf('Choose a natural song structure') >= 0);
  ok(prompt.indexOf('do not force a standard Verse–Chorus template') >= 0);
});
check('Chorus prompt asks for memorability and strategic repetition', function () {
  var prompt = build({ section: 'Chorus/Hook' });
  ok(prompt.indexOf('memorable chorus or hook') >= 0);
  ok(prompt.indexOf('strategic repetition') >= 0);
});
check('Verse prompt prioritizes story over constant rhyme', function () {
  var prompt = build({ section: 'Verse' });
  ok(prompt.indexOf('develops the story') >= 0);
  ok(prompt.indexOf('more than making every line rhyme') >= 0);
});
check('Pre-Chorus prompt leads toward a chorus', function () {
  ok(build({ section: 'Pre-Chorus' }).indexOf('leads naturally toward a chorus') >= 0);
});
check('Bridge prompt asks for a fresh perspective', function () {
  ok(build({ section: 'Bridge' }).indexOf('fresh perspective') >= 0);
});
check('Custom section name is preserved', function () {
  var prompt = build({ section: 'Custom', customSection: 'Refrain after the bridge' });
  ok(prompt.indexOf('Refrain after the bridge') >= 0);
});
check('Custom mood is preserved', function () {
  var prompt = build({ mood: 'Custom', customMood: 'hopeful after heartbreak' });
  ok(prompt.indexOf('Mood: hopeful after heartbreak') >= 0);
});

check('AABB prompt explains both rhyme families', function () {
  var prompt = build({ scheme: 'AABB' });
  ok(prompt.indexOf('Lines 1–2 share one rhyme family') >= 0);
  ok(prompt.indexOf('lines 3–4 share another') >= 0);
});
check('ABAB prompt explains alternating families', function () {
  ok(build({ scheme: 'ABAB' }).indexOf('Alternating rhyme families') >= 0);
});
check('ABCB prompt explains the loose storytelling scheme', function () {
  ok(build({ scheme: 'ABCB' }).indexOf('Only lines 2 and 4') >= 0);
});
check('AAXA prompt explains the intentionally free line', function () {
  ok(build({ scheme: 'AAXA' }).indexOf('intentionally free line') >= 0);
});
check('Auto scheme lets AI choose based on section and mood', function () {
  var prompt = build({ scheme: 'auto', section: 'Verse', mood: 'Melancholic' });
  ok(prompt.indexOf('Rhyme scheme: Auto / choose naturally') >= 0);
  ok(prompt.indexOf('appropriate to this Verse and its Melancholic mood') >= 0);
});

Object.keys(P.STYLE_INSTRUCTIONS).forEach(function (style) {
  check(style + ' rhyme style changes the writing direction', function () {
    var prompt = build({ style: style });
    ok(prompt.indexOf(P.STYLE_INSTRUCTIONS[style]) >= 0);
  });
});
check('Hybrid is the default rhyme style', function () {
  var prompt = P.buildPrompt({ idea: 'A quiet reunion' });
  ok(prompt.indexOf('Rhyme style: Hybrid') >= 0);
  ok(prompt.indexOf('balance pronunciation, rhythm, syllable flow and meaning') >= 0);
});

check('short line preference appears in prompt', function () {
  ok(build({ syllables: 'short' }).indexOf('roughly 4–7 syllables') >= 0);
});
check('medium line preference appears in prompt', function () {
  ok(build({ syllables: 'medium' }).indexOf('roughly 8–11 syllables') >= 0);
});
check('long line preference appears in prompt', function () {
  ok(build({ syllables: 'long' }).indexOf('roughly 12–16 syllables') >= 0);
});
check('poetic vocabulary preference appears in prompt', function () {
  ok(build({ vocabulary: 'poetic' }).indexOf('Vocabulary: Poetic imagery') >= 0);
});
check('key names and story details are preserved exactly', function () {
  var details = 'Ananya, Kiran, Majestic bus stop, “ಮತ್ತೆ ಸಿಕ್ಕ ಕ್ಷಣ”';
  ok(build({ keyPhrases: details }).indexOf(details) >= 0);
});
check('Kannada Film Song mode adds cinematic and singable rules', function () {
  var prompt = build({ filmMode: true });
  ok(prompt.indexOf('Kannada film-song lyricist') >= 0);
  ok(prompt.indexOf('Prefer vivid but understandable cinematic images') >= 0);
  ok(prompt.indexOf('comfortable for singing') >= 0);
});
check('Bilingual film mode uses a bilingual film lyricist role', function () {
  var prompt = build({ language: 'bilingual', filmMode: true });
  ok(prompt.indexOf('blend Kannada and English naturally') >= 0);
});

check('prompt states the approved songwriting priority order', function () {
  ok(build().indexOf('Meaning → Emotion → Natural language → Rhythm → Rhyme') >= 0);
});
check('prompt warns against distorted grammar', function () {
  ok(build().indexOf('Do not distort grammar') >= 0);
});
check('prompt warns against unnecessary repeated rhyme words', function () {
  ok(build().indexOf('Do not repeat the same rhyme word unnecessarily') >= 0);
});
check('prompt allows a natural deviation from the selected scheme', function () {
  ok(build().indexOf('make the smallest natural deviation') >= 0);
});
check('prompt requests finished lyrics with headings', function () {
  ok(build().indexOf('Return the finished lyrics with clear section headings') >= 0);
});
check('prompt requests short bilingual rhyme notes', function () {
  ok(build().indexOf('Rhyme Notes / ಪ್ರಾಸದ ಟಿಪ್ಪಣಿ') >= 0);
});
check('prompt requests actual scheme and ending families in notes', function () {
  var prompt = build();
  ok(prompt.indexOf('actual rhyme scheme') >= 0);
  ok(prompt.indexOf('principal ending families') >= 0);
});
check('prompt explicitly rejects numerical rhyme scores', function () {
  ok(build().indexOf('Do not provide numerical rhyme scores') >= 0);
});
check('empty idea is rejected', function () {
  assert.throws(function () { P.buildPrompt({ idea: '   ' }); }, /song idea/i);
});
check('prompt output contains no canned lyric section', function () {
  var prompt = build();
  ok(prompt.indexOf('[Verse 1]') < 0);
  ok(prompt.indexOf('[Chorus]') < 0);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
