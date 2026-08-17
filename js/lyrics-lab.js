/**
 * lyrics-lab.js — UI controller for the Lyrics Lab prompt builder.
 * The page creates a copyable songwriting prompt; it does not generate lyrics.
 */
'use strict';

(function () {
  var Prompt = window.LYRICS_PROMPT;
  if (!Prompt) return;

  function $(id) { return document.getElementById(id); }
  var el = {
    language: $('ll-language'), idea: $('ll-idea'), ideaCount: $('ll-idea-count'),
    mood: $('ll-mood'), customMoodWrap: $('ll-custom-mood-wrap'), customMood: $('ll-custom-mood'),
    section: $('ll-section'), customSectionWrap: $('ll-custom-section-wrap'), customSection: $('ll-custom-section'),
    scheme: $('ll-scheme'), schemePreview: $('ll-scheme-preview'), style: $('ll-style'),
    syllables: $('ll-syllables'), vocabulary: $('ll-vocabulary'), keyPhrases: $('ll-key-phrases'),
    filmMode: $('ll-film-mode'), generate: $('ll-generate'), error: $('ll-form-error'),
    outputWrap: $('ll-prompt-result'), output: $('ll-prompt-output'), outputSummary: $('ll-output-summary'),
    copy: $('ll-copy-prompt'), clear: $('ll-clear-prompt'), flash: $('ll-flash')
  };
  var state = { language: 'kannada' };
  var LS_KEY = 'raaga.lyricsPromptDraft';

  function valueOr(node, fallback) { return node && node.value ? node.value : fallback; }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getOptions() {
    return {
      language: state.language,
      idea: el.idea ? el.idea.value.trim() : '',
      mood: valueOr(el.mood, 'Romantic'),
      customMood: el.customMood ? el.customMood.value.trim() : '',
      section: valueOr(el.section, 'Chorus/Hook'),
      customSection: el.customSection ? el.customSection.value.trim() : '',
      scheme: valueOr(el.scheme, 'auto'),
      style: valueOr(el.style, 'hybrid'),
      syllables: valueOr(el.syllables, 'auto'),
      vocabulary: valueOr(el.vocabulary, 'spoken'),
      keyPhrases: el.keyPhrases ? el.keyPhrases.value.trim() : '',
      filmMode: !!(el.filmMode && el.filmMode.checked)
    };
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
        kannada: 'ಉದಾ: ಮೊದಲ ಮಳೆಯಲ್ಲಿ ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ಮತ್ತೆ ಭೇಟಿಯಾಗುವ ಇಬ್ಬರು',
        english: 'e.g. Two people meet again at a bus stop during the first rain',
        bilingual: 'ಉದಾ: ಮೊದಲ ಮಳೆ, an unfinished love story, and a chance meeting'
      };
      el.idea.placeholder = placeholders[state.language];
    }
  }

  function renderConditionalFields() {
    if (el.customMoodWrap) el.customMoodWrap.hidden = valueOr(el.mood, 'Romantic') !== 'Custom';
    if (el.customSectionWrap) el.customSectionWrap.hidden = valueOr(el.section, 'Chorus/Hook') !== 'Custom';
    renderSchemePreview();
  }

  function renderSchemePreview() {
    if (!el.schemePreview) return;
    var selected = valueOr(el.scheme, 'auto');
    var scheme = Prompt.SCHEMES[selected] || Prompt.SCHEMES.auto;
    var pattern = scheme.pattern === 'AUTO' ? 'A?B?' : scheme.pattern;
    var chips = pattern.split('').map(function (letter) {
      var cls = letter === '?' ? 'open' : 'family-' + letter.toLowerCase();
      return '<span class="' + cls + '">' + escapeHtml(letter) + '</span>';
    }).join('');
    el.schemePreview.innerHTML = '<div class="ll-pattern" aria-label="' + escapeHtml(scheme.pattern) + ' rhyme pattern">' + chips + '</div>' +
      '<div><strong>' + escapeHtml(selected === 'auto' ? 'Auto / AI chooses' : selected) + '</strong>' +
      '<p>' + escapeHtml(scheme.en) + '</p><p lang="kn">' + escapeHtml(scheme.kn) + '</p></div>';
  }

  function showError(message) {
    if (!el.error) return;
    el.error.textContent = message || '';
    el.error.hidden = !message;
  }

  function generatePrompt() {
    try {
      var options = getOptions();
      var prompt = Prompt.buildPrompt(options);
      showError('');
      if (el.output) el.output.value = prompt;
      if (el.outputSummary) {
        var scheme = options.scheme === 'auto' ? 'Auto rhyme scheme' : options.scheme;
        el.outputSummary.textContent = (options.language === 'bilingual' ? 'Kannada + English' :
          options.language.charAt(0).toUpperCase() + options.language.slice(1)) + ' · ' +
          options.section + ' · ' + scheme;
      }
      if (el.outputWrap) {
        el.outputWrap.hidden = false;
        if (el.outputWrap.scrollIntoView) el.outputWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      persist();
      flash('Songwriting prompt created.');
      return prompt;
    } catch (error) {
      showError(error.message || 'Enter a song idea first.');
      if (el.idea) el.idea.focus();
      return '';
    }
  }

  function copyPrompt() {
    var text = el.output ? el.output.value : '';
    if (!text) { flash('Generate a prompt first.'); return; }
    function done() { flash('Prompt copied—paste it into your writing AI.'); }
    function fallback() {
      if (!el.output) return;
      el.output.focus(); el.output.select();
      try { document.execCommand('copy'); } catch (error) {}
      done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  function clearPrompt() {
    if (el.idea) el.idea.value = '';
    if (el.customMood) el.customMood.value = '';
    if (el.customSection) el.customSection.value = '';
    if (el.keyPhrases) el.keyPhrases.value = '';
    if (el.output) el.output.value = '';
    if (el.outputWrap) el.outputWrap.hidden = true;
    if (el.ideaCount) el.ideaCount.textContent = '0 / 1200';
    showError('');
    try { localStorage.removeItem(LS_KEY); } catch (error) {}
    if (el.idea) el.idea.focus();
    flash('Lyrics Lab cleared.');
  }

  function persist() {
    try {
      var options = getOptions();
      localStorage.setItem(LS_KEY, JSON.stringify(options));
    } catch (error) {}
  }

  function restore() {
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!saved) return;
      setLanguage(saved.language || 'kannada');
      if (el.idea) el.idea.value = saved.idea || '';
      if (el.mood) el.mood.value = saved.mood || 'Romantic';
      if (el.customMood) el.customMood.value = saved.customMood || '';
      if (el.section) el.section.value = saved.section || 'Chorus/Hook';
      if (el.customSection) el.customSection.value = saved.customSection || '';
      if (el.scheme) el.scheme.value = saved.scheme || 'auto';
      if (el.style) el.style.value = saved.style || 'hybrid';
      if (el.syllables) el.syllables.value = saved.syllables || 'auto';
      if (el.vocabulary) el.vocabulary.value = saved.vocabulary || 'spoken';
      if (el.keyPhrases) el.keyPhrases.value = saved.keyPhrases || '';
      if (el.filmMode) el.filmMode.checked = !!saved.filmMode;
      if (el.ideaCount && el.idea) el.ideaCount.textContent = el.idea.value.length + ' / 1200';
      renderConditionalFields();
    } catch (error) {}
  }

  var flashTimer;
  function flash(message) {
    if (!el.flash) return;
    el.flash.textContent = message;
    el.flash.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.flash.classList.remove('show'); }, 2300);
  }

  function closest(target, selector) { return target && target.closest ? target.closest(selector) : null; }

  function bind() {
    if (el.language) el.language.addEventListener('click', function (event) {
      var button = closest(event.target, '[data-language]');
      if (button) setLanguage(button.getAttribute('data-language'));
    });
    if (el.idea) el.idea.addEventListener('input', function () {
      if (el.ideaCount) el.ideaCount.textContent = el.idea.value.length + ' / 1200';
      showError('');
    });
    if (el.mood) el.mood.addEventListener('change', renderConditionalFields);
    if (el.section) el.section.addEventListener('change', renderConditionalFields);
    if (el.scheme) el.scheme.addEventListener('change', renderSchemePreview);
    if (el.generate) el.generate.addEventListener('click', generatePrompt);
    if (el.copy) el.copy.addEventListener('click', copyPrompt);
    if (el.clear) el.clear.addEventListener('click', clearPrompt);
  }

  function init() {
    bind();
    setLanguage('kannada');
    renderConditionalFields();
    restore();
  }

  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.lyricsLab = {
    generatePrompt: generatePrompt,
    getOptions: getOptions,
    setLanguage: setLanguage
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
