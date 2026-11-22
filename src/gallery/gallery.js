/*  Theme gallery: every theme side by side, with the sample portfolio, in light/dark and desktop/phone. */
window.PFCatalog.ready(function () {
  'use strict';
  var PF = window.PF, T = window.PF_TEMPLATES, h = window.PFEditor.h, mode = 'light', device = 'desktop', previews = [], base = window.PF_SAMPLE(); base.hero.typed = [];   // no typing animation while reviewing
  var grid = document.getElementById('grid');
  document.getElementById('count').textContent = PF.STYLES.length + ' themes';

  function seg(el, opts, get, set) {
    function draw() { el.innerHTML = ''; opts.forEach(function (o) { el.appendChild(h('button' + (get() === o[0] ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': get() === o[0] ? 'true' : 'false', text: o[1], onclick: function () { set(o[0]); draw(); } })); }); }
    draw();
  }
  seg(document.getElementById('mode'), [['light', 'Light'], ['dark', 'Dark']], function () { return mode; }, function (m) { mode = m; previews.forEach(function (p) { p.update(); }); });
  seg(document.getElementById('device'), [['desktop', 'Desktop'], ['phone', 'Phone']], function () { return device; }, function (d) { device = d; document.body.classList.toggle('phone', d === 'phone'); previews.forEach(function (p) { p.setDevice(d); }); });

  PF.STYLES.forEach(function (s) {
    var isNew = !!s.isNew, slot = h('div.gal-pv');
    var card = h('article.gal-card', h('header', h('h2', { text: s.name }), isNew ? h('span.pill.new', { text: 'New' }) : null, h('span.gal-date', { text: 'Released ' + String(s.released).slice(0, 10) })), slot, h('p', { text: s.blurb }), h('code', { text: s.id }));
    grid.appendChild(card);
    var made = false, io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || made) return; made = true; io.disconnect();
      var p = window.PFPreview.create({ root: slot, bare: true, srcdoc: function () { return window.PFAssemble.inlineDoc(T, null); },
        getData: function () { var d = JSON.parse(JSON.stringify(base)); d.design.style = s.id; d.design.mode = mode; d.design.toggle = false; return d; } });
      if (device !== 'desktop') p.setDevice(device); previews.push(p);
    }, { rootMargin: '400px' });
    io.observe(card);
  });
});
