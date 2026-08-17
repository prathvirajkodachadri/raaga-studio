/**
 * lyrics-lab.js — Lyrics Lab UI controller.
 * Keeps DOM rendering and editing separate from lyrics-engine.js.
 */
'use strict';

(function () {
  var E = window.LYRICS_ENGINE;
  if (!E) return;

  function $(id) { return document.getElementById(id); }
  var el = {
    language: $('ll-language'), idea: $('ll-idea'), ideaCount: $('ll-idea-count'),
    mood: $('ll-mood'), customMoodWrap: $('ll-custom-mood-wrap'), customMood: $('ll-custom-mood'),
    section: $('ll-section'), customSectionWrap: $('ll-custom-section-wrap'), customSection: $('ll-custom-section'),
    scheme: $('ll-scheme'), schemePreview: $('ll-scheme-preview'), style: $('ll-style'),
    syllables: $('ll-syllables'), vocabulary: $('ll-vocabulary'), avoid: $('ll-avoid'), filmMode: $('ll-film-mode'),
    generate: $('ll-generate'), formError: $('ll-form-error'), results: $('ll-results'),
    resultSummary: $('ll-result-summary'), overall: $('ll-overall'), editor: $('ll-editor'),
    analyze: $('ll-analyze'), copy: $('ll-copy'), copyLabels: $('ll-copy-labels'),
    copyAnalysis: $('ll-copy-analysis'), download: $('ll-download'), saveState: $('ll-save-state'),
    quality: $('ll-quality'), qualityNote: $('ll-quality-note'), lines: $('ll-line-analysis'),
    assistant: $('ll-assistant'), closeAssistant: $('ll-close-assistant'), currentLine: $('ll-current-line'),
    currentMeta: $('ll-current-meta'), alternatives: $('ll-alternatives'), candidates: $('ll-candidates'),
    refineActions: $('ll-refine-actions'), flash: $('ll-flash')
  };

  var state = {
    language: 'kannada',
    analysis: null,
    selectedLine: -1,
    selectedWord: '',
    alternatives: [],
    generated: null,
    dirty: false
  };
  var LS_KEY = 'raaga.lyricsLabDraft';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function valueOr(node, fallback) {
    return node && node.value ? node.value : fallback;
  }

  function getOptions() {
    var mood = valueOr(el.mood, 'Romantic');
    if (mood === 'Custom' && el.customMood && el.customMood.value.trim()) mood = el.customMood.value.trim();
    return {
      language: state.language,
      idea: el.idea ? el.idea.value.trim() : '',
      mood: mood,
      section: valueOr(el.section, 'Chorus/Hook'),
      customSection: el.customSection ? el.customSection.value.trim() : '',
      scheme: valueOr(el.scheme, 'auto'),
      style: valueOr(el.style, 'hybrid'),
      syllables: valueOr(el.syllables, 'auto'),
      vocabulary: valueOr(el.vocabulary, 'spoken'),
      avoid: el.avoid ? el.avoid.value.trim() : '',
      filmMode: !!(el.filmMode && el.filmMode.checked)
    };
  }

  function renderSchemePreview() {
    if (!el.schemePreview) return;
    var opts = getOptions();
    var requested = opts.scheme;
    var resolved = requested === 'auto' ? E.resolveScheme(opts.section, opts.mood) : requested;
    var scheme = E.SCHEMES[requested] || E.SCHEMES[resolved] || E.SCHEMES.AABB;
    var pattern = resolved;
    var chips = pattern.split('').map(function (letter) {
      return '<span class="family-' + letter.toLowerCase() + '">' + escapeHtml(letter) + '</span>';
    }).join('');
    var description = requested === 'auto'
      ? 'For this ' + opts.section.toLowerCase() + ', Lyrics Lab starts with ' + resolved + '. You can change it without losing your idea.'
      : scheme.description;
    el.schemePreview.innerHTML = '<div class="ll-pattern" aria-label="' + pattern + ' pattern">' + chips + '</div>' +
      '<div class="ll-scheme-copy"><strong>' + resolved + (requested === 'auto' ? '<span class="ll-auto-chip">AUTO PICK</span>' : '') +
      '</strong><p>' + escapeHtml(description) + '</p></div>';
  }

  function setLanguage(language) {
    state.language = ['kannada', 'english', 'bilingual'].indexOf(language) >= 0 ? language : 'kannada';
    if (el.language && el.language.querySelectorAll) {
      Array.prototype.forEach.call(el.language.querySelectorAll('[data-language]'), function (button) {
        var on = button.getAttribute('data-language') === state.language;
        button.classList.toggle('on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    if (el.idea) {
      var placeholders = {
        kannada: 'ಉದಾ: ಮಳೆಯಲ್ಲೊಂದು ಪ್ರೇಮಕಥೆ — ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ಮತ್ತೆ ಭೇಟಿಯಾದ ಇಬ್ಬರು',
        english: 'e.g. Two people meet again at a bus stop during the first rain',
        bilingual: 'ಉದಾ: ಮೊದಲ ಮಳೆ, one unfinished love story, and a chance meeting'
      };
      el.idea.placeholder = placeholders[state.language];
    }
  }

  function showConditionalFields() {
    if (el.customMoodWrap) el.customMoodWrap.hidden = valueOr(el.mood, 'Romantic') !== 'Custom';
    if (el.customSectionWrap) el.customSectionWrap.hidden = valueOr(el.section, 'Chorus/Hook') !== 'Custom';
    renderSchemePreview();
  }

  function showError(message) {
    if (!el.formError) return;
    el.formError.textContent = message || '';
    el.formError.hidden = !message;
  }

  function applyAvoidWords(text, avoid) {
    var words = String(avoid || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var out = text;
    words.forEach(function (word) {
      var safe = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp('\\b' + safe + '\\b', 'gi'), '').replace(/ {2,}/g, ' ');
    });
    return out;
  }

  function generate() {
    var opts = getOptions();
    if (!opts.idea) {
      showError('Start with one song idea, emotion or story. The other controls are optional.');
      if (el.idea) el.idea.focus();
      return null;
    }
    showError('');
    var generated = E.generateLyrics(opts);
    generated.text = applyAvoidWords(generated.text, opts.avoid);
    state.generated = generated;
    if (el.editor) el.editor.value = generated.text;
    state.selectedLine = -1;
    state.selectedWord = '';
    analyze(true);
    if (el.results) {
      el.results.hidden = false;
      if (el.results.scrollIntoView) el.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    flash('Draft generated. Select a line or word to refine it.');
    return generated;
  }

  function analyze(fromGenerate) {
    if (!el.editor || !el.editor.value.trim()) {
      flash('Write or generate a few lyric lines first.');
      return null;
    }
    var opts = getOptions();
    state.analysis = E.analyzeLyrics(el.editor.value, opts);
    state.dirty = false;
    renderAnalysis();
    persist();
    if (el.results) el.results.hidden = false;
    if (el.saveState) {
      el.saveState.textContent = fromGenerate ? 'Draft ready' : 'Analysis updated';
      el.saveState.style.color = 'var(--ok)';
    }
    if (!fromGenerate) flash('Edits analyzed—scores now reflect the current text.');
    return state.analysis;
  }

  function overallScore(quality) {
    var values = [quality.rhymeConsistency, quality.syllableConsistency, quality.rhythmConsistency,
      quality.naturalLanguage, quality.semanticCoherence];
    var avg = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    return Math.round(Math.max(0, avg - quality.forcedRhymeCount * 4));
  }

  function renderAnalysis() {
    if (!state.analysis) return;
    var q = state.analysis.quality;
    var score = overallScore(q);
    var label = E.labelForScore(score);
    if (el.overall) {
      el.overall.textContent = label;
      el.overall.className = 'll-overall' + (score < 58 ? ' fail' : score < 72 ? ' warn' : '');
    }
    if (el.resultSummary) {
      var schemes = state.analysis.lines.map(function (x) { return x.scheme; })
        .filter(function (x, i, a) { return a.indexOf(x) === i; });
      el.resultSummary.textContent = state.analysis.lines.length + ' lines · ' + schemes.join(' / ') +
        ' · ' + readableStyle(state.analysis.style) + ' rhyme analysis';
    }
    renderQuality(q);
    renderLines();
    if (state.selectedLine >= state.analysis.lines.length) state.selectedLine = -1;
    if (state.selectedLine >= 0) renderAssistant();
  }

  function qualityClass(score) { return score >= 72 ? 'good' : score >= 55 ? 'warn' : 'fail'; }
  function qualityLabel(score) { return score >= 86 ? 'Excellent' : score >= 72 ? 'Good' : 'Needs refinement'; }

  function qualityRow(name, score) {
    return '<div class="ll-quality-item ' + qualityClass(score) + '"><span>' + escapeHtml(name) + '</span>' +
      '<strong>' + qualityLabel(score) + '</strong><div class="ll-quality-track"><i style="width:' +
      Math.round(score) + '%"></i></div></div>';
  }

  function renderQuality(q) {
    if (!el.quality) return;
    var html = qualityRow('Rhyme consistency', q.rhymeConsistency) +
      qualityRow('Syllable consistency', q.syllableConsistency) +
      qualityRow('Rhythm consistency', q.rhythmConsistency) +
      qualityRow('Natural-language flow', q.naturalLanguage) +
      qualityRow('Semantic coherence', q.semanticCoherence);
    if (q.hookStrength != null) html += qualityRow('Hook strength', q.hookStrength);
    html += '<div class="ll-quality-divider"></div>' +
      '<div class="ll-warning-row' + (q.repetitionCount ? ' has' : '') + '"><span>Repetition warning</span><strong>' +
      (q.repetitionCount ? q.repetitionCount + ' repeated word' + (q.repetitionCount === 1 ? '' : 's') : 'Clear') + '</strong></div>' +
      '<div class="ll-warning-row' + (q.forcedRhymeCount ? ' has' : '') + '"><span>Forced-rhyme warning</span><strong>' +
      (q.forcedRhymeCount ? q.forcedRhymeCount + ' line' + (q.forcedRhymeCount === 1 ? '' : 's') + ' to review' : 'Clear') + '</strong></div>' +
      '<div class="ll-warning-row' + (q.schemeBreaks ? ' has' : '') + '"><span>Scheme check</span><strong>' +
      (q.schemeBreaks ? q.schemeBreaks + ' intentional / weak break' + (q.schemeBreaks === 1 ? '' : 's') : 'Consistent') + '</strong></div>';
    el.quality.innerHTML = html;
    if (el.qualityNote) {
      el.qualityNote.textContent = q.forcedRhymeCount
        ? 'A natural line can be better than an exact rhyme. Review the flagged line before replacing it.'
        : 'Scores come from the current words, phonetic endings and line lengths—not from a fixed result.';
    }
  }

  function readableStyle(style) {
    var names = {
      hybrid: 'Hybrid', perfect: 'Perfect', near: 'Near / Loose', internal: 'Internal',
      multisyllabic: 'Multisyllabic', phonetic: 'Phonetic', suffix: 'Suffix / Kannada',
      semantic: 'Semantic', rhythmic: 'Rhythmic'
    };
    return names[style] || 'Hybrid';
  }

  function rhythmDots(score) {
    var filled = Math.max(1, Math.round(score / 20));
    return new Array(filled + 1).join('●') + new Array(6 - filled).join('○');
  }

  function renderWords(line) {
    var pieces = line.text.split(/([A-Za-z'\u0C80-\u0CFF]+)/);
    var wordPositions = [];
    pieces.forEach(function (piece, i) {
      if (/^[A-Za-z'\u0C80-\u0CFF]+$/.test(piece)) wordPositions.push(i);
    });
    var lastPosition = wordPositions.length ? wordPositions[wordPositions.length - 1] : -1;
    return pieces.map(function (piece, i) {
      if (!/^[A-Za-z'\u0C80-\u0CFF]+$/.test(piece)) return escapeHtml(piece);
      return '<button type="button" class="ll-word' + (i === lastPosition ? ' ending' : '') + '" data-word="' +
        escapeHtml(piece) + '" data-line="' + line.index + '" title="Find alternatives for ' + escapeHtml(piece) + '">' +
        escapeHtml(piece) + '</button>';
    }).join('');
  }

  function renderLines() {
    if (!el.lines || !state.analysis) return;
    var lastSection = -1;
    var html = '';
    state.analysis.lines.forEach(function (line) {
      if (line.sectionIndex !== lastSection) {
        lastSection = line.sectionIndex;
        html += '<div class="ll-section-heading">' + escapeHtml(line.heading || '[' + line.section + ']') +
          ' · ' + escapeHtml(line.scheme) + '</div>';
      }
      var scoreClass = line.rhymeScore == null || line.rhymeScore >= 72 ? 'good' : 'warn';
      var lineWarnings = line.warnings || [];
      var selected = line.index === state.selectedLine;
      html += '<article class="ll-line' + (selected ? ' selected' : '') + (lineWarnings.length ? ' has-warning' : '') +
        '" data-select-line="' + line.index + '">' +
        '<span class="ll-rhyme-label ' + line.rhymeLabel.toLowerCase() + '">' + escapeHtml(line.rhymeLabel) + '</span>' +
        '<div class="ll-line-copy"><div class="ll-line-text">' + renderWords(line) + '</div>' +
        '<div class="ll-line-sub">Ending: <b>' + escapeHtml(line.endingWord || '—') + '</b> · phonetic ' +
        escapeHtml(line.phoneticEnding || '—') + (line.rhymeTarget ? ' · answers ' + escapeHtml(line.rhymeTarget) : '') + '</div></div>' +
        '<div class="ll-line-metrics"><span class="ll-metric type">' + escapeHtml(line.rhymeType) + '</span>' +
        (line.rhymeScore == null ? '<span class="ll-metric">Anchor</span>' : '<span class="ll-metric score ' + scoreClass + '">' + line.rhymeScore + '% rhyme</span>') +
        '<span class="ll-metric">' + line.syllableCount + ' syllables</span>' +
        '<span class="ll-metric">Rhythm ' + rhythmDots(line.rhythmScore) + '</span>' +
        lineWarnings.map(function (warning) { return '<span class="ll-metric warning">⚠ ' + escapeHtml(warning) + '</span>'; }).join('') +
        '</div></article>';
    });
    el.lines.innerHTML = html;
  }

  function selectLine(index, word) {
    if (!state.analysis || !state.analysis.lines[index]) return;
    state.selectedLine = index;
    state.selectedWord = word || state.analysis.lines[index].endingWord;
    state.alternatives = defaultAlternatives(state.analysis.lines[index], state.selectedWord);
    renderLines();
    renderAssistant();
    if (el.assistant) {
      el.assistant.hidden = false;
      if (el.assistant.scrollIntoView) el.assistant.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function defaultAlternatives(line, word) {
    var suggestions = E.suggestRhymes(word, { language: state.language, style: getOptions().style });
    return suggestions.strong.concat(suggestions.near).slice(0, 3).map(function (item) {
      return {
        text: E.replaceWord(line.text, word, item.word),
        reason: item.type === 'Perfect' ? 'Phonetic' : item.type,
        detail: item.score + '% overall · ' + item.phonetic + '% phonetic'
      };
    });
  }

  function renderAssistant() {
    if (!state.analysis || state.selectedLine < 0 || !state.analysis.lines[state.selectedLine]) return;
    var line = state.analysis.lines[state.selectedLine];
    if (el.assistant) el.assistant.hidden = false;
    if (el.currentLine) el.currentLine.textContent = line.text;
    if (el.currentMeta) el.currentMeta.textContent = 'Selected: ' + state.selectedWord + ' · ' + line.syllableCount +
      ' syllables · ' + line.rhymeType + (line.rhymeTarget ? ' · target ' + line.rhymeTarget : '');
    renderAlternatives();
    renderCandidates(E.suggestRhymes(state.selectedWord, { language: state.language, style: getOptions().style }));
  }

  function renderAlternatives() {
    if (!el.alternatives) return;
    if (!state.alternatives.length) {
      el.alternatives.innerHTML = '<p class="ll-empty-suggestion">No safe automatic replacement found. Keeping the natural line is better than forcing a rhyme.</p>';
      return;
    }
    el.alternatives.innerHTML = state.alternatives.map(function (alt, i) {
      return '<div class="ll-alt"><p><span class="ll-reason">' + escapeHtml(alt.reason) + '</span>' + escapeHtml(alt.text) +
        '</p><small>' + escapeHtml(alt.detail || '') + '</small><button type="button" class="btn sm" data-use-alt="' + i + '">Use</button></div>';
    }).join('');
  }

  function candidateGroup(title, items, className) {
    var body = items.length ? items.map(function (item) {
      return '<button type="button" class="ll-candidate" data-candidate="' + escapeHtml(item.word) + '">' +
        escapeHtml(item.word) + '<small>' + (item.phonetic != null ? item.phonetic + '% sound · ' + item.rhythm + '% rhythm · ' + item.score + '% overall' : 'meaning alternative') + '</small></button>';
    }).join('') : '<span class="ll-empty-suggestion">No confident match</span>';
    return '<div class="ll-candidate-group ' + (className || '') + '"><h5>' + escapeHtml(title) + '</h5><div class="ll-candidate-list">' + body + '</div></div>';
  }

  function renderCandidates(suggestions) {
    if (!el.candidates) return;
    el.candidates.innerHTML = candidateGroup('Strong sound rhymes', suggestions.strong) +
      candidateGroup('Near / loose sound', suggestions.near) +
      candidateGroup('Meaning alternatives', suggestions.semantic, 'semantic');
  }

  function replaceLine(index, newText) {
    if (!el.editor || !state.analysis || !state.analysis.lines[index]) return;
    var rows = el.editor.value.split(/\r?\n/);
    var lyricIndex = -1;
    for (var i = 0; i < rows.length; i++) {
      var trimmed = rows[i].trim();
      if (!trimmed || /^\[[^\]]+\]$/.test(trimmed)) continue;
      lyricIndex++;
      if (lyricIndex === index) { rows[i] = newText; break; }
    }
    el.editor.value = rows.join('\n');
    analyze(true);
    if (state.analysis.lines[index]) selectLine(index, E.lastWord(newText));
    flash('Only the selected line was updated.');
  }

  function refine(action) {
    if (!state.analysis || state.selectedLine < 0 || !state.analysis.lines[state.selectedLine]) {
      flash('Select a line in the analysis first.'); return;
    }
    var line = state.analysis.lines[state.selectedLine];
    state.alternatives = E.refineLine(line.text, action, {
      language: state.language,
      style: getOptions().style,
      targetWord: line.rhymeTarget || line.endingWord,
      idea: getOptions().idea
    });
    renderAssistant();
    if (el.assistant && el.assistant.scrollIntoView) el.assistant.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function labelledText() {
    if (!state.analysis) return el.editor ? el.editor.value : '';
    var out = [], section = -1;
    state.analysis.lines.forEach(function (line) {
      if (line.sectionIndex !== section) { section = line.sectionIndex; out.push(line.heading || '[' + line.section + ']'); }
      out.push(line.rhymeLabel + ' — ' + line.text);
    });
    return out.join('\n');
  }

  function analysisText() {
    if (!state.analysis) return '';
    var q = state.analysis.quality;
    var out = ['RAAGA STUDIO — LYRICS LAB RHYME ANALYSIS', ''];
    state.analysis.lines.forEach(function (line) {
      out.push(line.rhymeLabel + ' — ' + line.text);
      out.push('  Ending: ' + line.endingWord + ' (' + line.phoneticEnding + ') · ' + line.rhymeType +
        ' · ' + line.syllableCount + ' syllables · rhythm ' + line.rhythmScore + '%' +
        (line.rhymeScore == null ? '' : ' · rhyme ' + line.rhymeScore + '%'));
      if (line.warnings.length) out.push('  Review: ' + line.warnings.join('; '));
    });
    out.push('', 'QUALITY CHECK',
      'Rhyme consistency: ' + qualityLabel(q.rhymeConsistency),
      'Syllable consistency: ' + qualityLabel(q.syllableConsistency),
      'Rhythm consistency: ' + qualityLabel(q.rhythmConsistency),
      'Natural-language flow: ' + qualityLabel(q.naturalLanguage),
      'Semantic coherence: ' + qualityLabel(q.semanticCoherence),
      'Forced-rhyme warnings: ' + q.forcedRhymeCount);
    return out.join('\n');
  }

  function copyText(text, success) {
    function done() { flash(success || 'Copied.'); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove(); done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  function downloadText() {
    var content = (el.editor ? el.editor.value : '') + '\n\n' + analysisText();
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'raaga-studio-lyrics.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
    flash('Lyrics downloaded as TXT.');
  }

  function persist() {
    if (!el.editor || !el.editor.value.trim()) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        text: el.editor.value,
        idea: el.idea ? el.idea.value : '',
        language: state.language,
        mood: valueOr(el.mood, 'Romantic'),
        section: valueOr(el.section, 'Chorus/Hook'),
        scheme: valueOr(el.scheme, 'auto'),
        style: valueOr(el.style, 'hybrid')
      }));
    } catch (e) {}
  }

  function restore() {
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!saved || !saved.text) return;
      if (el.editor) el.editor.value = saved.text;
      if (el.idea) el.idea.value = saved.idea || '';
      if (el.mood) el.mood.value = saved.mood || 'Romantic';
      if (el.section) el.section.value = saved.section || 'Chorus/Hook';
      if (el.scheme) el.scheme.value = saved.scheme || 'auto';
      if (el.style) el.style.value = saved.style || 'hybrid';
      setLanguage(saved.language || 'kannada');
      showConditionalFields();
      analyze(true);
    } catch (e) {}
  }

  var flashTimer;
  function flash(message) {
    if (!el.flash) return;
    el.flash.textContent = message;
    el.flash.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.flash.classList.remove('show'); }, 2300);
  }

  function closestData(target, selector) {
    if (!target) return null;
    if (target.closest) return target.closest(selector);
    return null;
  }

  function bind() {
    if (el.language) el.language.addEventListener('click', function (event) {
      var button = closestData(event.target, '[data-language]');
      if (button) setLanguage(button.getAttribute('data-language'));
    });
    if (el.idea) el.idea.addEventListener('input', function () {
      if (el.ideaCount) el.ideaCount.textContent = el.idea.value.length + ' / 800';
      showError('');
    });
    if (el.mood) el.mood.addEventListener('change', showConditionalFields);
    if (el.section) el.section.addEventListener('change', showConditionalFields);
    if (el.scheme) el.scheme.addEventListener('change', renderSchemePreview);
    if (el.generate) el.generate.addEventListener('click', generate);
    if (el.analyze) el.analyze.addEventListener('click', function () { analyze(false); });
    if (el.editor) el.editor.addEventListener('input', function () {
      state.dirty = true;
      if (el.saveState) { el.saveState.textContent = 'Edits not analyzed'; el.saveState.style.color = 'var(--gold)'; }
    });
    if (el.copy) el.copy.addEventListener('click', function () { copyText(el.editor.value, 'Lyrics copied.'); });
    if (el.copyLabels) el.copyLabels.addEventListener('click', function () { copyText(labelledText(), 'Lyrics with rhyme labels copied.'); });
    if (el.copyAnalysis) el.copyAnalysis.addEventListener('click', function () { copyText(analysisText(), 'Rhyme analysis copied.'); });
    if (el.download) el.download.addEventListener('click', downloadText);
    if (el.closeAssistant) el.closeAssistant.addEventListener('click', function () { el.assistant.hidden = true; });

    if (el.lines) el.lines.addEventListener('click', function (event) {
      var word = closestData(event.target, '[data-word]');
      if (word) {
        event.stopPropagation();
        selectLine(+word.getAttribute('data-line'), word.getAttribute('data-word'));
        return;
      }
      var row = closestData(event.target, '[data-select-line]');
      if (row) selectLine(+row.getAttribute('data-select-line'));
    });
    if (el.alternatives) el.alternatives.addEventListener('click', function (event) {
      var button = closestData(event.target, '[data-use-alt]');
      if (!button) return;
      var alt = state.alternatives[+button.getAttribute('data-use-alt')];
      if (alt) replaceLine(state.selectedLine, alt.text);
    });
    if (el.candidates) el.candidates.addEventListener('click', function (event) {
      var button = closestData(event.target, '[data-candidate]');
      if (!button || state.selectedLine < 0) return;
      var line = state.analysis.lines[state.selectedLine];
      var next = E.replaceWord(line.text, state.selectedWord, button.getAttribute('data-candidate'));
      replaceLine(state.selectedLine, next);
    });
    if (el.refineActions) el.refineActions.addEventListener('click', function (event) {
      var button = closestData(event.target, '[data-refine]');
      if (button) refine(button.getAttribute('data-refine'));
    });
  }

  function init() {
    bind();
    setLanguage('kannada');
    showConditionalFields();
    if (el.ideaCount && el.idea) el.ideaCount.textContent = el.idea.value.length + ' / 800';
    restore();
  }

  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.lyricsLab = {
    generate: generate,
    analyze: analyze,
    selectLine: selectLine,
    getState: function () { return state; },
    getOptions: getOptions
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
