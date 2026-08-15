/**
 * suno-prompts.js — Suno Prompt Builder.
 * Turns genre/mood/tempo/vocals/language/key/instruments/production picks into a
 * ready-to-paste Suno prompt. Includes a local recipe library (localStorage).
 */
'use strict';

(function () {
  var LS_RECIPES = 'raaga.sunoRecipes';

  // ─── Option data ─────────────────────────────────────────────────────────
  var DATA = {
    genres: [
      'Carnatic Fusion', 'Bhavageete (Kannada poetry)', 'Sugama Sangeetha',
      'Devotional / Bhajan', 'Indie Folk', 'Indie Pop', 'Pop', 'Rock',
      'Hip-Hop / Rap', 'EDM / Dance', 'Lo-fi / Chill', 'Film Score / Cinematic',
      'Indian Classical', 'Jazz', 'Ambient / Meditative'
    ],
    moods: [
      'Uplifting', 'Melancholic', 'Romantic', 'Devotional', 'Energetic',
      'Nostalgic', 'Calm', 'Dark', 'Playful', 'Grand / Cinematic', 'Yearning'
    ],
    tempos: [
      'Let Suno decide',
      'Slow — 60–80 BPM',
      'Mid — 80–110 BPM',
      'Mid-fast — 110–130 BPM',
      'Fast — 130+ BPM'
    ],
    keys: [
      'No preference',
      'C major', 'D major', 'G major', 'A major', 'E major',
      'A minor', 'E minor', 'D minor'
    ],
    vocals: [
      'Let Suno decide',
      'Female — soft, classical-trained',
      'Female — powerful, belting',
      'Male — warm, deep',
      'Male — light, folk style',
      'Duet — male & female',
      'Choir / group harmony',
      'Falsetto / high register',
      'Rap / spoken word',
      'Instrumental only (no vocals)'
    ],
    languages: [
      'Kannada', 'Hindi', 'Tamil', 'Telugu', 'English',
      'Kannada + Hindi mix', 'Instrumental', 'Let Suno decide'
    ],
    structures: [
      'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus (with intro & outro)',
      'Verse → Chorus → Verse → Chorus (simple pop form)',
      'AABA — classic jazz/standard form',
      'Raga alapana (intro) → composition → faster finale',
      'Build → Drop → Build → Drop (EDM)',
      'Freeform / let Suno decide'
    ],
    instruments: [
      'Violin', 'Flute (bansuri)', 'Mridangam', 'Tabla', 'Tanpura drone',
      'Sitar', 'Veena', 'Acoustic guitar', 'Electric guitar', 'Bass',
      'Piano', 'Synth pads', 'Strings ensemble', 'Drums', 'Percussion',
      'Harmonium', 'Shehnai', 'Saxophone', 'Cello', 'Mouth organ'
    ],
    prod: [
      'Warm & organic', 'Cinematic strings', 'Modern trap beat',
      'Vintage tape warmth', 'Huge reverb on vocals', 'Layered harmonies',
      'Minimal & sparse', 'Live-band feel', '90s film-song nostalgia',
      'Dreamy synth washes'
    ]
  };

  var PRESET_RECIPES = [
    {
      name: 'ಕನ್ನಡ ಭಕ್ತಿಗೀತೆ (Devotional)',
      prompt: '[Genre: Devotional / Bhajan, Carnatic Fusion]\n[Mood: Devotional, Uplifting]\n[Tempo: Mid — 80–110 BPM]\n[Key: Mohanam (raga)]\n[Vocals: Female — soft, classical-trained]\n[Language: Kannada]\n[Structure: Raga alapana (intro) → composition → faster finale]\n[Instruments: tanpura drone, mridangam, flute (bansuri), violin, harmonium]\n[Production: warm & organic, live-band feel, gentle call-and-response with a small chorus]'
    },
    {
      name: 'Carnatic Fusion Pop',
      prompt: '[Genre: Carnatic Fusion, Pop]\n[Mood: Uplifting, Energetic]\n[Tempo: Mid-fast — 110–130 BPM]\n[Key: Hamsadhwani (raga)]\n[Vocals: Female — powerful, belting]\n[Language: Kannada]\n[Structure: Verse → Chorus → Verse → Chorus → Bridge → Final Chorus (with intro & outro)]\n[Instruments: electric guitar, bass, drums, violin, synth pads, mridangam]\n[Production: cinematic strings, layered harmonies, modern crisp drums with subtle 90s film-song nostalgia]'
    },
    {
      name: 'ಇಂಡೀ ಹಾಡು (Indie acoustic)',
      prompt: '[Genre: Indie Folk, Bhavageete (Kannada poetry)]\n[Mood: Melancholic, Nostalgic]\n[Tempo: Slow — 60–80 BPM]\n[Key: A minor]\n[Vocals: Male — warm, deep]\n[Language: Kannada]\n[Structure: Verse → Chorus → Verse → Chorus (simple pop form)]\n[Instruments: acoustic guitar, cello, piano, flute (bansuri)]\n[Production: minimal & sparse, warm & organic, huge reverb on vocals, intimate and close-mic\'d]'
    }
  ];

  // ─── Element refs ────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  var chips = {
    genres: $('sp-genres'),
    moods: $('sp-moods'),
    instruments: $('sp-instruments'),
    prod: $('sp-prod')
  };
  var selects = {
    tempo: $('sp-tempo'),
    key: $('sp-key'),
    vocals: $('sp-vocals'),
    language: $('sp-language'),
    structure: $('sp-structure')
  };
  var extra = $('sp-extra');
  var output = $('sp-output');
  var recipeNameWrap = $('sp-recipe-name-wrap');
  var recipeNameInput = $('sp-recipe-name');
  var recipesEl = $('sp-recipes');

  // ─── State ───────────────────────────────────────────────────────────────
  var selected = { genres: [], moods: [], instruments: [], prod: [] };

  function fillSelect(el, list) {
    if (!el) return;
    el.innerHTML = list.map(function (v) {
      return '<option value="' + escapeAttr(v) + '">' + escapeHtml(v) + '</option>';
    }).join('');
  }

  function renderChips(group) {
    var el = chips[group];
    if (!el) return;
    el.innerHTML = DATA[group].map(function (v) {
      var on = selected[group].indexOf(v) >= 0;
      return '<button type="button" class="chip-opt' + (on ? ' on' : '') + '" data-v="' + escapeAttr(v) + '">' +
        escapeHtml(v) + '</button>';
    }).join('');
    el.querySelectorAll('.chip-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-v');
        var arr = selected[group];
        var i = arr.indexOf(v);
        if (i >= 0) { arr.splice(i, 1); } else { arr.push(v); }
        renderChips(group);
      });
    });
  }

  // ─── Prompt generation ───────────────────────────────────────────────────
  function currentMode() {
    var m = document.querySelector('input[name="sp-mode"]:checked');
    return m ? m.value : 'concise';
  }

  function tag(label, value) {
    return '[' + label + ': ' + value + ']';
  }

  function buildPrompt() {
    var g = selected.genres.join(', ') || 'Let Suno decide';
    var m = selected.moods.join(', ');
    var inst = selected.instruments.join(', ');
    var prod = selected.prod.join(', ');
    var tempo = selects.tempo ? selects.tempo.value : 'Let Suno decide';
    var key = selects.key ? selects.key.value : 'No preference';
    var vocals = selects.vocals ? selects.vocals.value : 'Let Suno decide';
    var lang = selects.language ? selects.language.value : 'Let Suno decide';
    var struct = selects.structure ? selects.structure.value : 'Freeform / let Suno decide';
    var extraText = (extra && extra.value) ? extra.value.trim() : '';
    var detailed = currentMode() === 'detailed';

    var parts = [];
    parts.push(tag('Genre', g));
    if (m) parts.push(tag('Mood', m));
    parts.push(tag('Tempo', tempo));
    if (key && key !== 'No preference') parts.push(tag('Key', key));
    parts.push(tag('Vocals', vocals));
    parts.push(tag('Language', lang));
    parts.push(tag('Structure', struct));
    if (inst) parts.push(tag('Instruments', inst));
    if (detailed) {
      if (prod) parts.push(tag('Production', prod));
      parts.push(tag('Style', 'clear diction, expressive dynamics, professional studio-quality production'));
    } else if (prod) {
      parts.push(tag('Production', prod.slice(0, 80) + (prod.length > 80 ? '…' : '')));
    }
    if (extraText) {
      parts.push('---');
      parts.push('Lyrics / notes:');
      parts.push(extraText);
    }
    return parts.join('\n');
  }

  function refreshOutput() {
    var text = buildPrompt();
    output.value = text;
    output.classList.toggle('has', !!text);
  }

  // ─── Recipes ─────────────────────────────────────────────────────────────
  function loadRecipes() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_RECIPES) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }

  function saveRecipes(list) {
    try { localStorage.setItem(LS_RECIPES, JSON.stringify(list)); } catch (e) {}
  }

  function renderRecipes() {
    var list = loadRecipes();
    if (!list.length) {
      recipesEl.innerHTML = '<p class="hint">No saved recipes yet. Generate a prompt, name it, and hit “Save as recipe”.</p>';
      return;
    }
    recipesEl.innerHTML = list.map(function (r, i) {
      return '<div class="pb-recipe">' +
        '<button type="button" class="pb-recipe-load" data-i="' + i + '">' + escapeHtml(r.name) + '</button>' +
        '<span class="pb-recipe-date">' + escapeHtml(r.at || '') + '</span>' +
        '<button type="button" class="pb-recipe-del" data-i="' + i + '" title="Delete recipe">✕</button>' +
        '</div>';
    }).join('');
    recipesEl.querySelectorAll('.pb-recipe-load').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = loadRecipes()[+b.getAttribute('data-i')];
        if (r) output.value = r.prompt;
      });
    });
    recipesEl.querySelectorAll('.pb-recipe-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var list2 = loadRecipes();
        list2.splice(+b.getAttribute('data-i'), 1);
        saveRecipes(list2);
        renderRecipes();
      });
    });
  }

  function saveCurrentRecipe() {
    var text = output.value.trim();
    if (!text) { flash('Generate a prompt first.'); return; }
    var name = (recipeNameInput.value || '').trim() || ('Recipe ' + (loadRecipes().length + 1));
    var list = loadRecipes();
    list.unshift({ name: name, prompt: text, at: new Date().toLocaleDateString() });
    saveRecipes(list);
    recipeNameInput.value = '';
    recipeNameWrap.hidden = true;
    renderRecipes();
    flash('Recipe “' + name + '” saved.');
  }

  // ─── Copy ────────────────────────────────────────────────────────────────
  function copyPrompt() {
    var text = output.value.trim();
    if (!text) { flash('Nothing to copy — generate a prompt first.'); return; }
    function done() { flash('Prompt copied — paste it into suno.com.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  // ─── Flash message ───────────────────────────────────────────────────────
  function flash(msg) {
    var el = $('sp-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sp-flash';
      el.className = 'pb-flash';
      var form = document.querySelector('.pb-form');
      if (form) form.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  var SELECT_DATA = { tempo: 'tempos', key: 'keys', vocals: 'vocals', language: 'languages', structure: 'structures' };

  // Extend the key list with every raga from the shared Raga Reference library
  // (js/raga-reference.js loads first and exposes window.RaagaStudio.RAGAS).
  var sharedRagas = (window.RaagaStudio && window.RaagaStudio.RAGAS) || [];
  DATA.keys = DATA.keys.concat(sharedRagas.map(function (r) { return r.name + ' (raga)'; }));

  function init() {
    Object.keys(selects).forEach(function (k) { fillSelect(selects[k], DATA[SELECT_DATA[k]]); });
    ['genres', 'moods', 'instruments', 'prod'].forEach(renderChips);

    var gen = $('sp-generate');
    if (gen) gen.addEventListener('click', refreshOutput);

    var copy = $('sp-copy');
    if (copy) copy.addEventListener('click', copyPrompt);

    var save = $('sp-save-recipe');
    if (save) save.addEventListener('click', function () { recipeNameWrap.hidden = false; recipeNameInput.focus(); });

    if (recipeNameInput) {
      recipeNameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveCurrentRecipe(); }
      });
    }
    var saveBtn = $('sp-save-recipe');
    // pressing save twice with a name set saves immediately
    if (saveBtn) {
      saveBtn.addEventListener('dblclick', function () { saveCurrentRecipe(); });
    }

    var outputEl = $('sp-output');
    if (outputEl) {
      outputEl.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') refreshOutput();
      });
    }

    // live re-generate when options change
    [extra, $('sp-tempo'), $('sp-key'), $('sp-vocals'), $('sp-language'), $('sp-structure')]
      .forEach(function (el) {
        if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', refreshOutput);
      });
    document.querySelectorAll('input[name="sp-mode"]').forEach(function (r) {
      r.addEventListener('change', refreshOutput);
    });

    // seed presets once
    var existing = loadRecipes();
    if (!existing.length) {
      saveRecipes(PRESET_RECIPES.map(function (r, i) {
        return { name: r.name, prompt: r.prompt, at: 'preset', order: i };
      }));
    }
    renderRecipes();
    refreshOutput();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }
})();
