/*  Live preview: an iframe running the real site, fed by postMessage.
    PFPreview.create({ root, getData, srcdoc | src, standalone }) → { update, scrollTo }  */
(function (root) {
  'use strict';
  var h = root.PFEditor.h;

  function create(o) {
    var device = 'desktop', ready = false, pending = null, t;
    var frame = h('iframe.pv-frame', { title: 'Live preview of your site' });
    var stage = h('div.pv-stage', frame);
    var seg = h('div.seg', { role: 'radiogroup', 'aria-label': 'Preview size' });
    var bar = h('div.pv-bar', seg, h('span.top-spacer'), o.standalone ? h('button.btn.sm', { type: 'button', text: 'Open in new tab', onclick: function () {
      var url = URL.createObjectURL(new Blob([o.standalone()], { type: 'text/html' })); var w = window.open(url, '_blank'); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); if (!w) alert('Allow pop-ups to open the preview in a new tab.'); } }) : null);
    var wrap = h('div.preview' + (o.bare ? '.bare' : ''), o.bare ? null : bar, stage);
    o.root.appendChild(wrap);

    function drawSeg() {
      seg.innerHTML = '';
      [['desktop', 'Desktop'], ['phone', 'Phone']].forEach(function (d) {
        seg.appendChild(h('button' + (device === d[0] ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': device === d[0] ? 'true' : 'false', text: d[1], onclick: function () { device = d[0]; drawSeg(); layout(); } }));
      });
    }
    function layout() {
      var w = stage.clientWidth, ht = stage.clientHeight; if (!w || !ht) return;
      frame.classList.toggle('phone', device === 'phone');
      if (device === 'desktop') {
        var s = Math.min(1, w / 1280);
        frame.style.width = '1280px'; frame.style.height = Math.round(ht / s) + 'px'; frame.style.transform = 'scale(' + s + ')'; frame.style.left = '0px'; frame.style.top = '0px';
      } else {
        var fw = 390 + 16, fh = 800 + 16, s2 = Math.min(1, (ht - 24) / fh, (w - 24) / fw);
        frame.style.width = fw + 'px'; frame.style.height = fh + 'px'; frame.style.transform = 'scale(' + s2 + ')';
        frame.style.left = Math.max(0, (w - fw * s2) / 2) + 'px'; frame.style.top = Math.max(0, (ht - fh * s2) / 2) + 'px';
      }
    }
    if (root.ResizeObserver) new ResizeObserver(layout).observe(stage); else root.addEventListener('resize', layout);
    drawSeg(); layout();

    function post(msg) { try { frame.contentWindow.postMessage(msg, '*'); } catch (e) {} }
    function send() { post({ type: 'pf-data', data: o.getData() }); }
    root.addEventListener('message', function (e) {
      if (e.source !== frame.contentWindow || !e.data) return;
      if (e.data.type === 'pf-ready') { ready = true; send(); if (pending) { post({ type: 'pf-scroll', id: pending }); pending = null; } }
    });
    frame.addEventListener('load', function () { setTimeout(send, 50); });
    if (o.srcdoc) frame.srcdoc = o.srcdoc(); else frame.src = o.src;

    return {
      update: function () { clearTimeout(t); t = setTimeout(send, 60); },
      scrollTo: function (id) { if (!id) return; if (ready) post({ type: 'pf-scroll', id: id }); else pending = id; },
      layout: layout,
      setDevice: function (d) { device = d; drawSeg(); layout(); }
    };
  }
  root.PFPreview = { create: create };
})(window);
