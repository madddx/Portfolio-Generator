/*  Landing page: shows the real sample portfolio changing between the styles in themes/ (the same catalog the generator uses). */
window.PFCatalog.ready(function () {
  'use strict';
  var PF = window.PF, T = window.PF_TEMPLATES, $ = function (id) { return document.getElementById(id); };
  var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches, mode = dark ? 'dark' : 'light';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var base = window.PF_SAMPLE(); base.hero.typed = []; base.design.toggle = false;
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function isNew(s) { return !!s.isNew; }   // build.mjs marks the 3 most recently added themes
  function art(s) { var c = s.swatch[mode]; return s.thumb.replace(/\{bg\}/g, c[0]).replace(/\{ink\}/g, c[1]).replace(/\{ac\}/g, c[2]); }

  // ── live stage ──
  var frame = $('frame'), view = $('view'), idx = 0, ready = false, timer = null, chips = [];
  function layout() { var w = view.clientWidth, h = view.clientHeight, s = w / 1280; frame.style.transform = 'scale(' + s + ')'; frame.style.height = Math.ceil(h / s) + 'px'; }
  function send() { if (!ready) return; var d = JSON.parse(JSON.stringify(base)); d.design.style = PF.STYLES[idx].id; d.design.mode = mode; try { frame.contentWindow.postMessage({ type: 'pf-data', data: d }, '*'); } catch (e) {} }
  window.addEventListener('message', function (e) { if (e.source === frame.contentWindow && e.data && e.data.type === 'pf-ready') { ready = true; send(); } });
  frame.srcdoc = window.PFAssemble.inlineDoc(T, null);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(view); window.addEventListener('resize', layout); layout();

  var picker = $('picker'), seg = $('mode');
  PF.STYLES.forEach(function (s, i) {
    var b = el('button', { type: 'button', text: s.name, 'aria-pressed': i === 0 ? 'true' : 'false' });
    b.addEventListener('click', function () { stop(); show(i); }); chips.push(b); picker.insertBefore(b, seg);
  });
  function show(i) { idx = i; chips.forEach(function (c, k) { c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); }); send(); }
  function stop() { clearInterval(timer); timer = null; }
  function drawSeg() {
    seg.innerHTML = '';
    [['light', 'Light'], ['dark', 'Dark']].forEach(function (m) {
      var b = el('button', { type: 'button', role: 'radio', 'aria-checked': mode === m[0] ? 'true' : 'false', text: m[1] }); if (mode === m[0]) b.className = 'on';
      b.addEventListener('click', function () { mode = m[0]; drawSeg(); drawThemes(); send(); }); seg.appendChild(b);
    });
  }
  drawSeg();
  if (!reduce) timer = setInterval(function () { show((idx + 1) % PF.STYLES.length); }, 3800);

  // ── theme cards ──
  function drawThemes() {
    var box = $('themes'); box.innerHTML = '';
    PF.STYLES.forEach(function (s) {
      var a = el('a', { class: 'theme', href: 'generate.html#style=' + encodeURIComponent(s.id) }, [el('div', { html: art(s) }), el('b', { text: s.name }, [isNew(s) ? el('span', { class: 'pill new', text: 'New' }) : null]), el('span', { class: 't-blurb', text: s.blurb })]);
      box.appendChild(a);
    });
  }
  drawThemes();
  $('themes-sub').textContent = PF.STYLES.length + ' styles so far, each in light and dark. A new one is added every week.';
});
