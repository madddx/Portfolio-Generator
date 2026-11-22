/*  Generator shell: wires the editor, live preview and zip export together. */
window.PFCatalog.ready(function () {
  'use strict';
  var PF = window.PF, h = window.PFEditor.h, T = window.PF_TEMPLATES, KEY = 'pf-generator-draft-v1';
  var $ = function (id) { return document.getElementById(id); };

  // ── helpers ────────────────────────────────────────────────────────────
  function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'portfolio'; }
  function sizeKB(d) { return Math.round(JSON.stringify(d).length / 1024); }
  function saveBlob(blob, name) {
    var a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  // ── site assembly ──────────────────────────────────────────────────────
  function inlineDoc(data) { return window.PFAssemble.inlineDoc(T, data); }

  function readme(name) {
    return [
      'Your portfolio website' + (name ? ' — ' + name : ''), '======================================', '',
      'See it:      open index.html in your browser.',
      'Publish it:  upload this whole folder to any static host.',
      '             - Netlify:  drag the folder onto app.netlify.com/drop',
      '             - Vercel, GitHub Pages, Cloudflare Pages: deploy the folder as it is.', '',
      'Windows says the zip is blocked, or a file is "potentially harmful"?',
      '  It is only Windows being careful with downloaded files. Right-click the .zip,',
      '  choose Properties, tick "Unblock", press OK, then extract it again.',
      '  Never double-click portfolio-data.js — it is just your content. Open index.html or admin.html instead.', '',
      'Change something later (no need to come back to the generator)',
      '  1. Open admin.html — from this folder, or at yoursite.com/admin.html once published.',
      '  2. Edit, add or remove anything. The preview updates as you type.',
      '  3. Press "Save changes". Your browser downloads a new portfolio-data.js.',
      '  4. Replace the old portfolio-data.js in this folder with the new one and publish again.', '',
      'Good to know',
      '  - admin.html only prepares a new data file. It cannot change your live site by itself,',
      '    so it is safe to leave online. Delete it if you would rather not publish it.',
      '  - Everything you wrote and every photo lives in portfolio-data.js.',
      '  - css/themes/ holds every style, so you can switch styles later from the admin page.', ''
    ].join('\n');
  }

  function siteFiles(data) {
    var f = {}, title = data.meta.title || ((data.hero.name || 'Portfolio') + (data.hero.headline ? ' — ' + data.hero.headline : ''));
    var desc = data.meta.description || String(data.hero.bio || '').slice(0, 155);
    f['index.html'] = T['index.html'].replace('<title>Portfolio</title>', function () { return '<title>' + escHtml(title) + '</title>'; })
      .replace('<meta name="description" content="">', function () { return '<meta name="description" content="' + escAttr(desc) + '">'; });
    f['admin.html'] = T['admin.html'];
    f['portfolio-data.js'] = PF.serializeDataFile(data);
    ['css/base.css', 'js/schema.js', 'js/renderer.js'].forEach(function (p) { f[p] = T[p]; });
    PF.STYLES.forEach(function (s) { f['css/themes/' + s.id + '.css'] = T['css/themes/' + s.id + '.css']; });
    f['README.txt'] = readme(data.hero.name);
    f['assets/README.txt'] = 'Optional: put extra images here and refer to them as assets/your-image.jpg in the admin page.\nImages you upload in the editor are stored inside portfolio-data.js, so this folder can stay empty.\n';
    return f;
  }

  function downloadZip(data) {
    var root = slug(data.hero.name) + '-website', zip = new window.JSZip(), files = siteFiles(data);
    Object.keys(files).forEach(function (p) { zip.file(root + '/' + p, files[p]); });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(function (b) { saveBlob(b, root + '.zip'); });
  }

  // ── draft autosave ─────────────────────────────────────────────────────
  var statusEl = $('status');
  function setStatus(t, warn) { statusEl.textContent = t; statusEl.classList.toggle('warn', !!warn); }
  function loadDraft() { try { var t = localStorage.getItem(KEY); return t ? PF.normalize(JSON.parse(t)) : null; } catch (e) { return null; } }
  var saveT;
  function saveDraft(d) {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(d)); setStatus('Draft saved in this browser'); }
      catch (e) { setStatus('Draft too big to auto-save. Use Project → Save project file.', true); }
    }, 600);
  }

  // ── editor + preview ───────────────────────────────────────────────────
  var draft = loadDraft(), preview, api;
  var startData = draft || PF.emptyData();
  var hashStyle = (location.hash.match(/style=([\w-]+)/) || [])[1];   // arrived from a theme card on the landing page
  if (hashStyle && PF.STYLES.some(function (s) { return s.id === hashStyle; })) startData.design.style = hashStyle;

  function copyOf(d) { return JSON.parse(JSON.stringify(d)); }
  function replaceAll(nd, msg) {
    var prev = copyOf(api.getData());
    api.setData(nd);
    api.toast(msg, { label: 'Undo', fn: function () { api.setData(prev); } });
  }

  function downloadPanel(a) {
    var d = a.getData(), kbSize = sizeKB(d);
    var live = d.sections.filter(function (s) { return s.visible; }).length;
    function chk(ok, text, warn) { return h('li' + (ok ? '.ok' : (warn ? '.warn' : '')), { text: text }); }
    var hasSocial = Object.keys(d.socials).some(function (k) { return d.socials[k]; });
    var btn = h('button.btn.primary.lg', { type: 'button', text: 'Download website (.zip)', onclick: function () {
      if (!d.hero.name.trim()) { a.toast('Add your name first.', { label: 'Go to You', fn: function () { a.showPanel('profile'); } }); return; }
      btn.disabled = true; btn.textContent = 'Preparing…';
      downloadZip(a.getData()).then(function () { btn.disabled = false; btn.textContent = 'Download website (.zip)'; a.toast('Downloaded. Follow the steps below to publish.'); });
    } });
    return h('div.ed-body',
      h('section.grp', h('h3', { text: 'Before you download' }),
        h('ul.checks', chk(!!d.hero.name.trim(), d.hero.name.trim() ? 'Name: ' + d.hero.name : 'Add your name on the “You” step', true),
          chk(!!d.hero.photo, d.hero.photo ? 'Profile photo added' : 'No profile photo yet. Your initials are shown instead.'),
          chk(hasSocial || !!d.contact.email, (hasSocial || d.contact.email) ? 'Contact details added' : 'No email or social links yet. Visitors won’t know how to reach you.'),
          chk(kbSize < 4000, 'Data file size: ' + (kbSize > 1024 ? (kbSize / 1024).toFixed(1) + ' MB' : kbSize + ' KB') + (kbSize >= 4000 ? ' — large images slow your site down; try smaller ones.' : ''), kbSize >= 4000)),
        h('div', btn)),
      h('section.grp', h('h3', { text: 'Then publish it' }),
        h('ol.steps',
          h('li', h('div', h('b', { text: 'Unzip the download' }), h('span', { text: 'Open index.html to see your site. It works offline from the folder. On Windows, if the zip is blocked: right-click it, choose Properties, tick Unblock, then extract again.' }))),
          h('li', h('div', h('b', { text: 'Put the folder online' }), h('span', { text: 'Drag it onto app.netlify.com/drop, or deploy it to Vercel, GitHub Pages or Cloudflare Pages. It’s plain static files.' }))),
          h('li', h('div', h('b', { text: 'Edit later from admin.html' }), h('span', { text: 'Open yoursite.com/admin.html, change anything, press Save changes, then replace portfolio-data.js with the file it downloads. You never need this generator again.' }))))),
      h('section.grp', h('h3', { text: 'What’s in the zip' }),
        h('p.grp-h', { html: '<code>index.html</code> your site · <code>admin.html</code> your editor · <code>portfolio-data.js</code> all your content and photos · <code>css/</code> and <code>js/</code> the styles and code (' + live + ' sections visible)' })));
  }

  function intro(id) {
    if (id !== 'profile') return null;
    return h('div.intro', h('p', { text: 'Fill in what you have. Anything you leave empty is simply left out of your site. Your work is saved in this browser as you go.' }),
      h('button.btn.sm', { type: 'button', text: 'Try with sample content', onclick: function () { replaceAll(window.PF_SAMPLE(), 'Sample content loaded.'); } }),
      h('p.hint', { text: 'Already have a site from this generator?' }),
      h('button.btn.sm', { type: 'button', text: 'Upload it to change the style', onclick: function () { $('import-file').click(); } }));
  }

  api = window.PFEditor.create({
    root: $('editor'), data: startData, stepper: true, intro: intro,
    extraPanels: [{ id: 'download', label: 'Download', title: 'Download your website', hint: 'Check everything looks right, then download.', render: downloadPanel }],
    onChange: function (d) { preview && preview.update(); saveDraft(d); },
    onPanel: function (id, p) { preview && preview.scrollTo(p.section); }
  });

  preview = window.PFPreview.create({
    root: $('preview'), getData: function () { return api.getData(); },
    srcdoc: function () { return inlineDoc(null); },
    standalone: function () { return inlineDoc(PF.normalize(api.getData())); }
  });

  if (/#update/.test(location.hash)) setTimeout(function () { api.toast('Choose Project → Open my site (.zip) to load the site you made before.'); }, 400);
  if (draft) setStatus('Draft restored from this browser'); else setStatus('Nothing yet. Start with your name.');

  // ── top bar ────────────────────────────────────────────────────────────
  function closeMenu() { $('menu').open = false; }
  $('go-download').addEventListener('click', function () { document.body.classList.remove('show-preview'); api.showPanel('download'); });
  $('pv-toggle').addEventListener('click', function () { var on = document.body.classList.toggle('show-preview'); this.textContent = on ? 'Edit' : 'Preview'; preview.layout(); });
  $('m-sample').addEventListener('click', function () { closeMenu(); replaceAll(window.PF_SAMPLE(), 'Sample content loaded.'); });
  $('m-reset').addEventListener('click', function () { closeMenu(); replaceAll(PF.emptyData(), 'Started over.'); });
  $('m-backup').addEventListener('click', function () { closeMenu(); saveBlob(new Blob([PF.serializeDataFile(api.getData())], { type: 'text/javascript' }), slug(api.getData().hero.name) + '-project.js'); });
  $('m-import').addEventListener('click', function () { closeMenu(); $('import-file').click(); });
  $('import-file').addEventListener('change', function () {
    var f = this.files[0], input = this; if (!f) return;
    var isZip = /\.zip$/i.test(f.name);
    (isZip ? readSiteZip(f) : f.text()).then(function (t) {
      var d = PF.parseDataFile(t); replaceAll(d, isZip ? 'Your site is loaded. Pick a new style below.' : 'Project opened.');
      if (isZip) { document.body.classList.remove('show-preview'); api.showPanel('design'); }
    }).catch(function () { api.toast(isZip ? 'No portfolio-data.js found in that zip. Use the zip you downloaded from the generator.' : 'That file isn’t a portfolio data file.'); }); input.value = '';
  });
  // A site zip we made earlier: pull portfolio-data.js out of it (wherever the folder is nested).
  function readSiteZip(file) {
    return window.JSZip.loadAsync(file).then(function (z) {
      var hit = Object.keys(z.files).filter(function (n) { return /(^|\/)portfolio-data\.js$/.test(n) && !/__MACOSX/.test(n); }).sort(function (a, b) { return a.length - b.length; })[0];
      if (!hit) throw new Error('no data'); return z.file(hit).async('string');
    });
  }
  document.addEventListener('click', function (e) { var m = $('menu'); if (m.open && !m.contains(e.target)) m.open = false; });
});
