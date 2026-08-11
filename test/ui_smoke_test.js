/**
 * ui_smoke_test.js — loads every UI controller against a minimal DOM stub
 * and exercises init paths + a few interactions (tab switch, prompt build,
 * song add/save, raga cards, metronome, release planner).
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
    this.options = [];
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
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
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

const TAB_IDS = ['prosody', 'raga', 'bpm', 'suno', 'mix', 'master', 'release', 'songs'];

global.window = {
  addEventListener() {},
  dispatchEvent() { return true; },
  __mixSummary: null
};
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
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
load('ragas.js');
load('raga-app.js');
load('bpm-key.js');
load('bpm-key-app.js');
load('ref-compare.js');
load('release-planner.js');
load('release-planner-app.js');
load('daw-guides.js');
load('master-check.js');
load('master-check-app.js');
load('suno-prompts.js');
load('mix-check.js');
load('mix-check-app.js');
load('song-studio.js');
load('nav.js');

// prosody rendered the demo
assert(getEl('result').innerHTML.indexOf('ಸಾಲು') >= 0, 'prosody renders demo output');
assert(getEl('result').innerHTML.indexOf('ಮಾತ್ರೆ') >= 0, 'prosody shows mātra totals');
assert(getEl('rules').innerHTML.indexOf('ನಿಯಮ') >= 0, 'prosody renders rules');

// raga explorer rendered
assert(getEl('rg-list').innerHTML.indexOf('Mohanam') >= 0, 'raga explorer rendered Mohanam');
assert(getEl('rg-list').innerHTML.indexOf('ಆರೋಹಣ') >= 0, 'raga arohana swaras displayed');

// metronome pattern select
assert(getEl('bk-met-pattern').innerHTML.indexOf('Adi Tala') >= 0, 'metronome pattern includes Adi Tala');

// release planner rendered
assert(getEl('rp-dist-checklist').innerHTML.indexOf('Spotify') >= 0, 'release planner rendered distribution checklist');

// ISRC generation on click
getEl('rp-isrc-country').value = 'IN';
getEl('rp-isrc-reg').value = 'RGS';
getEl('rp-isrc-year').value = '26';
getEl('rp-isrc-seq').value = '1';
getEl('rp-isrc-gen').click();
assert(getEl('rp-isrc-output').value === 'IN-RGS-26-00001', 'ISRC generator populated output on button click');

// master-check genre select populated
assert(getEl('mc-genre').innerHTML.indexOf('Pop / EDM') >= 0, 'master genre select populated');
assert(getEl('mx-genre').innerHTML.indexOf('Rock') >= 0, 'mix genre select populated');

// tab switching
const masterTab = getEl('master');
masterTab.click();
assert(masterTab.classList.contains('active'), 'master tab becomes active on click');
assert(getEl('tab-master').hidden === false, 'master panel shown');
assert(getEl('tab-prosody').hidden === true, 'prosody panel hidden');

const ragaTab = getEl('raga');
ragaTab.click();
assert(ragaTab.classList.contains('active'), 'raga tab becomes active on click');
assert(getEl('tab-raga').hidden === false, 'raga panel shown');

// suno prompt builder defaults
assert(getEl('sp-output').value.indexOf('[Genre: Let Suno decide]') >= 0, 'prompt output generated with defaults');
assert(getEl('sp-tempo').innerHTML.indexOf('Let Suno decide') >= 0, 'tempo select populated');
assert(getEl('sp-recipes').innerHTML.indexOf('ಕನ್ನಡ ಭಕ್ತಿಗೀತೆ') >= 0, 'preset recipes seeded');
assert(JSON.parse(global.localStorage.getItem('raaga.sunoRecipes')).length >= 3, 'presets persisted to localStorage');

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
assert(typeof global.window.RAGAS.getRagaById === 'function', 'RAGAS engine exposed');
assert(typeof global.window.BPM_KEY.analyzeKeyAndBpm === 'function', 'BPM_KEY engine exposed');
assert(typeof global.window.REF_COMPARE.compareReports === 'function', 'REF_COMPARE engine exposed');
assert(typeof global.window.RELEASE_PLANNER.validateArtwork === 'function', 'RELEASE_PLANNER engine exposed');
assert(typeof global.window.RaagaStudio.switchTo === 'function', 'RaagaStudio.switchTo exposed');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
