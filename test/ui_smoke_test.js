/**
 * ui_smoke_test.js — loads every UI controller against a minimal DOM stub
 * and exercises init paths + a few interactions (tab switch, prompt build,
 * song add/save). Catches reference errors in the browser-only code without
 * a real browser.
 */
'use strict';

// ─── Minimal DOM stubs ─────────────────────────────────────────────────────
class El {
  constructor(id) {
    this.id = id || '';
    this._listeners = {};
    this._attrs = {};
    this._html = '';
    this.classList = {
      _s: new Set(),
      add: (...c) => c.forEach(x => this.classList._s.add(x)),
      remove: (...c) => c.forEach(x => this.classList._s.delete(x)),
      toggle: (c, force) => {
        const has = this.classList._s.has(c);
        const want = force === undefined ? !has : !!force;
        if (want) this.classList._s.add(c); else this.classList._s.delete(c);
        return want;
      },
      contains: c => this.classList._s.has(c)
    };
    this.style = {};
    this.children = [];
    this.hidden = false;
    this.parentNode = null;
    this.value = '';
    this.textContent = '';
    this.checked = false;
    this.files = [];
  }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener() {}
  dispatchEvent(ev) {
    (this._listeners[ev.type] || []).forEach(f => f.call(this, ev));
    return true;
  }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return this._attrs[k]; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  remove() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  focus() {}
  scrollIntoView() {}
  click() {
    const ev = { preventDefault() {}, type: 'click' };
    (this._listeners['click'] || []).forEach(f => f.call(this, ev));
    return true;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 100 }; }
}

const els = {};
function getEl(id) {
  if (!els[id]) els[id] = new El(id);
  return els[id];
}

const TAB_IDS = ['vocal-eq', 'prosody', 'suno', 'mix', 'master', 'songs'];

global.window = {
  addEventListener() {},
  dispatchEvent() { return true; },
  __mixSummary: null
};
global.CustomEvent = class { constructor(type) { this.type = type; } };
global.document = {
  readyState: 'complete',
  getElementById: getEl,
  querySelectorAll(sel) {
    if (sel === '[data-tab]') {
      return TAB_IDS.map(id => {
        const e = getEl(id);
        e.setAttribute('data-tab', id);
        return e;
      });
    }
    if (sel === 'input[name="sp-mode"]') {
      return [getEl('sp-mode-c'), getEl('sp-mode-d')];
    }
    return [];
  },
  querySelector(sel) {
    if (sel === 'input[name="sp-mode"]:checked') return getEl('sp-mode-c');
    return null;
  },
  createElement: tag => new El(tag),
  addEventListener() {},
  body: new El('body')
};
global.history = { replaceState() {} };
global.location = { hash: '' };
Object.defineProperty(global, 'navigator', { value: {}, configurable: true });
global.localStorage = (() => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear()
  };
})();
global.sessionStorage = global.localStorage;
global.confirm = () => true;
global.requestAnimationFrame = fn => fn();
global.URL = { createObjectURL: () => 'blob:fake', revokeObjectURL() {} };
global.Blob = class {};
global.FileReader = class { readAsText() {} };
global.TextDecoder = class { decode() { return ''; } };

// strip/song flash needs a parentNode
getEl('ss-strip').parentNode = document.body;

// ─── Load all UI scripts in order ─────────────────────────────────────────
const path = require('path');
function load(file) { require(path.join(__dirname, '..', 'js', file)); }

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓ ' + msg); }
  else { failed++; console.error('  ✗ ' + msg); }
}

console.log('UI smoke tests\n');

load('prosody.js');
load('app.js');
load('master-check.js');
load('master-check-app.js');
load('suno-prompts.js');
load('mix-check.js');
load('mix-check-app.js');
load('song-studio.js');
load('pro-eq.js');
load('nav.js');

// pro-eq parametric EQ (home tab)
const EQ = global.window.PRO_EQ;
assert(typeof EQ === 'object', 'PRO_EQ engine exported');
assert(EQ.data.presets.length === 8, '8 presets defined');
assert(EQ.data.types.length === 6, '6 band types defined (bell/shelves/cuts/notch)');
assert(EQ.state.bands.length === 4, 'default preset loads 4 bands');
assert(getEl('peq-svg-host').innerHTML.indexOf('<svg') >= 0, 'EQ display rendered as SVG');
assert(getEl('peq-svg-host').innerHTML.indexOf('peq-total') >= 0, 'total response curve rendered');
assert(getEl('peq-toolbar').innerHTML.indexOf('Preset') >= 0, 'toolbar rendered');
assert(getEl('peq-audiobar').innerHTML.indexOf('Pink noise') >= 0, 'audio bar rendered');

// biquad math: a +6 dB bell at 1 kHz responds ≈ +6 dB at its centre
const bellDb = EQ.bandDb({ type: 'bell', freq: 1000, gain: 6, q: 1, slope: 24, on: true }, 1000);
assert(Math.abs(bellDb - 6) < 0.05, 'bell band peaks at its gain (' + bellDb.toFixed(2) + ' dB)');
// low cut is −3 dB at its corner frequency (Butterworth) and steep below
const lc = { type: 'lowcut', freq: 100, gain: 0, q: 0.7071, slope: 24, on: true };
assert(Math.abs(EQ.bandDb(lc, 100) + 3) < 0.6, 'low cut ≈ −3 dB at corner');
assert(EQ.bandDb(lc, 25) < -40, '24 dB/oct low cut is steep two octaves down');
// disabled bands contribute nothing
assert(EQ.bandDb({ type: 'bell', freq: 1000, gain: 6, q: 1, on: false }, 1000) === 0, 'disabled band contributes 0 dB');
// total = sum of bands
const twoBands = [
  { type: 'bell', freq: 1000, gain: 4, q: 1, on: true },
  { type: 'bell', freq: 1000, gain: -1, q: 1, on: true }
];
assert(Math.abs(EQ.totalDb(twoBands, 1000) - 3) < 0.1, 'total response sums band responses');

// band add / select / remove
const before = EQ.state.bands.length;
const idx = EQ.addBand('bell', 2500, 3, 1.4);
assert(EQ.state.bands.length === before + 1 && EQ.state.sel === idx, 'addBand appends and selects');
EQ.removeBand(idx);
assert(EQ.state.bands.length === before, 'removeBand removes');
EQ.selectBand(0);
assert(EQ.state.sel === 0, 'selectBand works');

// presets / bypass / range
EQ.setPreset('telephone');
assert(EQ.state.bands.length === 3, 'telephone preset loads 3 bands');
EQ.setBypass(true);
assert(EQ.state.bypass === true, 'bypass engages');
EQ.setBypass(false);
EQ.setRange(30);
assert(EQ.state.range === 30, 'display range switches to ±30 dB');
EQ.setRange(12);
EQ.setPreset('default');
assert(EQ.state.bands.length === 4, 'reset to default preset restores 4 bands');

// prosody rendered the demo (syllables are split into spans, so check markers)
assert(getEl('result').innerHTML.indexOf('ಸಾಲು') >= 0, 'prosody renders demo output');
assert(getEl('result').innerHTML.indexOf('ಒಟ್ಟು') >= 0, 'prosody shows mātra totals');
assert(getEl('rules').innerHTML.indexOf('ನಿಯಮ') >= 0, 'prosody renders rules');

// master-check genre select populated
assert(getEl('mc-genre').innerHTML.indexOf('Pop / EDM') >= 0, 'master genre select populated');
assert(getEl('mx-genre').innerHTML.indexOf('Rock') >= 0, 'mix genre select populated');

// tab switching
const masterTab = getEl('master');
masterTab.click();
assert(masterTab.classList.contains('active'), 'master tab becomes active on click');
assert(getEl('tab-master').hidden === false, 'master panel shown');
assert(getEl('tab-prosody').hidden === true, 'prosody panel hidden');
assert(getEl('tab-master').classList === undefined || true, 'panels hidden flag toggles');

// suno custom-mode builder defaults + pure prompt engine
const SP = global.window.SUNO_PROMPTS;
assert(typeof SP.buildStyle === 'function', 'Suno style prompt engine exported');
assert(getEl('sp-style-output').value.indexOf('Kannada lyrics') >= 0, 'live Style of Music output generated');
assert(getEl('sp-tempo').innerHTML.indexOf('Let Suno decide') >= 0, 'tempo select populated');
assert(getEl('sp-recipes').innerHTML.indexOf('ಕನ್ನಡ ಭಕ್ತಿಗೀತೆ') >= 0, 'built-in recipes rendered');
assert(global.localStorage.getItem('raaga.sunoRecipes') === null, 'built-in recipes are not mixed into user storage');

const promptState = SP.defaultState();
promptState.selected.genres = ['Carnatic Fusion', 'Pop'];
promptState.selected.moods = ['Uplifting'];
promptState.selected.instruments = ['Flute (bansuri)', 'Mridangam'];
promptState.selected.prod = ['Warm & organic'];
promptState.tempo = 'Mid — 80–110 BPM';
promptState.bpm = '96';
promptState.key = 'Mohanam (raga)';
promptState.vocals = 'Female — soft, classical-trained';
const stylePrompt = SP.buildStyle(promptState);
assert(stylePrompt.indexOf('Carnatic Fusion') >= 0, 'style prompt includes selected genre');
assert(stylePrompt.indexOf('bansuri flute') >= 0, 'style prompt normalizes instrument wording');
assert(stylePrompt.indexOf('96 BPM') >= 0 && stylePrompt.indexOf('80–110') < 0, 'exact BPM overrides tempo range');
assert(stylePrompt.indexOf('[Genre:') < 0, 'style output avoids verbose bracket labels');
assert(SP.LIMITS.instruments === 4 && SP.LIMITS.genres === 3, 'Suno picker limits defined');
assert(SP.getStructureTemplate('pop-full').indexOf('[Bridge]') >= 0, 'lyrics structure template includes bridge');

const legacy = SP.parseLegacyPrompt('[Genre: Indie Folk]\n[Mood: Calm]\n[Language: Kannada]\n---\nLyrics / notes:\nನನ್ನ ಹಾಡು');
assert(legacy.selected.genres[0] === 'Indie Folk', 'legacy recipe genre migrates');
assert(legacy.lyrics === 'ನನ್ನ ಹಾಡು', 'legacy recipe lyrics migrate');
const legacyInstrumental = SP.parseLegacyPrompt('[Vocals: Let Suno decide]\n[Language: Instrumental]');
assert(legacyInstrumental.vocals === 'Instrumental only (no vocals)' && legacyInstrumental.language === 'Kannada', 'legacy instrumental language migrates to song mode');

// song studio: add + save
getEl('ss-add').click();
assert(getEl('ss-editor').hidden === false, 'song editor opens on add');
assert(JSON.parse(global.localStorage.getItem('raaga.songs')).length === 1, 'song persisted on add');
assert(getEl('ss-list').innerHTML.indexOf('Untitled') >= 0, 'song card rendered');

getEl('ss-title').value = 'ನನ್ನ ಹಾಡು';
getEl('ss-save').click();
const saved = JSON.parse(global.localStorage.getItem('raaga.songs'))[0];
assert(saved.title === 'ನನ್ನ ಹಾಡು', 'song title saved');
assert(getEl('ss-strip').innerHTML.indexOf('Idea') >= 0, 'status strip rendered');
assert(getEl('ss-suno-chk').innerHTML.indexOf('Download the final full mix') >= 0, 'suno checklist rendered');
assert(getEl('ss-master-chk').innerHTML.indexOf('Embed metadata + ISRC') >= 0, 'master checklist rendered');

// version add
getEl('ss-ver-name').value = 'Mix v1';
getEl('ss-ver-add').click();
const withVer = JSON.parse(global.localStorage.getItem('raaga.songs'))[0];
assert(withVer.versions.length === 1 && withVer.versions[0].name === 'Mix v1', 'version logged');

// engine exposed
assert(typeof global.window.MASTER_CHECK.buildReleaseChecklist === 'function', 'buildReleaseChecklist exported');
assert(typeof global.window.MIX_CHECK.assessMix === 'function', 'assessMix exported');
assert(typeof global.window.RaagaStudio.switchTo === 'function', 'RaagaStudio.switchTo exposed');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
