/**
 * raga-reference.js — Raga & Scale Reference for Raaga Studio.
 *
 * A searchable library of Carnatic (and a few Hindustani) ragas mapped to the
 * Suno → Cubase workflow. Each raga shows its ārohana/avarohana, swaras with
 * Western-note equivalents, mood, best time, composition tips, and a
 * ready-to-paste Suno snippet. It also exposes window.RaagaStudio.RAGAS so the
 * Suno Prompt Builder can share the same single source of truth.
 */
'use strict';

(function () {
  // Sa = C mapping (kattai/śruti 1). Practical reference — transpose as needed.
  var SWARA_WEST = {
    'S': 'C', 'R1': 'C♯', 'R2': 'D', 'G2': 'D♯', 'G3': 'E',
    'M1': 'F', 'M2': 'F♯', 'P': 'G', 'D1': 'G♯', 'D2': 'A',
    'N2': 'A♯', 'N3': 'B'
  };

  // ─── Raga data ───────────────────────────────────────────────────────────
  // swaras: array of [swaraName, westernNote]. arohana/avarohana use Ṡ (U+1E60)
  // for the upper Sa. pentatonic = 5-note ascent (audava).
  var RAGAS = [
    {
      id: 'hamsadhwani', name: 'Hamsadhwani', kn: 'ಹಂಸಧ್ವನಿ',
      type: 'Janya', parent: 'Shankarabharanam (29)',
      arohana: 'S R2 G3 P N3 Ṡ', avarohana: 'Ṡ N3 P G3 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G3','E'], ['P','G'], ['N3','B']],
      pentatonic: true, time: 'Evening', mood: 'Bright · auspicious · opening',
      rasa: 'Bhakti · Vīra',
      tips: [
        'No Ma or Dha — the open pentatonic sound makes openings and hooks feel instantly “welcome”.',
        'Great default for devotional or celebratory Kannada tracks.',
        'Pair a tanpura drone with it; the missing notes leave lots of space.'
      ],
      suno: 'Hamsadhwani raga — pentatonic (no Ma, no Dha), bright and auspicious, evening raga'
    },
    {
      id: 'mohanam', name: 'Mohanam', kn: 'ಮೋಹನಂ',
      type: 'Janya', parent: 'Harikambhoji (28)',
      arohana: 'S R2 G3 P D2 Ṡ', avarohana: 'Ṡ D2 P G3 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G3','E'], ['P','G'], ['D2','A']],
      pentatonic: true, time: 'Any / night', mood: 'Joyful · folk · danceable',
      rasa: 'Śringāra · Hāsya',
      tips: [
        'Carnatic’s “major pentatonic” — maps to C D E G A. The most suna/fusion-friendly raga.',
        'Folk, celebratory and upbeat pieces sit naturally here.',
        'No Ma or Ni keeps harmony simple — a safe first raga for crossover tracks.'
      ],
      suno: 'Mohanam raga — major pentatonic (C D E G A), joyful folk feel, no Ma or Ni'
    },
    {
      id: 'shuddha-saveri', name: 'Shuddha Saveri', kn: 'ಶುದ್ಧ ಸಾವೇರಿ',
      type: 'Janya', parent: 'Shankarabharanam (29)',
      arohana: 'S R2 M1 P D2 Ṡ', avarohana: 'Ṡ D2 P M1 R2 S',
      swaras: [['S','C'], ['R2','D'], ['M1','F'], ['P','G'], ['D2','A']],
      pentatonic: true, time: 'Morning', mood: 'Serene · prayerful',
      rasa: 'Bhakti · Shānta',
      tips: [
        'A morning raga with a gentle, devotional character.',
        'No Ga or Ni — the Ma gives it a soft, suspended colour.',
        'Works beautifully for slow aalapana-style intros.'
      ],
      suno: 'Shuddha Saveri raga — morning, serene and prayerful, pentatonic with Ma'
    },
    {
      id: 'bilahari', name: 'Bilahari', kn: 'ಬಿಲಹರಿ',
      type: 'Janya', parent: 'Shankarabharanam (29)',
      arohana: 'S R2 G3 P D2 Ṡ', avarohana: 'Ṡ N3 D2 P M1 G3 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G3','E'], ['M1','F'], ['P','G'], ['D2','A'], ['N3','B']],
      pentatonic: true, time: 'Morning', mood: 'Joyful · bright · festive',
      rasa: 'Śringāra · Bhakti',
      tips: [
        'Ascends like Mohanam but descends through Ma and Ni — adds colour without losing brightness.',
        'Classic for festive, auspicious openings.',
        'The descending Ma→Ga glide is its signature ornament.'
      ],
      suno: 'Bilahari raga — bright festive morning raga, pentatonic ascent with Ma and Ni in descent'
    },
    {
      id: 'hindolam', name: 'Hindolam', kn: 'ಹಿಂದೋಳಂ',
      type: 'Janya', parent: 'Natabhairavi (20)',
      arohana: 'S G2 M1 D1 N2 Ṡ', avarohana: 'Ṡ N2 D1 M1 G2 S',
      swaras: [['S','C'], ['G2','D♯'], ['M1','F'], ['D1','G♯'], ['N2','A♯']],
      pentatonic: true, time: 'Late night', mood: 'Melancholic · meditative',
      rasa: 'Karuna · Shānta',
      tips: [
        'Carnatic’s “minor pentatonic” (no Re, no Pa) — instant moody, introspective colour.',
        'Great for cinematic tension, rain scenes, or a longing chorus.',
        'The missing Pa makes the tonic feel very grounded.'
      ],
      suno: 'Hindolam raga — minor pentatonic (no Re, no Pa), melancholic late-night mood'
    },
    {
      id: 'abheri', name: 'Abheri', kn: 'ಆಭೇರಿ',
      type: 'Janya', parent: 'Kharaharapriya (22)',
      arohana: 'S G2 M1 P N2 Ṡ', avarohana: 'Ṡ N2 D2 P M1 G2 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G2','D♯'], ['M1','F'], ['P','G'], ['D2','A'], ['N2','A♯']],
      pentatonic: false, time: 'Any', mood: 'Romantic · gentle · warm',
      rasa: 'Śringāra · Karuna',
      tips: [
        'Carnatic’s “minor pentatonic with extra steps” — romantic but never harsh.',
        'A go-to for love songs and soft film numbers.',
        'The Re and Dha only appear in descent, giving phrases a sighing quality.'
      ],
      suno: 'Abheri raga — romantic and gentle, minor-flavoured with a sighing descent'
    },
    {
      id: 'kalyani', name: 'Kalyani', kn: 'ಕಲ್ಯಾಣಿ',
      type: 'Melakarta', parent: 'Melakarta 65',
      arohana: 'S R2 G3 M2 P D2 N3 Ṡ', avarohana: 'Ṡ N3 D2 P M2 G3 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G3','E'], ['M2','F♯'], ['P','G'], ['D2','A'], ['N3','B']],
      pentatonic: false, time: 'Evening', mood: 'Majestic · romantic · expansive',
      rasa: 'Śringāra · Bhakti · Vīra',
      tips: [
        'The raised 4th (M2) is a Lydian colour — sweeping, bright, filmic.',
        'One of the most recorded ragas for romantic and grand themes.',
        'The G3–M2 interval is its emotional “money note”.'
      ],
      suno: 'Kalyani raga — Lydian major colour, majestic and romantic, evening'
    },
    {
      id: 'shankarabharanam', name: 'Shankarabharanam', kn: 'ಶಂಕರಾಭರಣ',
      type: 'Melakarta', parent: 'Melakarta 29',
      arohana: 'S R2 G3 M1 P D2 N3 Ṡ', avarohana: 'Ṡ N3 D2 P M1 G3 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G3','E'], ['M1','F'], ['P','G'], ['D2','A'], ['N3','B']],
      pentatonic: false, time: 'Evening', mood: 'Grand · devotional · balanced',
      rasa: 'Bhakti · Śringāra',
      tips: [
        'The plain major scale — but with Carnatic phrasing it sounds regal, not plain.',
        'The most universally “safe” raga for devotional and classical fusion.',
        'Pair with Western harmony freely; every chord is available.'
      ],
      suno: 'Shankarabharanam raga — Carnatic major scale, grand and devotional'
    },
    {
      id: 'kharaharapriya', name: 'Kharaharapriya', kn: 'ಖರಹರಪ್ರಿಯ',
      type: 'Melakarta', parent: 'Melakarta 22',
      arohana: 'S R2 G2 M1 P D2 N2 Ṡ', avarohana: 'Ṡ N2 D2 P M1 G2 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G2','D♯'], ['M1','F'], ['P','G'], ['D2','A'], ['N2','A♯']],
      pentatonic: false, time: 'Evening', mood: 'Devotional · emotional · earthy',
      rasa: 'Bhakti · Karuna',
      tips: [
        'Dorian colour — warm and deeply emotive without being gloomy.',
        'An emotional workhorse for lyrical, storytelling songs.',
        'The G2 minor third is the soul of its pathos.'
      ],
      suno: 'Kharaharapriya raga — Dorian colour, deeply emotional and devotional'
    },
    {
      id: 'natabhairavi', name: 'Natabhairavi', kn: 'ನಟಭೈರವಿ',
      type: 'Melakarta', parent: 'Melakarta 20',
      arohana: 'S R2 G2 M1 P D1 N2 Ṡ', avarohana: 'Ṡ N2 D1 P M1 G2 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G2','D♯'], ['M1','F'], ['P','G'], ['D1','G♯'], ['N2','A♯']],
      pentatonic: false, time: 'Morning', mood: 'Sombre · serious · contemplative',
      rasa: 'Karuna · Bhakti',
      tips: [
        'Natural minor — ideal for sombre, serious or tragic moods.',
        'Works with Western minor harmony out of the box.',
        'Keep the tempo slow and let the minor 3rd carry the emotion.'
      ],
      suno: 'Natabhairavi raga — natural minor, sombre and contemplative'
    },
    {
      id: 'keeravani', name: 'Keeravani', kn: 'ಕೀರವಾಣಿ',
      type: 'Melakarta', parent: 'Melakarta 21',
      arohana: 'S R2 G2 M1 P D1 N3 Ṡ', avarohana: 'Ṡ N3 D1 P M1 G2 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G2','D♯'], ['M1','F'], ['P','G'], ['D1','G♯'], ['N3','B']],
      pentatonic: false, time: 'Evening / night', mood: 'Pathos · haunting · intense',
      rasa: 'Karuna · Raudra',
      tips: [
        'Harmonic minor — the raised 7th (N3) creates a dramatic, “pulling” tension.',
        'Perfect for intense, haunting or climactic moments.',
        'The D1→N3 leap is the raga’s signature dramatic interval.'
      ],
      suno: 'Keeravani raga — harmonic minor, haunting and intense with a dramatic leading tone'
    },
    {
      id: 'mayamalavagowla', name: 'Mayamalavagowla', kn: 'ಮಾಯಾಮಾಳವಗೌಳ',
      type: 'Melakarta', parent: 'Melakarta 15',
      arohana: 'S R1 G3 M1 P D1 N3 Ṡ', avarohana: 'Ṡ N3 D1 P M1 G3 R1 S',
      swaras: [['S','C'], ['R1','C♯'], ['G3','E'], ['M1','F'], ['P','G'], ['D1','G♯'], ['N3','B']],
      pentatonic: false, time: 'Dawn / morning', mood: 'Serene · devotional · timeless',
      rasa: 'Bhakti · Shānta',
      tips: [
        'The first raga every Carnatic student learns — foundational and deeply devotional.',
        'The C♯–E–F–G♯–B cluster gives it a haunting, quasi-double-harmonic sound.',
        'Beautiful for slow, chant-like verses.'
      ],
      suno: 'Mayamalavagowla raga — foundational devotional raga, serene dawn mood'
    },
    {
      id: 'madhuvanti', name: 'Madhuvanti', kn: 'ಮಧುವಂತಿ',
      type: 'Hindustani', parent: '—',
      arohana: 'S G2 M2 P N2 Ṡ', avarohana: 'Ṡ N2 D2 P M2 G2 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G2','D♯'], ['M2','F♯'], ['P','G'], ['D2','A'], ['N2','A♯']],
      pentatonic: false, time: 'Late afternoon', mood: 'Romantic · nostalgic · bittersweet',
      rasa: 'Śringāra',
      tips: [
        'A Hindustani gem with a bittersweet, twilight romance.',
        'The raised Ma + minor Ga blend gives it a longing, filmi-love quality.',
        'Ideal for reflective, lyric-driven Kannada ballads.'
      ],
      suno: 'Madhuvanti raga — Hindustani, bittersweet romantic twilight mood'
    },
    {
      id: 'yaman', name: 'Yaman', kn: 'ಯಮನ್',
      type: 'Hindustani', parent: '— (≈ Kalyani)',
      arohana: 'S R2 G3 M2 P D2 N3 Ṡ', avarohana: 'Ṡ N3 D2 P M2 G3 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G3','E'], ['M2','F♯'], ['P','G'], ['D2','A'], ['N3','B']],
      pentatonic: false, time: 'Evening', mood: 'Serene · romantic · expansive',
      rasa: 'Śringāra · Shānta',
      tips: [
        'Hindustani’s most beloved evening raga — essentially Kalyani.',
        'Serene and romantic; the teevra Ma is its luminous signature.',
        'A safe, beautiful choice for crossover and filmi melodies.'
      ],
      suno: 'Yaman raga — Hindustani evening raga, serene and romantic (Lydian colour)'
    },
    {
      id: 'sindhu-bhairavi', name: 'Sindhu Bhairavi', kn: 'ಸಿಂಧು ಭೈರವಿ',
      type: 'Janya', parent: 'Natabhairavi (20)',
      arohana: 'S R2 G2 M1 G2 P D1 N2 Ṡ', avarohana: 'Ṡ N2 D1 P M1 G2 R1 S',
      swaras: [['S','C'], ['R1','C♯'], ['R2','D'], ['G2','D♯'], ['M1','F'], ['P','G'], ['D1','G♯'], ['N2','A♯']],
      pentatonic: false, time: 'Morning', mood: 'Devotional · folk · flexible',
      rasa: 'Bhakti · Śringāra',
      tips: [
        'A fluid raga that happily borrows notes — forgiving and folk-like.',
        'A favourite for morning bhajans and light devotional numbers.',
        'Because it is flexible, you can slide between Re and R1 freely.'
      ],
      suno: 'Sindhu Bhairavi raga — flexible morning raga, devotional folk feel'
    },
    {
      id: 'anandabhairavi', name: 'Anandabhairavi', kn: 'ಆನಂದಭೈರವಿ',
      type: 'Janya', parent: 'Natabhairavi (20)',
      arohana: 'S G2 R2 G2 M1 P D2 P N2 Ṡ', avarohana: 'Ṡ N2 D2 P M1 G2 R2 S',
      swaras: [['S','C'], ['R2','D'], ['G2','D♯'], ['M1','F'], ['P','G'], ['D2','A'], ['N2','A♯']],
      pentatonic: false, time: 'Morning', mood: 'Gentle · devotional · tender',
      rasa: 'Bhakti · Shānta',
      tips: [
        'A gentle, prayer-like raga whose winding ascent feels soothing.',
        'The repeated Ga phrase gives it a distinctive, tender lilt.',
        'Suits lullabies, bhajans and soft storytelling.'
      ],
      suno: 'Anandabhairavi raga — gentle morning raga, tender devotional lilt'
    }
  ];

  // Expose the shared source of truth for the Suno Prompt Builder and tests.
  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.RAGAS = RAGAS;
  window.RaagaStudio.SWARA_WEST = SWARA_WEST;

  // ─── UI helpers ──────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  var filter = 'all';
  var query = '';

  function swaraChip(s, w) {
    return '<span class="rg-swara"><b>' + escapeHtml(s) + '</b><i>' + escapeHtml(w) + '</i></span>';
  }

  function scaleRow(label, seq) {
    var parts = String(seq).split(/\s+/);
    return '<div class="rg-scale-row">' +
      '<span class="rg-scale-label">' + escapeHtml(label) + '</span>' +
      '<div class="rg-scale-chips">' +
        parts.map(function (p) { return '<span class="rg-note">' + escapeHtml(p) + '</span>'; }).join('') +
      '</div>' +
    '</div>';
  }

  function matches(r) {
    if (filter === 'pentatonic' && !r.pentatonic) return false;
    if (filter === 'melakarta' && r.type !== 'Melakarta') return false;
    if (filter === 'janya' && r.type !== 'Janya') return false;
    if (filter === 'hindustani' && r.type !== 'Hindustani') return false;
    if (!query) return true;
    var q = query.toLowerCase();
    var hay = [
      r.name, r.kn, r.type, r.parent, r.arohana, r.avarohana,
      r.time, r.mood, r.rasa,
      r.swaras.map(function (s) { return s[0] + ' ' + s[1]; }).join(' '),
      r.tips.join(' ')
    ].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  }

  function typeBadge(r) {
    var cls = r.type.toLowerCase();
    var label = r.type === 'Melakarta' ? 'Melakarta' :
                r.type === 'Janya' ? 'Janya raga' : 'Hindustani';
    return '<span class="rg-badge rg-badge-' + cls + '">' + escapeHtml(label) + '</span>';
  }

  function card(r) {
    var meta = [];
    if (r.time) meta.push('<span class="rg-meta"><b>🕐 Time</b> ' + escapeHtml(r.time) + '</span>');
    if (r.mood) meta.push('<span class="rg-meta"><b>♡ Mood</b> ' + escapeHtml(r.mood) + '</span>');
    if (r.rasa) meta.push('<span class="rg-meta"><b>◈ Rasa</b> ' + escapeHtml(r.rasa) + '</span>');

    var tips = r.tips.map(function (t) {
      return '<li>' + escapeHtml(t) + '</li>';
    }).join('');

    return '<article class="rg-card" data-id="' + escapeAttr(r.id) + '">' +
      '<header class="rg-card-head">' +
        '<div class="rg-title">' +
          '<h3>' + escapeHtml(r.name) + ' <span class="rg-kn">' + escapeHtml(r.kn) + '</span></h3>' +
          '<p class="rg-parent">' + escapeHtml(r.parent) + '</p>' +
        '</div>' +
        typeBadge(r) +
      '</header>' +

      '<div class="rg-scale">' +
        scaleRow('ārohana ↑', r.arohana) +
        scaleRow('avarohana ↓', r.avarohana) +
      '</div>' +

      '<div class="rg-swaras">' +
        r.swaras.map(function (s) { return swaraChip(s[0], s[1]); }).join('') +
      '</div>' +

      '<div class="rg-meta-row">' + meta.join('') + '</div>' +

      '<ul class="rg-tips">' + tips + '</ul>' +

      '<div class="rg-suno">' +
        '<span class="rg-suno-label">Suno snippet</span>' +
        '<code class="rg-suno-text">' + escapeHtml(r.suno) + '</code>' +
        '<div class="rg-actions">' +
          '<button type="button" class="btn rg-copy" data-id="' + escapeAttr(r.id) + '">Copy snippet</button>' +
          '<button type="button" class="btn primary rg-use" data-id="' + escapeAttr(r.id) + '">Use in Suno prompt →</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function render() {
    var grid = $('rg-grid');
    var count = $('rg-count');
    if (!grid) return;
    var list = RAGAS.filter(matches);
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : '<p class="hint rg-empty">No ragas match “' + escapeHtml(query) + '”. Try a note (e.g. “M2”), a mood, or clear the search.</p>';
    if (count) count.textContent = list.length + ' raga' + (list.length === 1 ? '' : 's');
    grid.querySelectorAll('.rg-copy').forEach(function (b) {
      b.addEventListener('click', function () { copySnippet(b.getAttribute('data-id')); });
    });
    grid.querySelectorAll('.rg-use').forEach(function (b) {
      b.addEventListener('click', function () { useInSuno(b.getAttribute('data-id')); });
    });
  }

  function byId(id) {
    for (var i = 0; i < RAGAS.length; i++) if (RAGAS[i].id === id) return RAGAS[i];
    return null;
  }

  function copySnippet(id) {
    var r = byId(id);
    if (!r) return;
    var text = '[Key: ' + r.name + ' (raga)] — ' + r.suno;
    copyText(text, 'Snippet copied — paste into suno.com.');
  }

  function copyText(text, msg) {
    function done() { flash(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  function useInSuno(id) {
    var r = byId(id);
    if (!r) return;
    if (window.RaagaStudio.switchTo) window.RaagaStudio.switchTo('suno');
    var sel = $('sp-key');
    if (!sel) return;
    var want = r.name + ' (raga)';
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === want) { found = true; break; }
    }
    if (!found) {
      var opt = document.createElement('option');
      opt.value = want; opt.textContent = want;
      sel.appendChild(opt);
    }
    sel.value = want;
    sel.dispatchEvent(new Event('change'));
    flash(r.name + ' loaded into the Suno prompt key.');
  }

  function flash(msg) {
    var el = $('rg-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rg-flash'; el.className = 'rg-flash';
      var wrap = $('rg-controls');
      if (wrap) wrap.appendChild(el);
    }
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ─── Swara → Western reference table ────────────────────────────────────
  function renderSwaraTable() {
    var tbody = $('rg-swara-body');
    if (!tbody) return;
    var order = ['S', 'R1', 'R2', 'G2', 'G3', 'M1', 'M2', 'P', 'D1', 'D2', 'N2', 'N3'];
    tbody.innerHTML = order.map(function (s) {
      return '<tr><th scope="row">' + escapeHtml(s) + '</th><td>' + escapeHtml(SWARA_WEST[s]) + '</td></tr>';
    }).join('');
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  function init() {
    renderSwaraTable();

    var search = $('rg-search');
    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim();
        render();
      });
    }

    var filters = $('rg-filters');
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

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
