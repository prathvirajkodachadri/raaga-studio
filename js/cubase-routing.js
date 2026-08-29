/**
 * cubase-routing.js — lightweight interactions for the Cubase 12 blueprint.
 * Click/hover route nodes to illuminate their signal path, switch to a compact
 * reference map, and present the main routing diagram in a focused full-screen
 * overlay. No build step and no external dependencies.
 */
'use strict';

(function () {
  var page = document.getElementById('tab-cubase-routing');

  window.RaagaStudio = window.RaagaStudio || {};

  var api = {
    clearRoute: function () {},
    setCompact: function () {},
    toggleFullscreen: function () {},
    activeRoute: function () { return []; }
  };
  window.RaagaStudio.cubaseRouting = api;

  if (!page) return;

  var activeTokens = [];
  var hoverTokens = [];
  var compact = false;
  var fullscreen = false;

  function $(id) { return document.getElementById(id); }

  function toArray(list) { return Array.prototype.slice.call(list || []); }

  function tokensFrom(el) {
    if (!el || !el.getAttribute) return [];
    return String(el.getAttribute('data-route') || '')
      .split(/\s+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function sameTokens(a, b) {
    if (a.length !== b.length) return false;
    var sortedA = a.slice().sort();
    var sortedB = b.slice().sort();
    for (var i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) return false;
    }
    return true;
  }

  function focusTokensFrom(el) {
    if (!el || !el.getAttribute) return [];
    var explicit = el.getAttribute('data-focus');
    if (explicit) return explicit.split(/\s+/).filter(Boolean);

    var label = String(el.textContent || '').trim().toUpperCase();
    if (label.indexOf('MIX BUS') >= 0) return ['mixbus'];
    if (label.indexOf('FX MASTER') >= 0) return ['fx-master'];
    if (label.indexOf('VOCAL PLATE') >= 0 || label.indexOf('VOCAL ROOM') >= 0 || label.indexOf('VOCAL HALL') >= 0 || label.indexOf('VOCAL CHAMBER') >= 0 || label.indexOf('VOCAL DELAY') >= 0 || label.indexOf('STRING HALL') >= 0 || label.indexOf('INSTRUMENT ROOM') >= 0 || label.indexOf('INSTRUMENT HALL') >= 0 || label.indexOf('PERCUSSION ROOM') >= 0 || label.indexOf('PERCUSSION HALL') >= 0 || label.indexOf('DRUM ROOM') >= 0) return ['fx'];
    if (label.indexOf('MASTER') >= 0 || label.indexOf('STEREO OUT') >= 0 || label.indexOf('LOUDNESS METER') >= 0 || label.indexOf('CLIPPING') >= 0 || label.indexOf('LIMITING') >= 0) return ['masterout'];
    if (label.indexOf('ALL VOCALS BUS') >= 0 || label.indexOf('VOCAL TRACKS') >= 0) return ['all-vocals'];
    if (label.indexOf('MUSIC BUS') >= 0 || label.indexOf('INSTRUMENT FAMILIES') >= 0) return ['musicbus'];
    if (label.indexOf('PARALLEL') >= 0) return ['parallel'];
    if (label.indexOf('BACKING VOCAL BUS') >= 0) return ['backing-vocal'];
    if (label.indexOf('LEAD VOCAL BUS') >= 0 || label.indexOf('LEAD VOCAL') >= 0) return ['lead-vocal'];
    if (label.indexOf('DOUBLE') >= 0) return ['double-vocal'];
    if (label.indexOf('HARMONY') >= 0) return ['harmony'];
    if (label.indexOf('CHORUS') >= 0) return ['chorus'];
    if (label.indexOf('DRUM') >= 0 || label.indexOf('KICK') >= 0 || label.indexOf('SNARE') >= 0 || label.indexOf('HI-HAT') >= 0 || label.indexOf('TOMS') >= 0 || label.indexOf('CYMBALS') >= 0 || label === 'ROOM') return ['drums'];
    if (label.indexOf('PERCUSSION') >= 0 || label.indexOf('MRIDANGAM') >= 0 || label.indexOf('TABLA') >= 0 || label.indexOf('GHATAM') >= 0 || label.indexOf('KANJIRA') >= 0 || label.indexOf('MORSING') >= 0 || label.indexOf('SHAKER') >= 0) return ['percussion'];
    if (label.indexOf('BASS') >= 0) return ['bass'];
    if (label.indexOf('MELODIC') >= 0 || label.indexOf('VEENA') >= 0 || label.indexOf('VIOLIN') >= 0 || label.indexOf('FLUTE') >= 0 || label.indexOf('NADASWARAM') >= 0 || label.indexOf('MANDOLIN') >= 0 || label.indexOf('GUITAR') >= 0) return ['melodic'];
    if (label.indexOf('KEYS') >= 0 || label.indexOf('PIANO') >= 0 || label.indexOf('ORGAN') >= 0 || label.indexOf('SYNTH') >= 0 || label.indexOf('PLUCK') >= 0 || label.indexOf('ARP') >= 0) return ['keys'];
    if (label.indexOf('STRING') >= 0 || label.indexOf('VIOLA') >= 0 || label.indexOf('CELLO') >= 0) return ['strings'];
    if (label.indexOf('ATMOS') >= 0 || label.indexOf('TANPURA') >= 0 || label.indexOf('SHRUTI') >= 0 || label.indexOf('DRONE') >= 0 || label.indexOf('PAD') >= 0 || label.indexOf('TEXTURE') >= 0) return ['atmos'];

    var tokens = tokensFrom(el);
    return tokens.length ? [tokens[0]] : [];
  }

  function intersects(a, b) {
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) >= 0) return true;
    }
    return false;
  }

  function routedElements() {
    return toArray(page.querySelectorAll('[data-route]'));
  }

  function setPressed(tokens) {
    toArray(page.querySelectorAll('.cb-node[aria-pressed]')).forEach(function (el) {
      el.setAttribute('aria-pressed', intersects(tokens, tokensFrom(el)) ? 'true' : 'false');
    });
  }

  function paint(tokens) {
    var has = tokens && tokens.length;
    page.classList.toggle('cb-has-route', !!has);
    routedElements().forEach(function (el) {
      var on = has && intersects(tokens, tokensFrom(el));
      el.classList.toggle('is-route-active', !!on);
      el.classList.toggle('cb-route-dim', !!has && !on);
    });
    setPressed(tokens || []);
  }

  function showRoute(tokens, persist) {
    var clean = (tokens || []).filter(Boolean);
    if (persist) activeTokens = clean.slice();
    paint(clean);
  }

  function clearRoute(keepPersistent) {
    if (keepPersistent && activeTokens.length) {
      paint(activeTokens);
      return;
    }
    hoverTokens = [];
    activeTokens = [];
    paint([]);
  }

  function nodeFromEvent(ev) {
    if (!ev || !ev.target || !ev.target.closest) return null;
    return ev.target.closest('.cb-node[data-route], .cb-chip[data-route]');
  }

  page.addEventListener('mouseover', function (ev) {
    var node = nodeFromEvent(ev);
    if (!node || !page.contains(node)) return;
    hoverTokens = focusTokensFrom(node);
    if (hoverTokens.length) showRoute(hoverTokens, false);
  });

  page.addEventListener('mouseout', function (ev) {
    var node = nodeFromEvent(ev);
    if (!node || !page.contains(node)) return;
    var related = ev.relatedTarget;
    if (related && node.contains && node.contains(related)) return;
    hoverTokens = [];
    if (activeTokens.length) paint(activeTokens);
    else paint([]);
  });

  page.addEventListener('click', function (ev) {
    var node = nodeFromEvent(ev);
    if (!node || !page.contains(node)) return;
    var tokens = focusTokensFrom(node);
    if (!tokens.length) return;
    if (sameTokens(tokens, activeTokens)) {
      clearRoute(false);
      return;
    }
    showRoute(tokens, true);
  });

  function setCompact(on) {
    compact = !!on;
    page.classList.toggle('cb-compact', compact);
    var btn = $('cb-compact-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', compact ? 'true' : 'false');
      btn.textContent = compact ? 'Full Detail View' : 'Compact View';
    }
    if (compact) {
      toArray(page.querySelectorAll('details.cb-example-card')).forEach(function (d) { d.open = false; });
    }
  }

  function setFullscreen(on) {
    var shell = $('cb-master-diagram');
    fullscreen = !!on;
    if (shell) shell.classList.toggle('cb-is-fullscreen', fullscreen);
    if (document.body && document.body.classList) {
      document.body.classList.toggle('cb-routing-fullscreen', fullscreen);
    }
    var btn = $('cb-full-flow');
    if (btn) {
      btn.setAttribute('aria-pressed', fullscreen ? 'true' : 'false');
      btn.textContent = fullscreen ? 'Exit Full Signal Flow' : 'Show Full Signal Flow';
    }
  }

  var compactBtn = $('cb-compact-toggle');
  if (compactBtn) {
    compactBtn.addEventListener('click', function () { setCompact(!compact); });
  }

  var fullBtn = $('cb-full-flow');
  if (fullBtn) {
    fullBtn.addEventListener('click', function () { setFullscreen(!fullscreen); });
  }
  var closeBtn = $('cb-full-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () { setFullscreen(false); });
  }

  if (document.addEventListener) {
    document.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        if (activeTokens.length) clearRoute(false);
      }
    });
  }

  var subnav = $('cb-subnav');
  if (subnav && subnav.addEventListener) {
    subnav.addEventListener('click', function (ev) {
      var link = ev.target && ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
      if (!link) return;
      if (ev.preventDefault) ev.preventDefault();
      var target = $(String(link.getAttribute('href') || '').replace('#', ''));
      if (target && target.scrollIntoView) {
        try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        catch (e) { target.scrollIntoView(true); }
      }
      toArray(subnav.querySelectorAll('a')).forEach(function (a) { a.classList.toggle('active', a === link); });
    });
  }

  // Make route nodes announce their pressed state to assistive tech.
  toArray(page.querySelectorAll('.cb-node[data-route], .cb-chip[data-route]')).forEach(function (el) {
    if (!el.hasAttribute || !el.hasAttribute('aria-pressed')) {
      try { el.setAttribute('aria-pressed', 'false'); } catch (e) {}
    }
  });

  api.clearRoute = clearRoute;
  api.setCompact = setCompact;
  api.toggleFullscreen = function () { setFullscreen(!fullscreen); };
  api.activeRoute = function () { return activeTokens.slice(); };
})();
