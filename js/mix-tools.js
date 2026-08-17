/**
 * mix-tools.js — "Quick Access": a curated mixing-engineer toolbox.
 *
 * A lightweight directory of useful external websites (no audio is uploaded or
 * processed here — only direct links that open in a new tab). Tools are stored
 * in a single MIX_TOOLS data structure and cards are generated dynamically, so
 * adding a new site is just one object. Search, status/category filters,
 * favourites and a recently-used strip all update instantly with no reload.
 */
'use strict';

(function () {
  // ─── Data ────────────────────────────────────────────────────────────────
  // status:  'free' = completely free  ·  'tier' = free tier / limited free
  //          'paid' = not truly free (reserved — nothing currently uses it)
  // categories: 'editing' | 'vocal' | 'daw' | 'ai'  (one or more)
  // keywords  : short terms shown on the card ("useful for") and used in search
  // tags      : small category tags (also searched)
  // note      : optional short qualifier appended to the status label
  var MIX_TOOLS = [
    // ── Completely Free ──
    {
      name: 'SoundTools',
      url: 'https://soundtools.io/',
      purpose: '35+ audio and AI tools in one place.',
      keywords: ['EQ', 'stems', 'noise', 'pitch', 'reverb'],
      tags: ['Audio', 'AI', 'Vocal', 'Stems'],
      categories: ['ai'],
      status: 'free'
    },
    {
      name: 'AudioMass',
      url: 'https://audiomass.co/',
      purpose: 'Browser-based audio editor with recording and effects.',
      keywords: ['edit', 'record', 'EQ', 'compressor', 'reverb'],
      tags: ['Audio Editor', 'Multitrack'],
      categories: ['editing'],
      status: 'free',
      note: 'Open source'
    },
    {
      name: 'AudioAlter',
      url: 'https://audioalter.com/',
      purpose: 'Online audio effects and processing.',
      keywords: ['pitch', 'bass', 'reverb', '8D', 'effects'],
      tags: ['Effects'],
      categories: ['editing'],
      status: 'free'
    },
    {
      name: 'VocalRemover.org',
      url: 'https://vocalremover.org/',
      purpose: 'Vocal and instrumental separation.',
      keywords: ['vocal', 'instrumental', 'stems', 'separate'],
      tags: ['Vocal', 'Stems'],
      categories: ['vocal'],
      status: 'free'
    },
    {
      name: 'Vocali.se',
      url: 'https://vocali.se/',
      purpose: 'Vocal and instrumental separation.',
      keywords: ['vocal', 'instrumental', 'stems', 'separate'],
      tags: ['Vocal', 'Stems'],
      categories: ['vocal'],
      status: 'free'
    },
    {
      name: 'BoredHumans',
      url: 'https://boredhumans.com/',
      purpose: 'Large collection of free AI experiments and tools.',
      keywords: ['AI', 'experiments', 'free tools'],
      tags: ['AI'],
      categories: ['ai'],
      status: 'free'
    },
    {
      name: 'Unmix',
      url: 'https://unmix.pro/',
      purpose: 'AI stem separation and browser audio tools.',
      keywords: ['stems', 'AI', 'separation', 'browser'],
      tags: ['AI', 'Stems'],
      categories: ['vocal'],
      status: 'free',
      note: 'Free browser tools'
    },
    {
      name: 'RemoveVocals.ai',
      url: 'https://removevocals.ai/',
      purpose: 'Vocal removal and audio processing tools.',
      keywords: ['vocal', 'remove', 'processing', 'audio'],
      tags: ['Vocal', 'AI'],
      categories: ['vocal'],
      status: 'free',
      note: 'Free tools'
    },

    // ── Free Tier ──
    {
      name: 'BandLab',
      url: 'https://www.bandlab.com/',
      purpose: 'Full online DAW for recording and music production.',
      keywords: ['DAW', 'recording', 'MIDI', 'instruments', 'mixing'],
      tags: ['DAW', 'Production'],
      categories: ['daw'],
      status: 'tier',
      note: 'Free core · paid features'
    },
    {
      name: 'Audiotool',
      url: 'https://www.audiotool.com/',
      purpose: 'Online DAW and music production studio.',
      keywords: ['DAW', 'production', 'synths', 'beats'],
      tags: ['DAW', 'Production'],
      categories: ['daw'],
      status: 'tier'
    },
    {
      name: 'Fadr',
      url: 'https://fadr.com/',
      purpose: 'AI stems and remixing.',
      keywords: ['stems', 'remix', 'separation'],
      tags: ['AI', 'Stems', 'Remix'],
      categories: ['ai'],
      status: 'tier'
    },
    {
      name: 'Moises',
      url: 'https://moises.ai/',
      purpose: 'AI stems, pitch and tempo tools.',
      keywords: ['stems', 'pitch', 'tempo', 'practice'],
      tags: ['AI', 'Stems', 'Vocal'],
      categories: ['ai'],
      status: 'tier'
    },
    {
      name: 'Soundation',
      url: 'https://soundation.com/',
      purpose: 'Online DAW for beats, loops and mixing.',
      keywords: ['DAW', 'beats', 'loops', 'recording', 'mixing'],
      tags: ['DAW', 'Production'],
      categories: ['daw'],
      status: 'tier'
    },
    {
      name: 'Amped Studio',
      url: 'https://ampedstudio.com/',
      purpose: 'Online DAW with recording, MIDI and effects.',
      keywords: ['DAW', 'recording', 'MIDI', 'effects'],
      tags: ['DAW', 'Production'],
      categories: ['daw'],
      status: 'tier'
    },
    {
      name: 'TwistedWave Online',
      url: 'https://twistedwave.com/online',
      purpose: 'Browser audio editor for waveform edits.',
      keywords: ['waveform', 'edit', 'processing'],
      tags: ['Audio Editor'],
      categories: ['editing'],
      status: 'tier',
      note: 'Limited free'
    },
    {
      name: 'Voice.ai Tools',
      url: 'https://voice.ai/tools',
      purpose: 'Voice and audio AI tools.',
      keywords: ['voice', 'voice changer', 'enhance', 'audio'],
      tags: ['AI', 'Voice'],
      categories: ['ai'],
      status: 'tier',
      note: 'Free / limited by tool'
    }
  ];

  // ─── Metadata ────────────────────────────────────────────────────────────
  var STATUS = {
    free: { dot: '🟢', label: 'Free', group: 'Completely Free', cls: 'mt-status-free' },
    tier: { dot: '🟡', label: 'Free Tier', group: 'Free Tier', cls: 'mt-status-tier' },
    paid: { dot: '🔴', label: 'Not Truly Free', group: 'Not Truly Free', cls: 'mt-status-paid' }
  };
  var GROUP_ORDER = ['free', 'tier', 'paid'];
  var CATEGORY_LABELS = {
    editing: 'Audio Editing',
    vocal: 'Vocal / Stems',
    daw: 'DAW / Production',
    ai: 'AI / Audio Tools'
  };

  // Expose the data for future reuse / tests.
  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.MIX_TOOLS = MIX_TOOLS;

  var LS_FAVS = 'raaga.mixTools.favorites';
  var LS_RECENT = 'raaga.mixTools.recent';
  var RECENT_MAX = 5;

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  function loadJSON(key) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function byName(name) {
    for (var i = 0; i < MIX_TOOLS.length; i++) {
      if (MIX_TOOLS[i].name === name) return MIX_TOOLS[i];
    }
    return null;
  }

  // ─── State (favourites + recently used) ─────────────────────────────────
  var favorites = Array.isArray(loadJSON(LS_FAVS)) ? loadJSON(LS_FAVS) : [];
  var recent = Array.isArray(loadJSON(LS_RECENT)) ? loadJSON(LS_RECENT) : [];

  var filter = 'all';
  var query = '';

  function isFav(name) { return favorites.indexOf(name) >= 0; }
  function toggleFav(name) {
    var i = favorites.indexOf(name);
    if (i >= 0) favorites.splice(i, 1);
    else favorites.push(name);
    saveJSON(LS_FAVS, favorites);
  }
  function recordRecent(name) {
    recent = recent.filter(function (n) { return n !== name; });
    recent.unshift(name);
    if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX);
    saveJSON(LS_RECENT, recent);
  }

  // ─── Filtering / search ─────────────────────────────────────────────────
  function matches(t) {
    if (filter === 'free' && t.status !== 'free') return false;
    if (filter === 'tier' && t.status !== 'tier') return false;
    if (filter === 'paid' && t.status !== 'paid') return false;
    if (CATEGORY_LABELS[filter] && t.categories.indexOf(filter) < 0) return false;
    if (filter === 'favs' && !isFav(t.name)) return false;

    if (query) {
      var catLabels = (t.categories || []).map(function (c) {
        return CATEGORY_LABELS[c] || c;
      }).join(' ');
      var st = STATUS[t.status] || STATUS.tier;
      var hay = [
        t.name, t.purpose,
        (t.keywords || []).join(' '),
        (t.tags || []).join(' '),
        catLabels,
        st.label, st.group
      ].join(' ').toLowerCase();
      if (hay.indexOf(query) < 0) return false;
    }
    return true;
  }

  // ─── Rendering ───────────────────────────────────────────────────────────
  function card(t) {
    var st = STATUS[t.status] || STATUS.tier;
    var uses = (t.keywords || []).map(function (k, i) {
      return (i ? '<span class="sep">·</span> ' : '') + escapeHtml(k);
    }).join(' ');
    var tags = (t.tags && t.tags.length)
      ? '<div class="mt-tags">' + t.tags.map(function (g) {
          return '<span class="mt-tag">' + escapeHtml(g) + '</span>';
        }).join('') + '</div>'
      : '';
    var note = t.note ? ' <span class="mt-note">· ' + escapeHtml(t.note) + '</span>' : '';

    return '<article class="mt-card">' +
      '<a class="mt-open" href="' + escapeAttr(t.url) + '" data-name="' + escapeAttr(t.name) +
        '" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="Open ' + escapeAttr(t.name) + ' in a new tab"></a>' +

      '<div class="mt-card-top">' +
        '<span class="mt-dot" aria-hidden="true">' + st.dot + '</span>' +
        '<h3 class="mt-card-name">' + escapeHtml(t.name) + '</h3>' +
        '<button type="button" class="mt-fav' + (isFav(t.name) ? ' on' : '') + '" ' +
          'data-fav="' + escapeAttr(t.name) + '" ' +
          'aria-label="Favorite ' + escapeAttr(t.name) + '" ' +
          'aria-pressed="' + (isFav(t.name) ? 'true' : 'false') + '">' +
          (isFav(t.name) ? '★' : '☆') +
        '</button>' +
      '</div>' +

      '<p class="mt-purpose">' + escapeHtml(t.purpose) + '</p>' +
      '<div class="mt-uses">' + uses + '</div>' +
      tags +

      '<div class="mt-status">' +
        '<span class="mt-status-label ' + st.cls + '">' + st.dot + ' ' + escapeHtml(st.label) + note + '</span>' +
        '<span class="mt-open-btn" aria-hidden="true">Open Tool ↗</span>' +
      '</div>' +
    '</article>';
  }

  function emptyState() {
    var terms = ['vocal', 'stem', 'DAW', 'AI', 'editing'];
    return '<div class="panel mt-empty">' +
      '<h3>No tools found</h3>' +
      '<p>Try one of these, or clear the search and filters.</p>' +
      '<div class="try">' + terms.map(function (t) {
        return '<button type="button" data-try="' + t + '">' + t + '</button>';
      }).join('') + '</div>' +
    '</div>';
  }

  function render() {
    var groupsEl = $('mt-groups');
    var countEl = $('mt-count');
    var favsFilter = $('mt-favs-filter');
    if (!groupsEl) return;

    if (favsFilter) favsFilter.hidden = favorites.length === 0;

    var list = MIX_TOOLS.filter(matches);
    var html = '';

    GROUP_ORDER.forEach(function (g) {
      var items = list.filter(function (t) { return t.status === g; });
      if (!items.length) return;
      html += '<section class="mt-group">' +
        '<h3 class="mt-group-head">' +
          '<span class="dot" aria-hidden="true">' + STATUS[g].dot + '</span>' +
          escapeHtml(STATUS[g].group) +
          '<span class="cnt">' + items.length + '</span>' +
          '<span class="bar" aria-hidden="true"></span>' +
        '</h3>' +
        '<div class="mt-grid">' + items.map(card).join('') + '</div>' +
      '</section>';
    });

    if (!list.length) html = emptyState();

    groupsEl.innerHTML = html;
    if (countEl) {
      countEl.textContent = list.length
        ? list.length + ' tool' + (list.length === 1 ? '' : 's')
        : '';
    }

    groupsEl.querySelectorAll('.mt-fav').forEach(function (b) {
      b.addEventListener('click', function () {
        toggleFav(b.getAttribute('data-fav'));
        render();
      });
    });

    renderRecent();
  }

  function renderRecent() {
    var el = $('mt-recent');
    if (!el) return;
    var names = recent.filter(function (n) { return byName(n); });
    if (!names.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML =
      '<p class="mt-recent-label">Recently Used</p>' +
      '<div class="mt-recent-row">' + names.map(function (n) {
        var t = byName(n);
        return '<a class="mt-recent-chip" href="' + escapeAttr(t.url) + '" ' +
          'data-name="' + escapeAttr(t.name) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(t.name) + ' ↗</a>';
      }).join('') + '</div>';
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  function init() {
    var search = $('mt-search');
    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim().toLowerCase();
        render();
      });
    }

    var filters = $('mt-filters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-filter]');
        if (!btn) return;
        filter = btn.getAttribute('data-filter');
        filters.querySelectorAll('[data-filter]').forEach(function (b) {
          b.classList.toggle('on', b === btn);
        });
        render();
      });
    }

    var groups = $('mt-groups');
    if (groups) {
      groups.addEventListener('click', function (e) {
        var tryBtn = e.target.closest && e.target.closest('[data-try]');
        if (tryBtn && search) {
          search.value = tryBtn.getAttribute('data-try');
          query = search.value.trim().toLowerCase();
          render();
          return;
        }
        var link = e.target.closest && e.target.closest('a[data-name]');
        if (link) recordRecent(link.getAttribute('data-name'));
      });
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
