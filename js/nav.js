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

  function switchTo(id) {
    if (!panels[id]) return;
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-tab') === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) panels[k].hidden = k !== id;
    });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    window.dispatchEvent(new CustomEvent('raaga:tab', { detail: id }));
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTo(btn.getAttribute('data-tab'));
    });
  });

  var hash = (location.hash || '').replace('#', '');
  if (hash && panels[hash]) {
    switchTo(hash);
  } else if (hash === 'master') {
    switchTo('master');
  }

  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.switchTo = switchTo;
})();
