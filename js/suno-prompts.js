/**
 * suno-prompts.js — Suno Custom Mode prompt builder.
 *
 * Builds the fields Suno actually exposes in Custom Mode: Style of Music,
 * Lyrics, Title and Exclude. The form updates live, enforces selection limits,
 * preserves a local draft, and stores complete (editable) recipe state.
 */
'use strict';

(function () {
  var LS_RECIPES = 'raaga.sunoRecipes';
  var LS_DRAFT = 'raaga.sunoDraft.v2';
  var RECIPE_VERSION = 2;

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
      'C major', 'D♭ major', 'D major', 'E♭ major', 'E major', 'F major',
      'F♯ major', 'G major', 'A♭ major', 'A major', 'B♭ major', 'B major',
      'C minor', 'C♯ minor', 'D minor', 'E♭ minor', 'E minor', 'F minor',
      'F♯ minor', 'G minor', 'G♯ minor', 'A minor', 'B♭ minor', 'B minor'
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
      'Kannada + Hindi mix', 'Let Suno decide'
    ],
    structures: [
      { id: 'none', label: 'No template — write my own', style: '', template: '' },
      {
        id: 'pop-full',
        label: 'Verse → Chorus → Verse → Chorus → Bridge → Final Chorus',
        style: 'verse-chorus form with a bridge and final chorus',
        template: '[Intro]\n\n[Verse 1]\n\n[Chorus]\n\n[Verse 2]\n\n[Chorus]\n\n[Bridge]\n\n[Final Chorus]\n\n[Outro]'
      },
      {
        id: 'pop-simple',
        label: 'Verse → Chorus → Verse → Chorus',
        style: 'simple verse-chorus form',
        template: '[Intro]\n\n[Verse 1]\n\n[Chorus]\n\n[Verse 2]\n\n[Chorus]\n\n[Outro]'
      },
      {
        id: 'aaba',
        label: 'AABA — classic standard form',
        style: 'classic AABA form',
        template: '[A1]\n\n[A2]\n\n[B - Bridge]\n\n[A3]'
      },
      {
        id: 'raga',
        label: 'Raga alapana → composition → faster finale',
        style: 'raga alapana opening, composed middle, faster finale',
        template: '[Alapana - Free Time]\n\n[Verse 1]\n\n[Refrain]\n\n[Verse 2]\n\n[Instrumental Interlude]\n\n[Fast Finale]\n\n[Outro]'
      },
      {
        id: 'edm',
        label: 'Build → Drop → Build → Drop',
        style: 'two builds and drops with a breakdown',
        template: '[Intro]\n\n[Build]\n\n[Drop]\n\n[Breakdown]\n\n[Build]\n\n[Final Drop]\n\n[Outro]'
      }
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

  var LIMITS = { genres: 3, moods: 3, instruments: 4, prod: 3 };
  var MINIMUMS = { genres: 1, moods: 1, instruments: 0, prod: 0 };

  var TEMPO_STYLE = {
    'Let Suno decide': '',
    'Slow — 60–80 BPM': 'slow, 60–80 BPM',
    'Mid — 80–110 BPM': 'mid-tempo, 80–110 BPM',
    'Mid-fast — 110–130 BPM': 'mid-fast, 110–130 BPM',
    'Fast — 130+ BPM': 'fast, 130+ BPM'
  };
  var VOCAL_STYLE = {
    'Let Suno decide': '',
    'Female — soft, classical-trained': 'soft classically trained female vocals',
    'Female — powerful, belting': 'powerful belting female vocals',
    'Male — warm, deep': 'warm deep male vocals',
    'Male — light, folk style': 'light folk-style male vocals',
    'Duet — male & female': 'male and female duet',
    'Choir / group harmony': 'choir with group harmonies',
    'Falsetto / high register': 'high-register falsetto vocals',
    'Rap / spoken word': 'rap and spoken-word vocals',
    'Instrumental only (no vocals)': 'instrumental only, no vocals'
  };
  var INSTRUMENT_STYLE = {
    'Flute (bansuri)': 'bansuri flute'
  };
  var PROD_STYLE = {
    'Warm & organic': 'warm organic production',
    'Cinematic strings': 'cinematic string arrangement',
    'Modern trap beat': 'modern trap beat',
    'Vintage tape warmth': 'vintage tape warmth',
    'Huge reverb on vocals': 'large vocal reverb',
    'Layered harmonies': 'layered vocal harmonies',
    'Minimal & sparse': 'minimal sparse arrangement',
    'Live-band feel': 'live-band feel',
    '90s film-song nostalgia': '1990s film-song nostalgia',
    'Dreamy synth washes': 'dreamy synth washes'
  };

  function defaultState() {
    return {
      version: RECIPE_VERSION,
      selected: { genres: [], moods: [], instruments: [], prod: [] },
      tempo: 'Let Suno decide',
      bpm: '',
      key: 'No preference',
      vocals: 'Let Suno decide',
      language: 'Kannada',
      structure: 'none',
      mode: 'concise',
      title: '',
      extraStyle: '',
      lyrics: '',
      exclude: ''
    };
  }

  function withDefaults(value) {
    var base = defaultState();
    var source = value && typeof value === 'object' ? value : {};
    var sourceSelected = source.selected && typeof source.selected === 'object' ? source.selected : {};
    Object.keys(base).forEach(function (key) {
      if (key !== 'selected' && source[key] != null) base[key] = source[key];
    });
    Object.keys(base.selected).forEach(function (group) {
      var list = Array.isArray(sourceSelected[group]) ? sourceSelected[group] : [];
      base.selected[group] = list.filter(function (item) {
        return DATA[group].indexOf(item) >= 0;
      }).slice(0, LIMITS[group]);
    });
    // Older drafts used “Instrumental” as a language. Suno exposes it as a
    // separate song mode, represented here by the vocal choice instead.
    if (base.language === 'Instrumental') {
      base.language = 'Kannada';
      base.vocals = 'Instrumental only (no vocals)';
    }
    return base;
  }

  var PRESET_RECIPES = [
    {
      name: 'ಕನ್ನಡ ಭಕ್ತಿಗೀತೆ',
      description: 'Devotional · Mohanam',
      state: withDefaults({
        selected: {
          genres: ['Devotional / Bhajan', 'Carnatic Fusion'],
          moods: ['Devotional', 'Uplifting'],
          instruments: ['Tanpura drone', 'Mridangam', 'Flute (bansuri)', 'Violin'],
          prod: ['Warm & organic', 'Live-band feel']
        },
        tempo: 'Mid — 80–110 BPM', key: 'Mohanam (raga)',
        vocals: 'Female — soft, classical-trained', language: 'Kannada',
        structure: 'raga', mode: 'detailed',
        extraStyle: 'gentle call-and-response with a small chorus'
      })
    },
    {
      name: 'Carnatic Fusion Pop',
      description: 'Bright · Hamsadhwani',
      state: withDefaults({
        selected: {
          genres: ['Carnatic Fusion', 'Pop'],
          moods: ['Uplifting', 'Energetic'],
          instruments: ['Electric guitar', 'Bass', 'Drums', 'Violin'],
          prod: ['Cinematic strings', 'Layered harmonies', '90s film-song nostalgia']
        },
        tempo: 'Mid-fast — 110–130 BPM', key: 'Hamsadhwani (raga)',
        vocals: 'Female — powerful, belting', language: 'Kannada',
        structure: 'pop-full', mode: 'detailed',
        extraStyle: 'crisp modern drums and subtle mridangam accents'
      })
    },
    {
      name: 'ಇಂಡೀ ಅಕೌಸ್ಟಿಕ್',
      description: 'Intimate · nostalgic',
      state: withDefaults({
        selected: {
          genres: ['Indie Folk', 'Bhavageete (Kannada poetry)'],
          moods: ['Melancholic', 'Nostalgic'],
          instruments: ['Acoustic guitar', 'Cello', 'Piano', 'Flute (bansuri)'],
          prod: ['Minimal & sparse', 'Warm & organic']
        },
        tempo: 'Slow — 60–80 BPM', key: 'A minor',
        vocals: 'Male — warm, deep', language: 'Kannada',
        structure: 'pop-simple', mode: 'detailed',
        extraStyle: 'intimate close-miked vocal with a restrained room reverb'
      })
    }
  ];

  // Extend the key list from the shared Raga Reference library.
  var sharedRagas = (window.RaagaStudio && window.RaagaStudio.RAGAS) || [];
  sharedRagas.forEach(function (raga) {
    var value = raga.name + ' (raga)';
    if (DATA.keys.indexOf(value) < 0) DATA.keys.push(value);
  });

  function $(id) { return document.getElementById(id); }

  var chipEls = {
    genres: $('sp-genres'), moods: $('sp-moods'),
    instruments: $('sp-instruments'), prod: $('sp-prod')
  };
  var selects = {
    tempo: $('sp-tempo'), key: $('sp-key'), vocals: $('sp-vocals'),
    language: $('sp-language'), structure: $('sp-structure')
  };
  var titleInput = $('sp-title');
  var bpmInput = $('sp-bpm');
  var extraStyleInput = $('sp-extra-style');
  var lyricsInput = $('sp-lyrics');
  var excludeInput = $('sp-exclude');
  var styleOutput = $('sp-style-output');
  var recipesEl = $('sp-recipes');
  var recipeNameWrap = $('sp-recipe-name-wrap');
  var recipeNameInput = $('sp-recipe-name');
  var selected = { genres: [], moods: [], instruments: [], prod: [] };
  var draftTimer = null;
  var applyingState = false;

  function fillSelect(el, list) {
    if (!el) return;
    el.innerHTML = list.map(function (item) {
      var value = typeof item === 'string' ? item : item.id;
      var label = typeof item === 'string' ? item : item.label;
      return '<option value="' + escapeAttr(value) + '">' + escapeHtml(label) + '</option>';
    }).join('');
  }

  function updateGroupCount(group) {
    var el = $('sp-' + group + '-count');
    if (!el) return;
    var count = selected[group].length;
    el.textContent = count + ' / ' + LIMITS[group];
    el.classList.toggle('at-limit', count === LIMITS[group]);
  }

  function renderChips(group) {
    var el = chipEls[group];
    if (!el) return;
    el.innerHTML = DATA[group].map(function (value) {
      var on = selected[group].indexOf(value) >= 0;
      return '<button type="button" class="chip-opt' + (on ? ' on' : '') + '"' +
        ' data-v="' + escapeAttr(value) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        escapeHtml(value) + '</button>';
    }).join('');
    el.querySelectorAll('.chip-opt').forEach(function (button) {
      button.addEventListener('click', function () {
        var value = button.getAttribute('data-v');
        var list = selected[group];
        var index = list.indexOf(value);
        if (index >= 0) {
          list.splice(index, 1);
        } else if (list.length >= LIMITS[group]) {
          flash('Choose up to ' + LIMITS[group] + ' ' + group + '. Remove one before adding another.');
          return;
        } else {
          list.push(value);
        }
        var isOn = list.indexOf(value) >= 0;
        button.classList.toggle('on', isOn);
        button.setAttribute('aria-pressed', isOn ? 'true' : 'false');
        updateGroupCount(group);
        updatePrompt();
      });
    });
    updateGroupCount(group);
  }

  function currentMode() {
    var radio = document.querySelector('input[name="sp-mode"]:checked');
    return radio && radio.value ? radio.value : 'concise';
  }

  function structureById(id) {
    for (var i = 0; i < DATA.structures.length; i++) {
      if (DATA.structures[i].id === id) return DATA.structures[i];
    }
    return DATA.structures[0];
  }

  function ragaByKey(key) {
    var name = String(key || '').replace(/ \(raga\)$/, '');
    for (var i = 0; i < sharedRagas.length; i++) {
      if (sharedRagas[i].name === name) return sharedRagas[i];
    }
    return null;
  }

  function displayGenre(value) {
    return String(value)
      .replace('Bhavageete (Kannada poetry)', 'Kannada Bhavageete')
      .replace('Devotional / Bhajan', 'devotional bhajan')
      .replace('Hip-Hop / Rap', 'hip-hop rap')
      .replace('EDM / Dance', 'EDM dance')
      .replace('Lo-fi / Chill', 'lo-fi chill')
      .replace('Film Score / Cinematic', 'cinematic film score')
      .replace('Ambient / Meditative', 'ambient meditative');
  }

  function cleanFreeText(value) {
    return String(value || '').trim().replace(/\s*\n+\s*/g, ', ').replace(/\s{2,}/g, ' ');
  }

  function buildStyle(inputState) {
    var state = withDefaults(inputState);
    var parts = [];
    var instrumental = state.vocals === 'Instrumental only (no vocals)';

    state.selected.genres.forEach(function (item) { parts.push(displayGenre(item)); });
    state.selected.moods.forEach(function (item) { parts.push(item.toLowerCase()); });

    var exactBpm = Number(state.bpm);
    if (exactBpm >= 40 && exactBpm <= 240) parts.push(Math.round(exactBpm) + ' BPM');
    else if (TEMPO_STYLE[state.tempo]) parts.push(TEMPO_STYLE[state.tempo]);

    if (state.key && state.key !== 'No preference') {
      var raga = ragaByKey(state.key);
      if (raga && state.mode === 'detailed') parts.push(raga.suno);
      else parts.push(state.key.replace(/ \(raga\)$/, ' raga'));
    }

    state.selected.instruments.forEach(function (item) {
      parts.push(INSTRUMENT_STYLE[item] || item.toLowerCase());
    });

    var voice = VOCAL_STYLE[state.vocals] || '';
    if (instrumental) {
      parts.push('instrumental only');
      parts.push('no vocals');
    } else {
      if (voice) parts.push(voice);
      if (state.language && state.language !== 'Let Suno decide') {
        parts.push(state.language === 'Kannada + Hindi mix' ? 'Kannada-Hindi bilingual lyrics' : state.language + ' lyrics');
      }
    }

    state.selected.prod.forEach(function (item) { parts.push(PROD_STYLE[item] || item.toLowerCase()); });

    var structure = structureById(state.structure);
    if (state.mode === 'detailed' && structure.style) parts.push(structure.style);
    if (state.mode === 'detailed' && !instrumental) {
      parts.push('clear diction');
      parts.push('expressive dynamics');
    }
    if (state.mode === 'detailed') parts.push('polished studio production');

    var extra = cleanFreeText(state.extraStyle);
    if (extra) parts.push(extra);

    var seen = {};
    return parts.filter(function (part) {
      var key = String(part).toLowerCase();
      if (!part || seen[key]) return false;
      seen[key] = true;
      return true;
    }).join(', ');
  }

  function stateFromForm() {
    return withDefaults({
      selected: {
        genres: selected.genres.slice(), moods: selected.moods.slice(),
        instruments: selected.instruments.slice(), prod: selected.prod.slice()
      },
      tempo: selects.tempo ? selects.tempo.value : 'Let Suno decide',
      bpm: bpmInput ? bpmInput.value : '',
      key: selects.key ? selects.key.value : 'No preference',
      vocals: selects.vocals ? selects.vocals.value : 'Let Suno decide',
      language: selects.language ? selects.language.value : 'Kannada',
      structure: selects.structure ? selects.structure.value : 'none',
      mode: currentMode(),
      title: titleInput ? titleInput.value : '',
      extraStyle: extraStyleInput ? extraStyleInput.value : '',
      lyrics: lyricsInput ? lyricsInput.value : '',
      exclude: excludeInput ? excludeInput.value : ''
    });
  }

  function writeValue(el, value) {
    if (el) el.value = value == null ? '' : value;
  }

  function applyState(value, options) {
    var state = withDefaults(value);
    applyingState = true;
    selected = {
      genres: state.selected.genres.slice(), moods: state.selected.moods.slice(),
      instruments: state.selected.instruments.slice(), prod: state.selected.prod.slice()
    };
    writeValue(selects.tempo, state.tempo);
    writeValue(bpmInput, state.bpm);
    writeValue(selects.key, state.key);
    writeValue(selects.vocals, state.vocals);
    writeValue(selects.language, state.language);
    writeValue(selects.structure, state.structure);
    writeValue(titleInput, state.title);
    writeValue(extraStyleInput, state.extraStyle);
    writeValue(lyricsInput, state.lyrics);
    writeValue(excludeInput, state.exclude);
    document.querySelectorAll('input[name="sp-mode"]').forEach(function (radio) {
      radio.checked = radio.value === state.mode;
    });
    Object.keys(chipEls).forEach(renderChips);
    applyingState = false;
    updatePrompt(options && options.skipDraft);
  }

  function isInstrumental(state) {
    return state.vocals === 'Instrumental only (no vocals)';
  }

  function updatePrompt(skipDraft) {
    if (applyingState) return;
    var state = stateFromForm();
    var style = buildStyle(state);
    if (styleOutput) {
      styleOutput.value = style;
      styleOutput.classList.toggle('has', !!style);
    }

    var styleCount = $('sp-style-count');
    if (styleCount) styleCount.textContent = style.length + ' characters';
    var lyricsCount = $('sp-lyrics-count');
    if (lyricsCount) lyricsCount.textContent = state.lyrics.length + ' characters';

    var instrumental = isInstrumental(state);
    var note = $('sp-instrumental-note');
    if (note) note.hidden = !instrumental;
    if (lyricsInput) lyricsInput.classList.toggle('is-muted', instrumental);
    var copyLyrics = $('sp-copy-lyrics');
    if (copyLyrics) copyLyrics.disabled = instrumental || !state.lyrics.trim();
    var templateButton = $('sp-insert-template');
    if (templateButton) templateButton.disabled = instrumental || state.structure === 'none';
    var copyStyle = $('sp-copy-style');
    if (copyStyle) copyStyle.disabled = !style;

    var validation = $('sp-validation');
    if (validation) {
      var missing = [];
      if (state.selected.genres.length < MINIMUMS.genres) missing.push('a genre');
      if (state.selected.moods.length < MINIMUMS.moods) missing.push('a mood');
      if (missing.length) {
        validation.className = 'pb-validation warn';
        validation.textContent = 'For a stronger result, choose ' + missing.join(' and ') + '.';
      } else {
        validation.className = 'pb-validation ready';
        validation.textContent = 'Ready to paste into Suno Custom Mode.';
      }
    }

    if (!skipDraft) scheduleDraftSave(state);
  }

  function scheduleDraftSave(state) {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try { localStorage.setItem(LS_DRAFT, JSON.stringify(state)); } catch (e) {}
    }, 180);
  }

  function loadDraft() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_DRAFT) || 'null');
      return raw && typeof raw === 'object' ? withDefaults(raw) : null;
    } catch (e) { return null; }
  }

  function insertStructureTemplate() {
    var structure = structureById(selects.structure ? selects.structure.value : 'none');
    if (!structure.template) {
      flash('Choose a song structure first.');
      return;
    }
    if (isInstrumental(stateFromForm())) {
      flash('Lyrics are off for an instrumental track.');
      return;
    }
    var current = lyricsInput.value || '';
    var start = typeof lyricsInput.selectionStart === 'number' ? lyricsInput.selectionStart : current.length;
    var end = typeof lyricsInput.selectionEnd === 'number' ? lyricsInput.selectionEnd : start;
    var before = current.slice(0, start);
    var after = current.slice(end);
    var prefix = before && !/\n\s*$/.test(before) ? '\n\n' : '';
    var suffix = after && !/^\s*\n/.test(after) ? '\n\n' : '';
    lyricsInput.value = before + prefix + structure.template + suffix + after;
    var caret = (before + prefix + structure.template).length;
    if (typeof lyricsInput.setSelectionRange === 'function') lyricsInput.setSelectionRange(caret, caret);
    lyricsInput.focus();
    updatePrompt();
    flash('Section template inserted. Add lyrics beneath each tag.');
  }

  // Recipes -----------------------------------------------------------------
  function loadRecipes() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_RECIPES) || '[]');
      var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);
      // Older versions stored built-in presets alongside user data. They now
      // render separately so they cannot be accidentally deleted.
      return list.filter(function (recipe) { return recipe && recipe.at !== 'preset'; });
    } catch (e) { return []; }
  }

  function saveRecipes(list) {
    try {
      localStorage.setItem(LS_RECIPES, JSON.stringify(list));
      return true;
    } catch (e) {
      flash('Could not save recipes in this browser.');
      return false;
    }
  }

  function recipeCard(recipe, kind, index) {
    var builtIn = kind === 'preset';
    return '<article class="pb-recipe">' +
      '<button type="button" class="pb-recipe-load" data-kind="' + kind + '" data-i="' + index + '">' +
        '<span>' + escapeHtml(recipe.name) + '</span>' +
        '<small>' + escapeHtml(recipe.description || (builtIn ? 'Starter recipe' : recipe.at || 'Saved recipe')) + '</small>' +
      '</button>' +
      '<span class="pb-recipe-badge">' + (builtIn ? 'Built in' : 'Saved') + '</span>' +
      (builtIn ? '' : '<button type="button" class="pb-recipe-del" data-i="' + index + '" aria-label="Delete ' + escapeAttr(recipe.name) + '" title="Delete recipe">✕</button>') +
    '</article>';
  }

  function renderRecipes() {
    if (!recipesEl) return;
    var saved = loadRecipes();
    var html = '<section class="pb-recipe-section"><h4>Starter recipes</h4>' +
      PRESET_RECIPES.map(function (recipe, index) { return recipeCard(recipe, 'preset', index); }).join('') +
      '</section><section class="pb-recipe-section"><h4>Your recipes</h4>' +
      (saved.length
        ? saved.map(function (recipe, index) { return recipeCard(recipe, 'saved', index); }).join('')
        : '<p class="hint pb-empty">No saved recipes yet.</p>') +
      '</section>';
    recipesEl.innerHTML = html;

    recipesEl.querySelectorAll('.pb-recipe-load').forEach(function (button) {
      button.addEventListener('click', function () {
        var index = +button.getAttribute('data-i');
        var recipe = button.getAttribute('data-kind') === 'preset' ? PRESET_RECIPES[index] : loadRecipes()[index];
        if (!recipe) return;
        var state = recipe.state ? withDefaults(recipe.state) : parseLegacyPrompt(recipe.prompt || '');
        applyState(state);
        flash('Loaded “' + recipe.name + '”. You can edit every setting.');
      });
    });

    recipesEl.querySelectorAll('.pb-recipe-del').forEach(function (button) {
      button.addEventListener('click', function () {
        var list = loadRecipes();
        var index = +button.getAttribute('data-i');
        var recipe = list[index];
        if (!recipe) return;
        if (typeof confirm === 'function' && !confirm('Delete recipe “' + recipe.name + '”?')) return;
        list.splice(index, 1);
        if (saveRecipes(list)) {
          renderRecipes();
          flash('Recipe deleted.');
        }
      });
    });
  }

  function openRecipeForm() {
    if (!recipeNameWrap || !recipeNameInput) return;
    recipeNameWrap.hidden = false;
    if (!recipeNameInput.value) recipeNameInput.value = (titleInput.value || '').trim();
    if (typeof recipeNameWrap.scrollIntoView === 'function') {
      recipeNameWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    recipeNameInput.focus();
  }

  function closeRecipeForm() {
    if (recipeNameWrap) recipeNameWrap.hidden = true;
  }

  function saveCurrentRecipe() {
    var name = (recipeNameInput.value || '').trim();
    if (!name) {
      flash('Give this recipe a name first.');
      recipeNameInput.focus();
      return;
    }
    var list = loadRecipes();
    if (list.length >= 30) {
      flash('Recipe library is full. Delete one before saving another.');
      return;
    }
    list.unshift({
      id: 'recipe-' + Date.now(),
      version: RECIPE_VERSION,
      name: name,
      at: new Date().toLocaleDateString(),
      description: stateFromForm().selected.genres.slice(0, 2).join(' · ') || 'Custom recipe',
      state: stateFromForm()
    });
    if (!saveRecipes(list)) return;
    recipeNameInput.value = '';
    closeRecipeForm();
    renderRecipes();
    flash('Recipe “' + name + '” saved.');
  }

  function matchValues(raw, options) {
    return String(raw || '').split(',').map(function (item) { return item.trim(); }).filter(function (item) {
      return item && item !== 'Let Suno decide';
    }).map(function (item) {
      for (var i = 0; i < options.length; i++) {
        if (options[i].toLowerCase() === item.toLowerCase()) return options[i];
      }
      return '';
    }).filter(Boolean);
  }

  function parseLegacyPrompt(prompt) {
    var state = defaultState();
    var fields = {};
    String(prompt || '').split('\n').forEach(function (line) {
      var match = line.match(/^\[([^:]+):\s*(.*)\]$/);
      if (match) fields[match[1].toLowerCase()] = match[2];
    });
    state.selected.genres = matchValues(fields.genre, DATA.genres).slice(0, LIMITS.genres);
    state.selected.moods = matchValues(fields.mood, DATA.moods).slice(0, LIMITS.moods);
    state.selected.instruments = matchValues(fields.instruments, DATA.instruments).slice(0, LIMITS.instruments);
    state.selected.prod = matchValues(fields.production, DATA.prod).slice(0, LIMITS.prod);
    if (DATA.tempos.indexOf(fields.tempo) >= 0) state.tempo = fields.tempo;
    if (DATA.keys.indexOf(fields.key) >= 0) state.key = fields.key;
    if (DATA.vocals.indexOf(fields.vocals) >= 0) state.vocals = fields.vocals;
    if (DATA.languages.indexOf(fields.language) >= 0) state.language = fields.language;
    if (fields.language === 'Instrumental') state.vocals = 'Instrumental only (no vocals)';

    var structureValue = fields.structure || '';
    DATA.structures.forEach(function (structure) {
      if (structure.label === structureValue || structureValue.indexOf(structure.label) === 0) state.structure = structure.id;
    });
    var notesAt = String(prompt || '').indexOf('Lyrics / notes:');
    if (notesAt >= 0) state.lyrics = String(prompt).slice(notesAt + 'Lyrics / notes:'.length).trim();
    state.mode = fields.style || fields.production ? 'detailed' : 'concise';
    return withDefaults(state);
  }

  // Clipboard ---------------------------------------------------------------
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
    area.remove();
    return copied;
  }

  function copyText(text, successMessage) {
    if (!String(text || '').trim()) {
      flash('There is nothing to copy yet.');
      return;
    }
    function success() { flash(successMessage); }
    function fallback() {
      if (fallbackCopy(text)) success();
      else flash('Copy failed. Select the text and copy it manually.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(success).catch(fallback);
    } else {
      fallback();
    }
  }

  function copyArchive() {
    var state = stateFromForm();
    var sections = [];
    if (state.title.trim()) sections.push('TITLE\n' + state.title.trim());
    sections.push('STYLE OF MUSIC\n' + buildStyle(state));
    if (!isInstrumental(state) && state.lyrics.trim()) sections.push('LYRICS\n' + state.lyrics.trim());
    if (state.exclude.trim()) sections.push('EXCLUDE\n' + state.exclude.trim());
    copyText(sections.join('\n\n'), 'All Suno fields copied for your notes.');
  }

  function flash(message) {
    var el = $('sp-flash');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function resetAll() {
    var state = stateFromForm();
    var hasWork = state.lyrics.trim() || state.extraStyle.trim() || state.title.trim() ||
      state.selected.genres.length || state.selected.moods.length || state.selected.instruments.length || state.selected.prod.length;
    if (hasWork && typeof confirm === 'function' && !confirm('Reset the entire Suno draft?')) return;
    try { localStorage.removeItem(LS_DRAFT); } catch (e) {}
    applyState(defaultState());
    flash('Suno builder reset.');
  }

  function init() {
    fillSelect(selects.tempo, DATA.tempos);
    fillSelect(selects.key, DATA.keys);
    fillSelect(selects.vocals, DATA.vocals);
    fillSelect(selects.language, DATA.languages);
    fillSelect(selects.structure, DATA.structures);

    applyState(loadDraft() || defaultState(), { skipDraft: true });
    renderRecipes();

    Object.keys(selects).forEach(function (key) {
      if (!selects[key]) return;
      selects[key].addEventListener('change', updatePrompt);
    });
    [titleInput, bpmInput, extraStyleInput, lyricsInput, excludeInput].forEach(function (el) {
      if (el) el.addEventListener('input', function () { updatePrompt(); });
    });
    document.querySelectorAll('input[name="sp-mode"]').forEach(function (radio) {
      radio.addEventListener('change', updatePrompt);
    });

    var insertTemplate = $('sp-insert-template');
    if (insertTemplate) insertTemplate.addEventListener('click', insertStructureTemplate);
    var copyStyle = $('sp-copy-style');
    if (copyStyle) copyStyle.addEventListener('click', function () {
      copyText(buildStyle(stateFromForm()), 'Style of Music copied.');
    });
    var copyLyrics = $('sp-copy-lyrics');
    if (copyLyrics) copyLyrics.addEventListener('click', function () {
      copyText(lyricsInput.value, 'Lyrics copied.');
    });
    var copyExclude = $('sp-copy-exclude');
    if (copyExclude) copyExclude.addEventListener('click', function () {
      copyText(excludeInput.value, 'Exclude list copied.');
    });
    var copyAll = $('sp-copy-all');
    if (copyAll) copyAll.addEventListener('click', copyArchive);
    var reset = $('sp-reset');
    if (reset) reset.addEventListener('click', resetAll);
    var goToProsody = $('sp-goto-prosody');
    if (goToProsody) goToProsody.addEventListener('click', function () {
      if (window.RaagaStudio && window.RaagaStudio.switchTo) window.RaagaStudio.switchTo('prosody');
    });

    var save = $('sp-save-recipe');
    if (save) save.addEventListener('click', openRecipeForm);
    var confirmSave = $('sp-recipe-confirm');
    if (confirmSave) confirmSave.addEventListener('click', saveCurrentRecipe);
    var cancelSave = $('sp-recipe-cancel');
    if (cancelSave) cancelSave.addEventListener('click', closeRecipeForm);
    if (recipeNameInput) {
      recipeNameInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') { event.preventDefault(); saveCurrentRecipe(); }
        if (event.key === 'Escape') { event.preventDefault(); closeRecipeForm(); }
      });
    }
  }

  // Expose a small pure API for tests and future integrations.
  window.SUNO_PROMPTS = {
    DATA: DATA,
    LIMITS: LIMITS,
    buildStyle: buildStyle,
    defaultState: defaultState,
    parseLegacyPrompt: parseLegacyPrompt,
    getStructureTemplate: function (id) { return structureById(id).template; },
    getState: stateFromForm,
    loadState: applyState
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
})();
