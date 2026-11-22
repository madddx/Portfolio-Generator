/*  Shared content editor. Powers both the generator and each site's admin page.
    PFEditor.create({ root, data, onChange, onPanel, extraPanels, stepper }) → { getData, setData, showPanel, toast }  */
(function (root) {
  'use strict';
  var PF = root.PF;

  // ── tiny DOM helper: h('div.cls', {props}, ...children) ─────────────────
  function h(tag, props) {
    var parts = tag.split('.'), el = document.createElement(parts[0] || 'div'), start = 1;
    for (var i = 1; i < parts.length; i++) if (parts[i]) el.classList.add(parts[i]);
    if (props && typeof props === 'object' && !Array.isArray(props) && !(props instanceof Node)) {
      start = 2;
      Object.keys(props).forEach(function (k) {
        var v = props[k]; if (v == null || v === false) return;
        if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = true;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (function add(list) {
      for (var j = 0; j < list.length; j++) {
        var c = list[j]; if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c); else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
      }
    })([].slice.call(arguments, start));
    return el;
  }
  function trim(s) { return String(s).trim(); }
  function kb(dataUrl) { return Math.max(1, Math.round(dataUrl.length * 0.75 / 1024)); }

  // ── image processing: resize + compress so the data file stays small ────
  function processImage(file, o) {
    return new Promise(function (res, rej) {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return rej(new Error('Use a PNG, JPG or WebP image.'));
      if (file.size > 25 * 1024 * 1024) return rej(new Error('That image is over 25 MB. Pick a smaller one.'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = o.max || 1000, s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * s)), ht = Math.max(1, Math.round(img.naturalHeight * s));
        var c = document.createElement('canvas'); c.width = w; c.height = ht;
        var x = c.getContext('2d'), keepAlpha = !!o.png && file.type !== 'image/jpeg';
        if (!keepAlpha) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, ht); }
        x.drawImage(img, 0, 0, w, ht);
        res(c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.84));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That file could not be read as an image.')); };
      img.src = url;
    });
  }

  // ── panel definitions ──────────────────────────────────────────────────
  var PANELS = [
    { id: 'profile', label: 'You', title: 'About you', hint: 'The first thing visitors see: your name, photo and a short introduction.', section: 'hero' },
    { id: 'contact', label: 'Contact & links', title: 'Contact and social links', hint: 'How people can reach you. Empty fields are left out of the site.', section: 'contact' },
    { id: 'about', label: 'About', title: 'About section', hint: 'A few paragraphs, quick facts and interests.', section: 'about' },
    { id: 'experience', label: 'Experience', title: 'Experience', hint: 'Jobs, internships and leadership roles. Put the newest first.', section: 'experience' },
    { id: 'projects', label: 'Projects', title: 'Projects', hint: 'Things you’ve built. A cover image makes a project stand out.', section: 'projects' },
    { id: 'skills', label: 'Skills', title: 'Skills', hint: 'Group your skills into categories.', section: 'skills' },
    { id: 'education', label: 'Education', title: 'Education', hint: 'Schools, colleges and degrees.', section: 'education' },
    { id: 'certifications', label: 'Certifications', title: 'Certifications', hint: 'Certificates and badges, with a link to verify them.', section: 'certifications' },
    { id: 'publications', label: 'Publications', title: 'Publications', hint: 'Papers, articles and talks.', section: 'publications' },
    { id: 'awards', label: 'Awards', title: 'Awards and achievements', hint: 'Prizes, rankings and recognition.', section: 'awards' },
    { id: 'learning', label: 'Courses', title: 'Courses and learning', hint: 'Online courses and programmes you’ve completed.', section: 'learning' },
    { id: 'links', label: 'Links', title: 'Important links', hint: 'Anything else worth a click: a blog, a profile, a reading list.', section: 'links' },
    { id: 'design', label: 'Style & layout', title: 'Style and layout', hint: 'Pick a look, a colour mode and which sections appear.', group: 'Look', section: '' }
  ];

  // Each theme ships thumb.svg using {bg} {ink} {ac} placeholders; this fills in the colours for the chosen mode.
  var GENERIC_THUMB = '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="120" height="76" fill="{bg}"/><rect x="10" y="16" width="52" height="7" rx="3" fill="{ink}"/><rect x="10" y="28" width="36" height="7" rx="3" fill="{ink}"/><rect x="10" y="42" width="44" height="3" rx="1.5" fill="{ink}" opacity=".5"/><rect x="10" y="52" width="24" height="9" rx="4" fill="{ac}"/><rect x="74" y="14" width="34" height="46" rx="6" fill="{ac}" opacity=".85"/></svg>';
  function thumb(id, mode) {
    var def = PF.STYLES.filter(function (s) { return s.id === id; })[0], c = def.swatch[mode];
    return (def.thumb || GENERIC_THUMB).replace(/\{bg\}/g, c[0]).replace(/\{ink\}/g, c[1]).replace(/\{ac\}/g, c[2]);
  }
  function isNew(def) { return !!def.isNew; }   // build.mjs marks the 3 most recently added themes

  var ACCENTS = ['#2563eb', '#7a4dff', '#db2777', '#e11d48', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#0891b2', '#111827'];

  // ───────────────────────────────────────────────────────────────────────
  function create(opts) {
    var D = PF.normalize(opts.data), cur = 'profile', timer, OPEN = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
    var extra = opts.extraPanels || [];
    var all = PANELS.concat(extra.map(function (e) { return { id: e.id, label: e.label, title: e.title || e.label, hint: e.hint || '', group: e.group || 'Finish', extra: e }; }));

    var navEl = h('nav.ed-nav', { 'aria-label': 'Editor sections' });
    var mainEl = h('div.ed-main');
    var toastEl = h('div.ed-toast', { role: 'status', 'aria-live': 'polite' });
    var rootEl = h('div.ed', navEl, mainEl, toastEl);
    opts.root.appendChild(rootEl);

    function commit() { clearTimeout(timer); timer = setTimeout(function () { refreshNav(); opts.onChange && opts.onChange(D); }, 100); }

    function toast(msg, action) {
      toastEl.innerHTML = ''; toastEl.appendChild(h('span', { text: msg }));
      if (action) toastEl.appendChild(h('button.link', { type: 'button', text: action.label, onclick: function () { action.fn(); toastEl.classList.remove('show'); } }));
      toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, action ? 7000 : 3500);
    }

    // ── field builders ───────────────────────────────────────────────────
    function field(label, control, o) {
      o = o || {};
      return h('label.f' + (o.wide ? '.wide' : ''), h('span.f-l', { text: label }), control, o.hint ? h('span.f-h', { text: o.hint }) : null);
    }
    function fText(obj, key, label, o) {
      o = o || {};
      var inp = h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.type || 'text'), rows: o.rows || (o.area ? 3 : null), placeholder: o.ph || '', autocomplete: 'off', spellcheck: o.spell === false ? 'false' : null, maxlength: o.max, value: obj[key] == null ? '' : obj[key],
        oninput: function () { obj[key] = inp.value; commit(); } });
      return field(label, inp, { wide: o.wide || o.area, hint: o.hint });
    }
    function fArray(obj, key, label, o, toArr, toStr) {
      var inp = h(o.area ? 'textarea' : 'input', { type: o.area ? null : 'text', rows: o.rows || 3, placeholder: o.ph || '', autocomplete: 'off', value: toStr(obj[key] || []), oninput: function () { obj[key] = toArr(inp.value); commit(); } });
      return field(label, inp, { wide: true, hint: o.hint });
    }
    function fTags(obj, key, label, o) { return fArray(obj, key, label, o || {}, function (v) { return v.split(',').map(trim).filter(Boolean); }, function (a) { return a.join(', '); }); }
    function fLines(obj, key, label, o) { o = o || {}; o.area = true; return fArray(obj, key, label, o, function (v) { return v.split('\n').map(trim).filter(Boolean); }, function (a) { return a.join('\n'); }); }
    function fParas(obj, key, label, o) { o = o || {}; o.area = true; return fArray(obj, key, label, o, function (v) { return v.split(/\n\s*\n/).map(trim).filter(Boolean); }, function (a) { return a.join('\n\n'); }); }
    function fCheck(obj, key, label, hint) {
      var inp = h('input', { type: 'checkbox', checked: !!obj[key], onchange: function () { obj[key] = inp.checked; commit(); } });
      return h('label.check', inp, h('span', h('strong', { text: label }), hint ? h('small', { text: hint }) : null));
    }
    function fImage(obj, key, label, o) {
      o = o || {};
      var thumbEl = h('div.img-thumb'), meta = h('span.img-meta'), file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
      var rm = h('button.btn.sm.ghost', { type: 'button', text: 'Remove' });
      var url = h('input', { type: 'text', placeholder: '…or paste an image link', autocomplete: 'off', 'aria-label': label + ' link' });
      function refresh(syncUrl) {
        var v = obj[key] || '';
        thumbEl.style.backgroundImage = v ? 'url("' + v.replace(/"/g, '%22') + '")' : '';
        thumbEl.classList.toggle('has', !!v); rm.hidden = !v;
        meta.textContent = /^data:/.test(v) ? 'Uploaded · ' + kb(v) + ' KB' : (v ? 'Linked image' : (o.hint || ''));
        if (syncUrl !== false) url.value = /^data:/.test(v) ? '' : v;
      }
      function take(f) { if (!f) return; processImage(f, o).then(function (d) { obj[key] = d; refresh(); commit(); }).catch(function (e) { toast(e.message); }); }
      file.addEventListener('change', function () { take(file.files[0]); file.value = ''; });
      rm.addEventListener('click', function () { obj[key] = ''; refresh(); commit(); });
      url.addEventListener('input', function () { obj[key] = url.value.trim(); refresh(false); commit(); });
      var pick = h('button.btn.sm', { type: 'button', text: 'Upload image', onclick: function () { file.click(); } });
      var box = h('div.img-field', h('div.img-top', thumbEl, h('div.img-btns', h('div.row', pick, rm), meta)), url, file);
      ['dragover', 'dragenter'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.preventDefault(); box.classList.add('drop'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { box.addEventListener(ev, function () { box.classList.remove('drop'); }); });
      box.addEventListener('drop', function (e) { e.preventDefault(); take(e.dataTransfer && e.dataTransfer.files[0]); });
      refresh();
      return h('div.f.wide', h('span.f-l', { text: label }), box);
    }
    // small repeating rows, e.g. stats or quick facts
    function fRows(obj, key, label, cols, o) {
      o = o || {};
      var wrap = h('div.rows'), arr = obj[key];
      function draw() {
        wrap.innerHTML = '';
        arr.forEach(function (row, i) {
          var inputs = cols.map(function (c) { var inp = h('input', { type: 'text', placeholder: c.ph, 'aria-label': c.label, value: row[c.key] || '', style: c.w ? 'flex:' + c.w : null, oninput: function () { row[c.key] = inp.value; commit(); } }); return inp; });
          wrap.appendChild(h('div.row-item', inputs, h('button.icon', { type: 'button', 'aria-label': 'Remove row', text: '×', onclick: function () { arr.splice(i, 1); draw(); commit(); } })));
        });
        wrap.appendChild(h('button.btn.sm.ghost', { type: 'button', text: o.add || 'Add row', onclick: function () { var r = {}; cols.forEach(function (c) { r[c.key] = ''; }); arr.push(r); draw(); wrap.querySelectorAll('.row-item:last-of-type input')[0].focus(); commit(); } }));
      }
      draw();
      return h('div.f.wide', h('span.f-l', { text: label }), wrap, o.hint ? h('span.f-h', { text: o.hint }) : null);
    }

    // ── reorderable lists of cards ───────────────────────────────────────
    function listPanel(cfg) {
      var arr = D[cfg.key], box = h('div.list');
      function draw() {
        box.innerHTML = '';
        if (!arr.length) box.appendChild(h('div.empty', h('p', { text: cfg.empty }), h('button.btn.primary', { type: 'button', text: cfg.add, onclick: add })));
        arr.forEach(function (item, i) { box.appendChild(card(item, i)); });
        if (arr.length) box.appendChild(h('button.btn.add', { type: 'button', text: '+ ' + cfg.add, onclick: add }));
      }
      function add() { var it = cfg.blank(); arr.push(it); if (OPEN) OPEN.add(it); draw(); var last = box.querySelectorAll('.item'); last = last[last.length - 1]; var f = last && last.querySelector('input,textarea'); if (f) { last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); f.focus({ preventScroll: true }); } commit(); }
      function move(i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; draw(); commit(); }
      function remove(i) {
        var item = arr.splice(i, 1)[0]; draw(); commit();
        toast(cfg.noun + ' removed.', { label: 'Undo', fn: function () { arr.splice(i, 0, item); draw(); commit(); } });
      }
      function card(item, i) {
        var title = h('span.it-title');
        function setTitle() { var t = cfg.title(item); title.textContent = t || cfg.untitled; title.classList.toggle('is-empty', !t); }
        setTitle();
        var isOpen = OPEN ? OPEN.has(item) : true;
        var body = h('div.it-body', cfg.fields(item));
        var el = h('div.item' + (isOpen ? '.open' : ''));
        function toggle() { var o = el.classList.toggle('open'); head.setAttribute('aria-expanded', o ? 'true' : 'false'); if (OPEN) { o ? OPEN.add(item) : OPEN.delete(item); } }
        var act = function (txt, label, fn, dis) { return h('button.icon', { type: 'button', 'aria-label': label, title: label, text: txt, disabled: dis, onclick: function (e) { e.stopPropagation(); fn(); } }); };
        var head = h('div.it-head', { role: 'button', tabindex: '0', 'aria-expanded': isOpen ? 'true' : 'false', onclick: toggle, onkeydown: function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === head) { e.preventDefault(); toggle(); } } },
          h('span.it-chev', { 'aria-hidden': 'true' }), title,
          h('span.it-actions', act('↑', 'Move up', function () { move(i, -1); }, i === 0), act('↓', 'Move down', function () { move(i, 1); }, i === arr.length - 1), act('×', 'Remove ' + cfg.noun.toLowerCase(), function () { remove(i); })));
        el.appendChild(head); el.appendChild(body);
        body.addEventListener('input', setTitle);
        return el;
      }
      if (arr.length === 1 && OPEN) OPEN.add(arr[0]);
      draw();
      return box;
    }

    function group(title, hint) { return h('section.grp', title ? h('h3', { text: title }) : null, hint ? h('p.grp-h', { text: hint }) : null, [].slice.call(arguments, 2)); }
    function grid(cls) { return h('div.grid.' + cls, [].slice.call(arguments, 1)); }

    // ── panel content ────────────────────────────────────────────────────
    var CONTENT = {
      profile: function () {
        return [
          group('Basics', null,
            grid('g2', fText(D.hero, 'name', 'Full name', { ph: 'Jane Doe' }), fText(D.hero, 'headline', 'Headline', { ph: 'Full-stack developer' }),
              fText(D.hero, 'location', 'Location', { ph: 'Bengaluru, India' }), fText(D.hero, 'resume', 'Resume link', { ph: 'https://drive.google.com/…', hint: 'Adds a Resume button. Link to a PDF you’ve uploaded somewhere.' })),
            fText(D.hero, 'bio', 'Introduction', { area: true, rows: 4, ph: 'Two or three sentences about what you do and what you’re looking for.', hint: 'Shown under your name.' })),
          group('Photo', null, fImage(D.hero, 'photo', 'Profile photo', { max: 900, hint: 'A portrait works best. It’s resized automatically.' })),
          group('Extras', 'Optional touches for the top of your site.',
            fLines(D.hero, 'typed', 'Rotating titles', { rows: 3, ph: 'Full-stack developer\nData engineer', hint: 'One per line. With two or more, your headline types through them.' }),
            fTags(D.hero, 'badges', 'Badges', { ph: 'AWS certified, Hackathon winner', hint: 'Separate with commas.' }),
            fRows(D.hero, 'stats', 'Highlights', [{ key: 'num', label: 'Number', ph: '12', w: 1 }, { key: 'label', label: 'Label', ph: 'Projects shipped', w: 3 }], { add: 'Add highlight' }))
        ];
      },
      contact: function () {
        return [
          group('Contact details', null,
            grid('g2', fText(D.contact, 'email', 'Email', { type: 'email', ph: 'you@example.com' }), fText(D.contact, 'phone', 'Phone', { ph: '+91 90000 00000' }), fText(D.contact, 'location', 'Location', { ph: 'Bengaluru, India' })),
            fText(D.contact, 'intro', 'Message to visitors', { area: true, rows: 3, ph: 'I’m open to internships starting early next year. Write to me.' }),
            fCheck(D.contact, 'form', 'Show a contact form', 'Visitors fill it in and it opens their email app addressed to you. Needs your email above.')),
          group('Social links', 'Paste the full address of each profile. Leave blank to skip.',
            grid('g2', PF.SOCIALS.map(function (s) { return fText(D.socials, s.id, s.label, { ph: s.ph, spell: false }); })))
        ];
      },
      about: function () {
        return [
          group('Your story', null, fParas(D.about, 'paragraphs', 'Paragraphs', { rows: 8, ph: 'Write a few short paragraphs.\n\nLeave a blank line between paragraphs.', hint: 'Leave a blank line between paragraphs.' })),
          group('Quick facts', null, fRows(D.about, 'facts', 'Facts', [{ key: 'label', label: 'Label', ph: 'Based in', w: 1 }, { key: 'value', label: 'Value', ph: 'Bengaluru, India', w: 2 }], { add: 'Add fact' })),
          group('Interests', null, fTags(D.about, 'interests', 'Interests', { ph: 'Data pipelines, Chess, Teaching', hint: 'Separate with commas.' }))
        ];
      },
      experience: function () { return [listPanel({ key: 'experience', noun: 'Role', add: 'Add a role', empty: 'No experience yet. Add a job, internship or leadership role.', untitled: 'New role', title: function (i) { return [i.role, i.org].filter(Boolean).join(' · '); },
        blank: function () { return { role: '', org: '', link: '', period: '', bullets: [] }; },
        fields: function (i) { return [grid('g2', fText(i, 'role', 'Role', { ph: 'Data engineering intern' }), fText(i, 'org', 'Organisation', { ph: 'Brightwave Analytics' }), fText(i, 'period', 'Dates', { ph: 'Jun 2026 — Aug 2026' }), fText(i, 'link', 'Organisation link', { ph: 'https://…', spell: false })), fLines(i, 'bullets', 'What you did', { rows: 4, ph: 'One achievement per line', hint: 'One point per line. Numbers help: “cut runtime from 95 to 22 minutes”.' })]; } })]; },
      projects: function () { return [listPanel({ key: 'projects', noun: 'Project', add: 'Add a project', empty: 'No projects yet. Add the first thing you’re proud of.', untitled: 'New project', title: function (i) { return i.title; },
        blank: function () { return { title: '', desc: '', img: '', tags: [], link: '', demo: '' }; },
        fields: function (i) { return [grid('g2', fText(i, 'title', 'Title', { ph: 'Tracewell' }), fTags(i, 'tags', 'Tags', { ph: 'React, Node.js', hint: 'Separate with commas.' })), fText(i, 'desc', 'Description', { area: true, rows: 3, ph: 'What it does and why it matters.' }), fImage(i, 'img', 'Cover image', { max: 1000, hint: 'Wide images (16:10) look best.' }), grid('g2', fText(i, 'link', 'Code or details link', { ph: 'https://github.com/…', spell: false }), fText(i, 'demo', 'Live demo link', { ph: 'https://…', spell: false }))]; } })]; },
      skills: function () { return [listPanel({ key: 'skills', noun: 'Category', add: 'Add a category', empty: 'No skills yet. Start with a category such as Languages.', untitled: 'New category', title: function (i) { return i.category; },
        blank: function () { return { category: '', items: [] }; },
        fields: function (i) { return [fText(i, 'category', 'Category name', { ph: 'Languages' }), fTags(i, 'items', 'Skills', { ph: 'Python, JavaScript, SQL', hint: 'Separate with commas. Common tools such as Python or React get an icon automatically.' })]; } })]; },
      education: function () { return [listPanel({ key: 'education', noun: 'School', add: 'Add a school', empty: 'No education yet. Add your college or school.', untitled: 'New school', title: function (i) { return i.institution; },
        blank: function () { return { institution: '', link: '', degree: '', period: '', logo: '', courses: [] }; },
        fields: function (i) { return [grid('g2', fText(i, 'institution', 'Institution', { ph: 'Northfield Institute of Technology' }), fText(i, 'degree', 'Degree or programme', { ph: 'B.Tech — Computer Science' }), fText(i, 'period', 'Dates', { ph: '2023 — 2027' }), fText(i, 'link', 'Website', { ph: 'https://…', spell: false })), fTags(i, 'courses', 'Key subjects', { ph: 'Algorithms, Databases', hint: 'Separate with commas.' }), fImage(i, 'logo', 'Logo', { max: 256, png: true, hint: 'Optional. A square logo works best.' })]; } })]; },
      certifications: function () { return [listPanel({ key: 'certifications', noun: 'Certification', add: 'Add a certification', empty: 'No certifications yet.', untitled: 'New certification', title: function (i) { return i.name; },
        blank: function () { return { name: '', issuer: '', img: '', link: '' }; },
        fields: function (i) { return [grid('g2', fText(i, 'name', 'Name', { ph: 'Azure Fundamentals (AZ-900)' }), fText(i, 'issuer', 'Issued by', { ph: 'Microsoft' }), fText(i, 'link', 'Credential link', { ph: 'https://…', spell: false })), fImage(i, 'img', 'Badge or logo', { max: 256, png: true })]; } })]; },
      publications: function () { return [listPanel({ key: 'publications', noun: 'Publication', add: 'Add a publication', empty: 'No publications yet.', untitled: 'New publication', title: function (i) { return i.title; },
        blank: function () { return { title: '', venue: '', year: '', link: '' }; },
        fields: function (i) { return [fText(i, 'title', 'Title', { ph: 'Cheaper schema-drift detection for batch pipelines' }), grid('g2', fText(i, 'venue', 'Where it appeared', { ph: 'IEEE Xplore' }), fText(i, 'year', 'Year', { ph: '2026' }), fText(i, 'link', 'Link', { ph: 'https://…', spell: false }))]; } })]; },
      awards: function () { return [listPanel({ key: 'awards', noun: 'Award', add: 'Add an award', empty: 'No awards yet.', untitled: 'New award', title: function (i) { return i.title; },
        blank: function () { return { icon: '🏆', title: '', detail: '', link: '' }; },
        fields: function (i) { return [grid('g3', fText(i, 'icon', 'Emoji', { ph: '🏆', max: 4 }), fText(i, 'title', 'Award', { ph: 'First place, Hack 2025' }), fText(i, 'detail', 'Detail', { ph: '120 teams' })), fText(i, 'link', 'Link', { ph: 'https://…', spell: false })]; } })]; },
      learning: function () { return [listPanel({ key: 'learning', noun: 'Course', add: 'Add a course', empty: 'No courses yet.', untitled: 'New course', title: function (i) { return i.title; },
        blank: function () { return { title: '', platform: '', img: '', link: '' }; },
        fields: function (i) { return [grid('g2', fText(i, 'title', 'Course', { ph: 'Distributed Systems' }), fText(i, 'platform', 'Platform', { ph: 'Coursera' }), fText(i, 'link', 'Certificate link', { ph: 'https://…', spell: false })), fImage(i, 'img', 'Logo', { max: 256, png: true })]; } })]; },
      links: function () { return [listPanel({ key: 'links', noun: 'Link', add: 'Add a link', empty: 'No links yet.', untitled: 'New link', title: function (i) { return i.title || i.url; },
        blank: function () { return { title: '', desc: '', url: '' }; },
        fields: function (i) { return [grid('g2', fText(i, 'title', 'Title', { ph: 'Blog' }), fText(i, 'url', 'Address', { ph: 'https://…', spell: false })), fText(i, 'desc', 'Short description', { ph: 'Notes on pipelines and performance' })]; } })]; },
      design: designPanel
    };

    function designPanel() {
      var styleBox = h('div.styles', { role: 'radiogroup', 'aria-label': 'Style' });
      function previewMode() { return D.design.mode === 'dark' ? 'dark' : (D.design.mode === 'light' ? 'light' : (root.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); }
      function drawStyles() {
        styleBox.innerHTML = '';
        PF.STYLES.forEach(function (s) {
          var on = D.design.style === s.id;
          styleBox.appendChild(h('button.style' + (on ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', onclick: function () { D.design.style = s.id; drawStyles(); commit(); } },
            h('span.style-art', { html: thumb(s.id, previewMode()) }), h('span.style-name', { text: s.name }, isNew(s) ? h('span.pill.new', { text: 'New' }) : null), h('span.style-blurb', { text: s.blurb })));
        });
      }
      drawStyles();
      var modes = [['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']], seg = h('div.seg', { role: 'radiogroup', 'aria-label': 'Colour mode' });
      function drawModes() { seg.innerHTML = ''; modes.forEach(function (m) { seg.appendChild(h('button' + (D.design.mode === m[0] ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': D.design.mode === m[0] ? 'true' : 'false', text: m[1], onclick: function () { D.design.mode = m[0]; drawModes(); drawStyles(); commit(); } })); }); }
      drawModes();

      var def = function () { return PF.STYLES.filter(function (s) { return s.id === D.design.style; })[0]; };
      var color = h('input', { type: 'color', 'aria-label': 'Accent colour', value: D.design.accent || def().accent[previewMode()], oninput: function () { D.design.accent = color.value; drawSw(); commit(); } });
      var sw = h('div.swatches');
      function drawSw() { sw.innerHTML = ''; ACCENTS.forEach(function (a) { sw.appendChild(h('button.sw' + (D.design.accent.toLowerCase() === a ? '.on' : ''), { type: 'button', 'aria-label': 'Accent ' + a, style: 'background:' + a, onclick: function () { D.design.accent = a; color.value = a; drawSw(); commit(); } })); }); }
      drawSw();
      var reset = h('button.btn.sm.ghost', { type: 'button', text: 'Use the style’s own colour', onclick: function () { D.design.accent = ''; color.value = def().accent[previewMode()]; drawSw(); commit(); } });

      // sections
      var secBox = h('div.secs');
      function hasContent(id) {
        var d = D;
        if (id === 'about') return d.about.paragraphs.length || d.about.facts.some(function (f) { return f.value; }) || d.about.interests.length;
        if (id === 'contact') return d.contact.email || d.contact.phone || d.contact.location || d.contact.intro;
        var a = d[id === 'learning' ? 'learning' : id]; return Array.isArray(a) && a.some(function (x) { return Object.keys(x).some(function (k) { return k !== 'icon' && x[k] && (!Array.isArray(x[k]) || x[k].length); }); });
      }
      function drawSecs() {
        secBox.innerHTML = '';
        D.sections.forEach(function (s, i) {
          var empty = !hasContent(s.id);
          var move = function (dn) { var j = i + dn; if (j < 0 || j >= D.sections.length) return; var t = D.sections[i]; D.sections[i] = D.sections[j]; D.sections[j] = t; drawSecs(); commit(); };
          var vis = h('input', { type: 'checkbox', checked: s.visible, 'aria-label': 'Show ' + s.title, onchange: function () { s.visible = vis.checked; row.classList.toggle('off', !s.visible); commit(); } });
          var title = h('input', { type: 'text', value: s.title, 'aria-label': 'Heading for ' + s.id, oninput: function () { s.title = title.value || s.title; commit(); } });
          var row = h('div.sec-row' + (s.visible ? '' : '.off'), vis, title, empty ? h('span.pill', { text: 'Empty · hidden' }) : null,
            h('span.it-actions', h('button.icon', { type: 'button', text: '↑', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(-1); } }), h('button.icon', { type: 'button', text: '↓', 'aria-label': 'Move down', disabled: i === D.sections.length - 1, onclick: function () { move(1); } })));
          secBox.appendChild(row);
        });
      }
      drawSecs();

      return [
        group('Style', 'Each style is a different layout and personality. Your content stays the same.', styleBox),
        group('Colour mode', null, seg, h('div.sp'), fCheck(D.design, 'toggle', 'Let visitors switch between light and dark', 'Adds a toggle button to the navigation bar.')),
        group('Accent colour', 'Used for buttons, links and highlights.', h('div.accent-row', color, sw, reset)),
        group('Sections', 'Choose the order, rename headings, or hide a section. Sections with no content are hidden automatically.', secBox),
        group('Page details', null, grid('g2', fText(D.meta, 'title', 'Browser tab title', { ph: 'Jane Doe — Full-stack developer', hint: 'Leave blank to use your name and headline.' }), fText(D.meta, 'year', 'Footer year', { ph: String(new Date().getFullYear()), hint: 'Leave blank to use the current year.' })),
          fText(D.meta, 'description', 'Search description', { area: true, rows: 2, ph: 'Shown in search results. Leave blank to use your introduction.' }))
      ];
    }

    // ── navigation ───────────────────────────────────────────────────────
    function count(id) {
      var a = D[id];
      if (Array.isArray(a)) return a.filter(function (x) { return Object.keys(x).some(function (k) { return x[k] && (!Array.isArray(x[k]) || x[k].length) && k !== 'icon'; }); }).length || '';
      if (id === 'profile') return D.hero.name ? '✓' : '';
      if (id === 'contact') return (D.contact.email || D.contact.phone || Object.keys(D.socials).some(function (k) { return D.socials[k]; })) ? '✓' : '';
      if (id === 'about') return D.about.paragraphs.length ? '✓' : '';
      return '';
    }
    function refreshNav() {
      [].slice.call(navEl.querySelectorAll('[data-count]')).forEach(function (el) { el.textContent = count(el.getAttribute('data-count')); });
    }
    function drawNav() {
      navEl.innerHTML = ''; var lastGroup = null;
      all.forEach(function (p) {
        var g = p.group || 'Content';
        if (g !== lastGroup) { navEl.appendChild(h('div.ed-group', { text: g })); lastGroup = g; }
        navEl.appendChild(h('button.ed-link' + (p.id === cur ? '.on' : ''), { type: 'button', 'data-id': p.id, 'aria-current': p.id === cur ? 'page' : null, onclick: function () { showPanel(p.id); } },
          h('span', { text: p.label }), h('span.ed-count', { 'data-count': p.id, text: count(p.id) })));
      });
    }

    function showPanel(id, silent) {
      var p = all.filter(function (x) { return x.id === id; })[0]; if (!p) return;
      cur = id; drawNav(); mainEl.innerHTML = '';
      var head = h('header.ed-head', h('h2', { text: p.title }), p.hint ? h('p', { text: p.hint }) : null);
      var body = p.extra ? p.extra.render(api) : h('div.ed-body', CONTENT[id]());
      mainEl.appendChild(head);
      var intro = opts.intro && opts.intro(id, api); if (intro) mainEl.appendChild(intro);
      mainEl.appendChild(body);
      if (opts.stepper) {
        var i = all.indexOf(p), prev = all[i - 1], next = all[i + 1];
        mainEl.appendChild(h('footer.ed-foot', prev ? h('button.btn.ghost', { type: 'button', text: '← ' + prev.label, onclick: function () { showPanel(prev.id); } }) : h('span'),
          next ? h('button.btn.primary', { type: 'button', text: 'Next: ' + next.label + ' →', onclick: function () { showPanel(next.id); } }) : null));
      }
      mainEl.scrollTop = 0;
      if (!silent && opts.onPanel) opts.onPanel(id, p);
    }

    var api = {
      getData: function () { return D; },
      setData: function (nd) { D = PF.normalize(nd); showPanel(cur, true); if (opts.onChange) opts.onChange(D); },
      showPanel: showPanel, toast: toast, el: rootEl, h: h, current: function () { return cur; }
    };
    showPanel(opts.start || 'profile', true);
    return api;
  }

  root.PFEditor = { create: create, panels: PANELS, h: h };
})(window);
