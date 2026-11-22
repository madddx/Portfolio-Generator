/*  Admin shell: edit portfolio-data.js in the browser, then download the updated file. */
(function () {
  'use strict';
  var PF = window.PF, h = window.PFEditor.h, $ = function (id) { return document.getElementById(id); };
  var DRAFT = 'pf-admin-draft:' + location.pathname;
  var published = window.PORTFOLIO_DATA ? PF.normalize(window.PORTFOLIO_DATA) : null;
  var baseline = JSON.stringify(published || PF.emptyData()), api, preview, dirty = false;

  function saveBlob(blob, name) { var a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  function setDirty(v) { dirty = v; var s = $('status'); s.textContent = v ? 'Unsaved changes' : 'No changes'; s.classList.toggle('warn', v); }
  function banner(text, actions) {
    var b = $('banner'); b.className = 'banner'; b.hidden = false; b.innerHTML = '';
    b.appendChild(h('span', { text: text })); actions.forEach(function (a) { b.appendChild(h('button.btn.sm' + (a.primary ? '.primary' : ''), { type: 'button', text: a.label, onclick: function () { b.hidden = true; a.fn && a.fn(); } })); });
  }
  function save() {
    saveBlob(new Blob([PF.serializeDataFile(api.getData())], { type: 'text/javascript' }), 'portfolio-data.js');
    baseline = JSON.stringify(PF.normalize(api.getData())); setDirty(false); try { localStorage.removeItem(DRAFT); } catch (e) {}
    api.toast('Saved portfolio-data.js. Replace the old file with it, then publish.');
  }

  function publishPanel(a) {
    var file = h('input', { type: 'file', accept: '.js,.json', hidden: true, onchange: function () {
      var f = file.files[0]; if (!f) return; var prev = JSON.parse(JSON.stringify(a.getData()));
      f.text().then(function (t) { a.setData(PF.parseDataFile(t)); a.toast('Data file opened.', { label: 'Undo', fn: function () { a.setData(prev); } }); }).catch(function () { a.toast('That file isn’t a portfolio data file.'); }); file.value = '';
    } });
    return h('div.ed-body',
      h('section.grp', h('h3', { text: 'Save your changes' }), h('p.grp-h', { text: 'Edits stay in this browser until you save. Saving downloads a new portfolio-data.js.' }),
        h('div', h('button.btn.primary.lg', { type: 'button', text: 'Save changes', onclick: save }))),
      h('section.grp', h('h3', { text: 'Then update your site' }),
        h('ol.steps',
          h('li', h('div', h('b', { text: 'Replace the file' }), h('span', { html: 'Put the downloaded <code>portfolio-data.js</code> in your site folder, replacing the old one.' }))),
          h('li', h('div', h('b', { text: 'Publish again' }), h('span', { text: 'Upload the folder to your host again, or commit the file if your site deploys from GitHub.' }))),
          h('li', h('div', h('b', { text: 'Check it' }), h('span', { text: 'Reload your site. If you still see the old version, hard-refresh (Ctrl+Shift+R).' }))))),
      h('section.grp', h('h3', { text: 'Other tools' }),
        h('div.row', h('button.btn', { type: 'button', text: 'Open a data file…', onclick: function () { file.click(); } }),
          h('button.btn', { type: 'button', text: 'Discard unsaved edits', onclick: function () { a.setData(published || PF.emptyData()); setDirty(false); try { localStorage.removeItem(DRAFT); } catch (e) {} a.toast('Back to the published version.'); } })), file,
        h('p.grp-h', { text: 'This page only prepares a file. It can’t change your live site on its own, so it’s safe to leave online.' })));
  }

  var start = published || PF.emptyData();
  api = window.PFEditor.create({
    root: $('editor'), data: start,
    extraPanels: [{ id: 'publish', label: 'Save & publish', title: 'Save and publish', hint: 'Three steps to get your edits live.', render: publishPanel }],
    onChange: function (d) {
      preview && preview.update();
      var now = JSON.stringify(PF.normalize(d)); setDirty(now !== baseline);
      try { if (now !== baseline) localStorage.setItem(DRAFT, now); else localStorage.removeItem(DRAFT); } catch (e) {}
    },
    onPanel: function (id, p) { preview && preview.scrollTo(p.section); }
  });
  preview = window.PFPreview.create({ root: $('preview'), getData: function () { return api.getData(); }, src: 'index.html?pf-preview=1' });
  setDirty(false);

  if (!published) banner('Couldn’t find portfolio-data.js next to this page, so you’re starting from a blank site. Open your data file from “Save & publish”, or fill things in fresh.', [{ label: 'Open Save & publish', fn: function () { api.showPanel('publish'); } }]);
  else { try {
    var d = localStorage.getItem(DRAFT);
    if (d && d !== baseline) banner('You have edits from last time that were never saved.', [{ label: 'Restore them', primary: true, fn: function () { api.setData(JSON.parse(d)); setDirty(true); } }, { label: 'Discard', fn: function () { try { localStorage.removeItem(DRAFT); } catch (e) {} } }]);
  } catch (e) {} }

  $('save').addEventListener('click', save);
  $('pv-toggle').addEventListener('click', function () { var on = document.body.classList.toggle('show-preview'); this.textContent = on ? 'Edit' : 'Preview'; preview.layout(); });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
