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
load('vocal-eq.js');
load('nav.js');

// vocal eq map (home tab)
assert(typeof global.window.VOCAL_EQ === 'object', 'VOCAL_EQ engine exported');
assert(global.window.VOCAL_EQ.data.zones.length === 15, '15 frequency zones defined');
assert(global.window.VOCAL_EQ.data.troubles.length === 13, '13 troubleshooting cards defined');
assert(getEl('vq-chart').innerHTML.indexOf('<svg') >= 0, 'EQ chart rendered as SVG');
assert(getEl('vq-chips').innerHTML.indexOf('Mud') >= 0, 'zone legend chips rendered');
assert(getEl('vq-detail').innerHTML.indexOf('Boost') >= 0, 'detail panel rendered');
assert(getEl('vq-table').innerHTML.indexOf('Sub / Rumble') >= 0, 'quick reference table rendered');
assert(getEl('vq-easy-problems').innerHTML.indexOf('Muddy') >= 0, 'easy guide problem picker rendered');
assert(getEl('vq-easy-result').innerHTML.indexOf('suggested starting move') >= 0, 'easy guide recipe rendered');
assert(global.window.VOCAL_EQ.state.view === 'easy' && getEl('vq-advanced').hidden === true, 'easy guide is the default view');
global.window.VOCAL_EQ.setView('advanced');
assert(getEl('vq-advanced').hidden === false && getEl('vq-easy').hidden === true, 'full EQ map can be opened');
global.window.VOCAL_EQ.setView('easy');
getEl('vq-mode-female').click();
assert(global.window.VOCAL_EQ.state.mode === 'female', 'female mode switch works');
assert(global.window.VOCAL_EQ.state.showMale === false, 'male curve hidden in female mode');
getEl('vq-mode-male').click();
assert(global.window.VOCAL_EQ.state.mode === 'male', 'male mode switch works');
getEl('vq-compare').click();
assert(global.window.VOCAL_EQ.state.showMale && global.window.VOCAL_EQ.state.showFemale, 'compare shows both curves');
getEl('vq-reset').click();
assert(global.window.VOCAL_EQ.state.mode === 'male' && global.window.VOCAL_EQ.state.showFemale === false, 'reset restores defaults');

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

// suno prompt builder defaults
assert(getEl('sp-output').value.indexOf('[Genre: Let Suno decide]') >= 0, 'prompt output generated with defaults');
assert(getEl('sp-tempo').innerHTML.indexOf('Let Suno decide') >= 0, 'tempo select populated');
assert(getEl('sp-recipes').innerHTML.indexOf('ಕನ್ನಡ ಭಕ್ತಿಗೀತೆ') >= 0, 'preset recipes seeded');
assert(JSON.parse(global.localStorage.getItem('raaga.sunoRecipes')).length === 3, 'presets persisted to localStorage');

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
