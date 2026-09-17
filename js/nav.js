/**
 * nav.js — shared tab navigation for Raaga Studio.
 * Handles all [data-tab] buttons, panel show/hide, URL hash, a mobile tools
 * drawer, and exposes RaagaStudio.switchTo(id) so other tools can jump tabs.
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
    'practical-eq': 'Practical EQ', 'vocal-eq': 'Vocal EQ', 'prosody': 'ಛಂದಸ್ಸು',
    'suno': 'Suno Prompt', 'suno-cheats': 'Suno Cheat Codes', 'raga': 'Raga Reference',
    'mix': 'Mix Check', 'master': 'Master Check', 'cubase-routing': 'Cubase 12 Mixing & Routing',
    'tempo': 'Tempo Lab', 'songs': 'Song Studio', 'lyrics': 'Lyrics Lab', 'quick-access': 'Quick Access'
  };

  function installMobileTitleFix() {
    if (document.getElementById('raaga-mobile-nav-fix')) return;
    var s = document.createElement('style'); s.id = 'raaga-mobile-nav-fix';
    s.textContent = '@media(max-width:760px){' +
      '#studio-tabnav{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;max-width:100%;min-width:0}' +
      '#studio-tabnav::-webkit-scrollbar{display:none}' +
      '.tabnav .tab{flex:0 0 auto;min-width:max-content;padding:9px 10px}' +
      '.tabnav .tab-label.mobile{display:none!important}' +
      '.tabnav .tab-label.desktop{display:inline!important;font-size:.78rem;line-height:1.1}' +
      '.tabnav .tab-label{white-space:nowrap}' +
      '.topbar{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;grid-template-areas:"logo brand menu" "tabs tabs tabs"!important;gap:8px 10px!important;padding:8px 12px!important;padding-top:max(8px,env(safe-area-inset-top))!important;overflow:visible!important;min-width:0}' +
      '.logo{display:flex!important;width:32px;height:32px}' +
      '.brand{display:block!important;visibility:visible!important;min-width:0!important;max-width:none!important;overflow:visible!important}' +
      '.brand h1{display:block!important;visibility:visible!important;margin:0!important;font-size:15px!important;line-height:1.2!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important}' +
      '.brand-flow{display:none!important}' +
      '.desktop-tag{display:none!important}' +
      '.nav-current{display:block!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58vw;font-size:10px!important;line-height:1.2!important}' +
      '.nav-menu-btn{display:flex!important;width:40px;height:40px}' +
      '.tab-icon{font-size:.9rem;margin-right:3px}' +
      '.wrap,.panel,.pq-page,.veq-page,.sc-page,.mt-page,.cb-page,.ll-page{min-width:0;max-width:100%;overflow:visible}' +
      'h1,h2,h3,h4,h5,h6{max-width:100%;overflow-wrap:anywhere;word-break:normal;line-height:1.2}' +
      'p,.mc-intro,.hint,.tag{max-width:100%;overflow-wrap:anywhere}' +
      'section,article,header,main,div{min-width:0}' +
      '.nav-drawer-copy b{font-size:.98rem}.nav-drawer-copy small{font-size:.76rem}' +
      '}';
    document.head.appendChild(s);
  }

  function addExternalCalculatorLinks() {
    var tabnav = document.getElementById('studio-tabnav');
    if (tabnav) {
      if (!tabnav.querySelector('a[data-tool="audio-calculators"]')) {
        var a = document.createElement('a');
        a.className = 'tab'; a.href = 'audio-calculators.html'; a.setAttribute('data-tool', 'audio-calculators'); a.setAttribute('aria-label', 'Audio Calculators');
        a.innerHTML = '<span class="tab-icon" aria-hidden="true">∑</span><span class="tab-label desktop">Audio Calculators</span><span class="tab-label mobile">Calc</span>';
        var tempoTab = tabnav.querySelector('[data-tab="tempo"]');
        if (tempoTab && tempoTab.parentNode) tempoTab.parentNode.insertBefore(a, tempoTab.nextSibling); else tabnav.appendChild(a);
      }
      if (!tabnav.querySelector('a[data-tool="key-chords"]')) {
        var k = document.createElement('a');
        k.className = 'tab'; k.href = 'key-chords.html'; k.setAttribute('data-tool', 'key-chords'); k.setAttribute('aria-label', 'Key & Chords');
        k.innerHTML = '<span class="tab-icon" aria-hidden="true">♫</span><span class="tab-label desktop">Key &amp; Chords</span><span class="tab-label mobile">Keys</span>';
        var acTab = tabnav.querySelector('a[data-tool="audio-calculators"]');
        if (acTab && acTab.parentNode) acTab.parentNode.insertBefore(k, acTab.nextSibling); else tabnav.appendChild(k);
      }
    }
    var grid = drawer && drawer.querySelector('.nav-drawer-grid');
    if (grid) {
      if (!grid.querySelector('a[data-tool="audio-calculators"]')) {
        var d = document.createElement('a'); d.className = 'nav-drawer-item'; d.href = 'audio-calculators.html'; d.setAttribute('data-tool', 'audio-calculators');
        d.innerHTML = '<span class="nav-drawer-ico" aria-hidden="true">∑</span><span class="nav-drawer-copy"><b>Audio Calculators</b><small>15 music production formulas</small></span>';
        var tempoItem = grid.querySelector('[data-tab="tempo"]');
        if (tempoItem && tempoItem.parentNode) tempoItem.parentNode.insertBefore(d, tempoItem.nextSibling); else grid.appendChild(d);
      }
      if (!grid.querySelector('a[data-tool="key-chords"]')) {
        var kd = document.createElement('a'); kd.className = 'nav-drawer-item'; kd.href = 'key-chords.html'; kd.setAttribute('data-tool', 'key-chords');
        kd.innerHTML = '<span class="nav-drawer-ico" aria-hidden="true">♫</span><span class="nav-drawer-copy"><b>Key &amp; Chords</b><small>Scales, diatonic harmony &amp; transpose</small></span>';
        var calcItem = grid.querySelector('a[data-tool="audio-calculators"]');
        if (calcItem && calcItem.parentNode) calcItem.parentNode.insertBefore(kd, calcItem.nextSibling); else grid.appendChild(kd);
      }
    }
  }

  installMobileTitleFix(); addExternalCalculatorLinks();
  tabs.forEach(function (btn) { panels[btn.getAttribute('data-tab')] = document.getElementById('tab-' + btn.getAttribute('data-tab')); });

  function setDrawer(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    if (drawer.classList && drawer.classList.toggle) drawer.classList.toggle('open', !!open);
    if (menuBtn && menuBtn.setAttribute) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (document.body && document.body.classList) document.body.classList.toggle('nav-drawer-open', !!open);
  }
  function scrollTabIntoView(id) {
    var nav = document.getElementById('studio-tabnav'); if (!nav || !nav.querySelector) return;
    var btn = nav.querySelector('[data-tab="' + id + '"]'); if (!btn || typeof btn.scrollIntoView !== 'function') return;
    try { btn.scrollIntoView({ inline:'center', block:'nearest', behavior:'smooth' }); } catch(e){ try{btn.scrollIntoView(false)}catch(e2){} }
  }
  function switchTo(id, scrollToTop) {
    if (!panels[id]) return;
    tabs.forEach(function(b){ var on=b.getAttribute('data-tab')===id; b.classList.toggle('active',on); if(b.getAttribute('role')==='tab'){b.setAttribute('aria-selected',on?'true':'false');b.setAttribute('aria-controls','tab-'+b.getAttribute('data-tab'));} });
    Object.keys(panels).forEach(function(k){if(!panels[k])return;panels[k].hidden=k!==id;panels[k].setAttribute('role','tabpanel')});
    if(currentLabel)currentLabel.textContent=LABELS[id]||id;
    try{history.replaceState(null,'','#'+id)}catch(e){}
    if(scrollToTop!==false&&typeof window.scrollTo==='function'){try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}}
    scrollTabIntoView(id); setDrawer(false); window.dispatchEvent(new CustomEvent('raaga:tab',{detail:id}));
  }
  tabs.forEach(function(btn){btn.addEventListener('click',function(){switchTo(btn.getAttribute('data-tab'),true)})});
  if(menuBtn&&menuBtn.addEventListener)menuBtn.addEventListener('click',function(){setDrawer(menuBtn.getAttribute('aria-expanded')!=='true')});
  if(drawerClose&&drawerClose.addEventListener)drawerClose.addEventListener('click',function(){setDrawer(false)});
  if(drawerBackdrop&&drawerBackdrop.addEventListener)drawerBackdrop.addEventListener('click',function(){setDrawer(false)});
  if(document.addEventListener)document.addEventListener('keydown',function(ev){if(ev&&ev.key==='Escape')setDrawer(false)});
  var hash=(location.hash||'').replace('#','');
  if(hash&&panels[hash])switchTo(hash,false);else if(hash==='master')switchTo('master',false);else if(currentLabel)currentLabel.textContent=LABELS['practical-eq'];
  window.RaagaStudio=window.RaagaStudio||{}; window.RaagaStudio.switchTo=switchTo;
})();
