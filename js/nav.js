/**
 * nav.js — shared tab navigation for Raaga Studio.
 * Handles all [data-tab] buttons, panel show/hide, URL hash, a mobile tools
 * drawer, and exposes RaagaStudio.switchTo(id) so other tools can jump tabs
 * (e.g. Song Studio → Mix Check).
 */
'use strict';

(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var panels = {};
  var menuBtn = document.getElementById('nav-menu-btn');
  var drawer = document.getElementById('nav-drawer');
  var drawerClose = document.getElementById('nav-drawer-close');
  var drawerBackdrop = document.getElementById('nav-drawer-backdrop');
  var currentLabel = document.getElementById('nav-current');

  var LABELS = {
    'practical-eq': 'Practical EQ',
    'vocal-eq': 'Vocal EQ',
    'prosody': 'ಛಂದಸ್ಸು',
    'suno': 'Suno Prompt',
    'raga': 'Raga Reference',
    'mix': 'Mix Check',
    'master': 'Master Check',
    'tempo': 'Tempo Lab',
    'songs': 'Song Studio',
    'lyrics': 'Lyrics Lab',
    'quick-access': 'Quick Access'
  };

  tabs.forEach(function (btn) {
    panels[btn.getAttribute('data-tab')] = document.getElementById('tab-' + btn.getAttribute('data-tab'));
  });

  function setDrawer(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    if (drawer.classList && drawer.classList.toggle) {
      drawer.classList.toggle('open', !!open);
    }
    if (menuBtn && menuBtn.setAttribute) {
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (document.body && document.body.classList) {
      document.body.classList.toggle('nav-drawer-open', !!open);
    }
  }

  function scrollTabIntoView(id) {
    var nav = document.getElementById('studio-tabnav');
    if (!nav || !nav.querySelector) return;
    var btn = nav.querySelector('[data-tab="' + id + '"]');
    if (!btn || typeof btn.scrollIntoView !== 'function') return;
    try {
      btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    } catch (e) {
      try { btn.scrollIntoView(false); } catch (e2) {}
    }
  }

  function switchTo(id, scrollToTop) {
    if (!panels[id]) return;
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-tab') === id;
      b.classList.toggle('active', on);
      if (b.getAttribute('role') === 'tab') {
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('aria-controls', 'tab-' + b.getAttribute('data-tab'));
      }
    });
    Object.keys(panels).forEach(function (k) {
      if (!panels[k]) return;
      panels[k].hidden = k !== id;
      panels[k].setAttribute('role', 'tabpanel');
    });
    if (currentLabel) {
      currentLabel.textContent = LABELS[id] || id;
    }
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    if (scrollToTop !== false && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    }
    scrollTabIntoView(id);
    setDrawer(false);
    window.dispatchEvent(new CustomEvent('raaga:tab', { detail: id }));
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTo(btn.getAttribute('data-tab'), true);
    });
  });

  if (menuBtn && menuBtn.addEventListener) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      setDrawer(!open);
    });
  }
  if (drawerClose && drawerClose.addEventListener) {
    drawerClose.addEventListener('click', function () { setDrawer(false); });
  }
  if (drawerBackdrop && drawerBackdrop.addEventListener) {
    drawerBackdrop.addEventListener('click', function () { setDrawer(false); });
  }
  if (document.addEventListener) {
    document.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Escape') setDrawer(false);
    });
  }

  var hash = (location.hash || '').replace('#', '');
  if (hash && panels[hash]) {
    switchTo(hash, false);
  } else if (hash === 'master') {
    switchTo('master', false);
  } else if (currentLabel) {
    currentLabel.textContent = LABELS['practical-eq'];
  }

  window.RaagaStudio = window.RaagaStudio || {};
  window.RaagaStudio.switchTo = switchTo;
})();
