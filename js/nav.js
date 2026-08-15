/**
 * nav.js — shared tab navigation for Raaga Studio.
 * Handles all [data-tab] buttons, panel show/hide, URL hash, and exposes
 * RaagaStudio.switchTo(id) so other tools can jump tabs (e.g. Song Studio → Mix Check).
 */
'use strict';

(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var panels = {};

  tabs.forEach(function (btn) {
    panels[btn.getAttribute('data-tab')] = document.getElementById('tab-' + btn.getAttribute('data-tab'));
  });

  function switchTo(id, scrollToTop) {
    if (!panels[id]) return;
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-tab') === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('aria-controls', 'tab-' + b.getAttribute('data-tab'));
    });
    Object.keys(panels).forEach(function (k) {
      if (!panels[k]) return;
      panels[k].hidden = k !== id;
      panels[k].setAttribute('role', 'tabpanel');
    });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    if (scrollToTop !== false && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    }
    window.dispatchEvent(new CustomEvent('raaga:tab', { detail: id }));
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTo(btn.getAttribute('data-tab'), true);
    });
  });

  var hash = (location.hash || '').replace('#', '');
  if (hash && panels[hash]) {
    switchTo(hash, false);
  } else if (hash === 'master') {
    switchTo('master', false);
  }

  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.switchTo = switchTo;
})();
