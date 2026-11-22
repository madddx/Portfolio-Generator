/*  Portfolio renderer. Reads window.PORTFOLIO_DATA and builds the page.
    Also listens for live updates from the admin / generator preview.      */
(function () {
  'use strict';
  var PF = window.PF;
  var DATA = null, previewing = false, lastDesignMode = null, modeOverride = null, typingTimer = null, lastHTML = '';

  // ── helpers ────────────────────────────────────────────────────────────
  var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ENT[c]; }); }
  var FILE_EXT = /\.(html?|pdf|png|jpe?g|webp|gif|svg|docx?|txt)$/i;
  function href(u) {
    var s = String(u || '').trim();
    if (!s || /^(javascript|vbscript|data|file):/i.test(s)) return '';
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}([\/?#:]|$)/i.test(s) && !FILE_EXT.test(s.split(/[?#]/)[0])) return 'https://' + s;
    return s;
  }
  function imgSrc(u) {
    var s = String(u || '').trim();
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+\/=]+$/i.test(s)) return s;
    return /^data:/i.test(s) ? '' : href(s);
  }
  function img(u, alt, cls) {
    var s = imgSrc(u);
    return s ? '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(s) + '" alt="' + esc(alt || '') + '"' + (/^data:/.test(s) ? '' : ' loading="lazy"') + '>' : '';
  }
  function link(u, cls, inner, extra) {
    var h = href(u);
    return h ? '<a class="' + cls + '" href="' + esc(h) + '" target="_blank" rel="noopener noreferrer"' + (extra || '') + '>' + inner + '</a>'
             : '<div class="' + cls + '">' + inner + '</div>';
  }
  function has(v) { return String(v == null ? '' : v).trim() !== ''; }
  function list(a) { return Array.isArray(a) ? a : []; }
  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '·';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function styleDef(id) { return PF.STYLES.filter(function (s) { return s.id === id; })[0] || PF.STYLES[0]; }

  // ── colour helpers (for user-chosen accent colours) ─────────────────────
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function lum(hex) {
    var c = rgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function mix(hex, to, t) {
    var a = rgb(hex), b = rgb(to);
    return '#' + a.map(function (v, i) { return ('0' + Math.round(v + (b[i] - v) * t).toString(16)).slice(-2); }).join('');
  }

  // ── theme / mode ───────────────────────────────────────────────────────
  function setActiveTheme(id) {
    [].slice.call(document.querySelectorAll('[data-theme-css]')).forEach(function (el) {
      var on = el.getAttribute('data-theme-css') === id;
      if (el.tagName === 'STYLE') el.media = on ? 'all' : 'not all'; else el.disabled = !on;
    });
  }
  function ensureTheme(id, done) {
    if (document.querySelector('[data-theme-css="' + id + '"]')) { setActiveTheme(id); return done(); }
    var l = document.createElement('link'), fired = false;
    l.rel = 'stylesheet'; l.href = 'css/themes/' + id + '.css'; l.setAttribute('data-theme-css', id);
    function fin() { if (fired) return; fired = true; setActiveTheme(id); done(); }
    l.onload = fin; l.onerror = fin; setTimeout(fin, 2500);
    document.head.appendChild(l);
  }
  function ensureFonts(def) {
    var l = document.getElementById('pf-fonts');
    if (!l) { l = document.createElement('link'); l.id = 'pf-fonts'; l.rel = 'stylesheet'; document.head.appendChild(l); }
    var url = 'https://fonts.googleapis.com/css2?' + def.fonts + '&display=swap';
    if (l.getAttribute('href') !== url) l.setAttribute('href', url);
  }
  function resolveMode(d) {
    var m = d.design.mode;
    if (d.design.toggle) {
      var pref = modeOverride;
      if (!previewing) { try { pref = localStorage.getItem('pf-mode'); } catch (e) {} }
      if (pref === 'light' || pref === 'dark') m = pref;
    }
    if (m === 'auto') m = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return m;
  }
  function applyAppearance(d) {
    var root = document.documentElement, mode = resolveMode(d), a = d.design.accent;
    root.setAttribute('data-style', d.design.style);
    root.setAttribute('data-mode', mode);
    if (/^#[0-9a-f]{6}$/i.test(a)) {
      var L = lum(a);
      root.style.setProperty('--accent', a);
      root.style.setProperty('--accent-ink', L > 0.4 ? '#0b0b0b' : '#ffffff');
      // accent used as *text* needs contrast against the page background
      root.style.setProperty('--accent-text', mode === 'light' ? (L > 0.28 ? mix(a, '#000000', 0.5) : a) : (L < 0.22 ? mix(a, '#ffffff', 0.55) : a));
    } else {
      ['--accent', '--accent-ink', '--accent-text'].forEach(function (p) { root.style.removeProperty(p); });
    }
    var toggle = document.getElementById('mode-toggle');
    if (toggle) toggle.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // ── section content ────────────────────────────────────────────────────
  var FILTER = {
    education: function (x) { return has(x.institution) || has(x.degree); },
    experience: function (x) { return has(x.org) || has(x.role); },
    projects: function (x) { return has(x.title); },
    skills: function (x) { return has(x.category) || list(x.items).length; },
    certifications: function (x) { return has(x.name); },
    publications: function (x) { return has(x.title); },
    awards: function (x) { return has(x.title); },
    learning: function (x) { return has(x.title); },
    links: function (x) { return has(x.title) || has(x.url); }
  };
  function items(d, key) { return list(d[key]).filter(FILTER[key]); }

  function hasContent(d, id) {
    if (id === 'about') return d.about.paragraphs.some(has) || d.about.facts.some(function (f) { return has(f.value); }) || d.about.interests.some(has);
    if (id === 'contact') return has(d.contact.email) || has(d.contact.phone) || has(d.contact.location) || has(d.contact.intro);
    return items(d, id).length > 0;
  }

  var BUILD = {
    about: function (d) {
      var a = d.about, facts = a.facts.filter(function (f) { return has(f.value); });
      return '<div class="about-grid"><div class="prose">' + a.paragraphs.filter(has).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
        '<div class="about-side">' +
        (facts.length ? '<dl class="facts">' + facts.map(function (f) { return '<div><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>'; }).join('') + '</dl>' : '') +
        (a.interests.filter(has).length ? '<ul class="chips chips--interests">' + a.interests.filter(has).map(function (t) { return '<li class="chip">' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
        '</div></div>';
    },
    experience: function (d) {
      return '<ol class="timeline">' + items(d, 'experience').map(function (e) {
        var org = has(e.link) ? link(e.link, 'tl-org', esc(e.org)) : '<span class="tl-org">' + esc(e.org) + '</span>';
        return '<li class="tl-item"><div class="tl-head"><h3 class="tl-role">' + esc(e.role || e.org) + '</h3>' + (has(e.role) && has(e.org) ? org : '') +
          (has(e.period) ? '<span class="tl-period">' + esc(e.period) + '</span>' : '') + '</div>' +
          (list(e.bullets).filter(has).length ? '<ul class="tl-bullets">' + e.bullets.filter(has).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
      }).join('') + '</ol>';
    },
    projects: function (d) {
      return '<div class="proj-grid">' + items(d, 'projects').map(function (p) {
        var im = img(p.img, p.title), isGit = /github\.com|gitlab\.com/i.test(p.link || '');
        var links = (has(p.link) ? link(p.link, 'btn-link', esc(isGit ? 'View code' : 'View project') + ' <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>') : '') +
                    (has(p.demo) ? link(p.demo, 'btn-link', 'Live demo <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>') : '');
        return '<article class="proj-card' + (im ? '' : ' proj-card--noimg') + '">' + (im ? '<div class="proj-img">' + im + '</div>' : '') +
          '<div class="proj-body"><h3>' + esc(p.title) + '</h3>' + (has(p.desc) ? '<p>' + esc(p.desc) + '</p>' : '') +
          (list(p.tags).filter(has).length ? '<ul class="tags">' + p.tags.filter(has).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
          (links ? '<div class="proj-links">' + links + '</div>' : '') + '</div></article>';
      }).join('') + '</div>';
    },
    skills: function (d) {
      return '<div class="skill-groups">' + items(d, 'skills').map(function (g) {
        return '<div class="skill-group">' + (has(g.category) ? '<h3>' + esc(g.category) + '</h3>' : '') +
          '<ul class="chips">' + list(g.items).filter(has).map(function (n) {
            var ic = PF.skillIcon(n);
            return '<li class="chip chip--skill">' + (ic ? '<i class="' + ic + '" aria-hidden="true"></i>' : '') + esc(n) + '</li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div>';
    },
    education: function (d) {
      return '<div class="edu-list">' + items(d, 'education').map(function (e) {
        var logo = img(e.logo, e.institution);
        var name = has(e.link) ? link(e.link, 'edu-name', esc(e.institution)) : '<span class="edu-name">' + esc(e.institution) + '</span>';
        return '<article class="edu-item">' + (logo ? '<div class="edu-logo">' + logo + '</div>' : '') + '<div class="edu-info"><h3>' + name + '</h3>' +
          (has(e.degree) ? '<p class="edu-degree">' + esc(e.degree) + '</p>' : '') + (has(e.period) ? '<p class="edu-period">' + esc(e.period) + '</p>' : '') +
          (list(e.courses).filter(has).length ? '<ul class="tags">' + e.courses.filter(has).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : '') +
          '</div></article>';
      }).join('') + '</div>';
    },
    certifications: function (d) {
      return '<div class="cert-grid">' + items(d, 'certifications').map(function (c) {
        var im = img(c.img, c.issuer || c.name);
        return link(c.link, 'cert-card', (im ? '<span class="cert-logo">' + im + '</span>' : '') +
          '<span class="cert-text"><strong>' + esc(c.name) + '</strong>' + (has(c.issuer) ? '<span>' + esc(c.issuer) + '</span>' : '') + '</span>');
      }).join('') + '</div>';
    },
    publications: function (d) {
      return '<ul class="pub-list">' + items(d, 'publications').map(function (p) {
        var inner = (has(p.year) ? '<span class="pub-year">' + esc(p.year) + '</span>' : '') +
          '<span class="pub-text"><strong>' + esc(p.title) + '</strong>' + (has(p.venue) ? '<span>' + esc(p.venue) + '</span>' : '') + '</span>';
        return '<li>' + link(p.link, 'pub', inner) + '</li>';
      }).join('') + '</ul>';
    },
    awards: function (d) {
      return '<div class="award-grid">' + items(d, 'awards').map(function (a) {
        return link(a.link, 'award', '<span class="award-icon" aria-hidden="true">' + esc(a.icon || '🏆') + '</span><span class="award-text"><strong>' + esc(a.title) + '</strong>' +
          (has(a.detail) ? '<span>' + esc(a.detail) + '</span>' : '') + '</span>');
      }).join('') + '</div>';
    },
    learning: function (d) {
      return '<div class="cert-grid">' + items(d, 'learning').map(function (c) {
        var im = img(c.img, c.platform || c.title);
        return link(c.link, 'cert-card', (im ? '<span class="cert-logo">' + im + '</span>' : '') +
          '<span class="cert-text"><strong>' + esc(c.title) + '</strong>' + (has(c.platform) ? '<span>' + esc(c.platform) + '</span>' : '') + '</span>');
      }).join('') + '</div>';
    },
    links: function (d) {
      return '<div class="link-grid">' + items(d, 'links').map(function (l) {
        return link(l.url, 'link-card', '<span class="link-icon"><i class="' + PF.urlIcon(l.url) + '" aria-hidden="true"></i></span><span class="link-text"><strong>' + esc(l.title || l.url) + '</strong>' +
          (has(l.desc) ? '<span>' + esc(l.desc) + '</span>' : '') + '</span>');
      }).join('') + '</div>';
    },
    contact: function (d) {
      var c = d.contact, rows = [];
      if (has(c.email)) rows.push(['fas fa-envelope', 'Email', '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>']);
      if (has(c.phone)) rows.push(['fas fa-phone', 'Phone', '<a href="tel:' + esc(String(c.phone).replace(/[^+\d]/g, '')) + '">' + esc(c.phone) + '</a>']);
      if (has(c.location)) rows.push(['fas fa-location-dot', 'Location', esc(c.location)]);
      var form = c.form && has(c.email) ?
        '<form class="contact-form" data-mailto><h3>Send a message</h3>' +
        '<label>Name<input name="name" required autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label>' +
        '<label>Message<textarea name="message" rows="5" required></textarea></label><button type="submit" class="btn btn--primary">Send message</button></form>' : '';
      return '<div class="contact-grid' + (form ? '' : ' contact-grid--solo') + '"><div class="contact-info">' + (has(c.intro) ? '<p class="prose">' + esc(c.intro) + '</p>' : '') +
        '<ul class="contact-items">' + rows.map(function (r) {
          return '<li><span class="ci-icon"><i class="' + r[0] + '" aria-hidden="true"></i></span><span class="ci-text"><span class="ci-label">' + r[1] + '</span>' + r[2] + '</span></li>';
        }).join('') + '</ul></div>' + form + '</div>';
    }
  };

  function socialsHTML(d, cls) {
    var out = PF.SOCIALS.filter(function (s) { return has(d.socials[s.id]) && href(d.socials[s.id]); }).map(function (s) {
      return '<a class="social" href="' + esc(href(d.socials[s.id])) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(s.label) + '" title="' + esc(s.label) + '"><i class="' + s.icon + '" aria-hidden="true"></i></a>';
    });
    if (has(d.contact.email)) out.push('<a class="social" href="mailto:' + esc(d.contact.email) + '" aria-label="Email" title="Email"><i class="fas fa-envelope" aria-hidden="true"></i></a>');
    return out.length ? '<div class="' + cls + '">' + out.join('') + '</div>' : '';
  }

  // ── page ───────────────────────────────────────────────────────────────
  function buildPage(d) {
    var h = d.hero, name = h.name || 'Your name';
    var live = d.sections.filter(function (s) { return s.visible && hasContent(d, s.id); });
    var phrases = list(h.typed).filter(has);
    var role = has(h.headline) ? h.headline : (phrases[0] || '');
    var photo = img(h.photo, name);
    var resume = href(h.resume);
    var hasProj = live.some(function (s) { return s.id === 'projects'; }), hasContact = live.some(function (s) { return s.id === 'contact'; });

    var nav = '<header class="site-nav" id="top"><div class="nav-inner">' +
      '<a class="brand" href="#hero" aria-label="' + esc(name) + ' — top of page"><span class="brand-mark">' + esc(initials(name)) + '</span><span class="brand-name">' + esc(name) + '</span></a>' +
      '<nav class="nav-links" id="nav-links" aria-label="Sections">' + live.map(function (s) { return '<a href="#' + s.id + '" data-nav="' + s.id + '">' + esc(s.title) + '</a>'; }).join('') + '</nav>' +
      '<div class="nav-tools">' + (resume ? '<a class="btn btn--small" href="' + esc(resume) + '" target="_blank" rel="noopener noreferrer">Resume</a>' : '') +
      (d.design.toggle ? '<button type="button" class="icon-btn" id="mode-toggle" aria-label="Toggle colour mode"><i class="fas fa-circle-half-stroke" aria-hidden="true"></i></button>' : '') +
      '<button type="button" class="icon-btn nav-burger" id="nav-burger" aria-label="Menu" aria-expanded="false"><i class="fas fa-bars" aria-hidden="true"></i></button></div></div></header>';

    var stats = list(h.stats).filter(function (s) { return has(s.num); });
    var hero = '<section id="hero" class="hero"><div class="hero-inner"><div class="hero-text">' +
      (has(h.location) ? '<p class="hero-kicker"><i class="fas fa-location-dot" aria-hidden="true"></i> ' + esc(h.location) + '</p>' : '') +
      '<h1 class="hero-name">' + esc(name) + '</h1>' +
      (role || phrases.length > 1 ? '<p class="hero-role"><span id="typed" data-phrases="' + esc(JSON.stringify(phrases.length > 1 ? phrases : [role])) + '">' + esc(phrases.length > 1 ? phrases[0] : role) + '</span>' + (phrases.length > 1 ? '<span class="caret" aria-hidden="true"></span>' : '') + '</p>' : '') +
      (has(h.bio) ? '<p class="hero-bio">' + esc(h.bio) + '</p>' : '') +
      (list(h.badges).filter(has).length ? '<ul class="badges">' + h.badges.filter(has).map(function (b) { return '<li class="badge">' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
      (stats.length ? '<dl class="hero-stats">' + stats.map(function (s) { return '<div><dt>' + esc(s.label) + '</dt><dd>' + esc(s.num) + '</dd></div>'; }).join('') + '</dl>' : '') +
      '<div class="hero-cta">' + (hasProj ? '<a class="btn btn--primary" href="#projects">See my work</a>' : '') + (hasContact ? '<a class="btn" href="#contact">Get in touch</a>' : '') + '</div>' +
      socialsHTML(d, 'hero-socials') + '</div>' +
      '<figure class="hero-photo' + (photo ? '' : ' hero-photo--mono') + '">' + (photo ? img(h.photo, name) : '<span aria-hidden="true">' + esc(initials(name)) + '</span>') + '</figure></div></section>';

    var body = live.map(function (s) {
      return '<section id="' + s.id + '" class="section section--' + s.id + '"><div class="section-inner"><h2 class="sec-title">' + esc(s.title) + '</h2><div class="sec-body">' + BUILD[s.id](d) + '</div></div></section>';
    }).join('');

    var year = d.meta.year || new Date().getFullYear();
    var footer = '<footer class="site-footer"><div class="footer-inner"><span>© ' + esc(year) + ' ' + esc(name) + '</span>' + socialsHTML(d, 'footer-socials') + '</div></footer>';
    return nav + '<main>' + hero + body + '</main>' + footer;
  }

  function startTyping() {
    clearTimeout(typingTimer);
    var el = document.getElementById('typed');
    if (!el) return;
    var phrases; try { phrases = JSON.parse(el.getAttribute('data-phrases')); } catch (e) { return; }
    if (!phrases || phrases.length < 2) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var p = 0, c = phrases[0].length, del = true;
    function tick() {
      if (del) {
        c--; el.textContent = phrases[p].slice(0, c);
        if (c <= 0) { del = false; p = (p + 1) % phrases.length; typingTimer = setTimeout(tick, 350); return; }
        typingTimer = setTimeout(tick, 40); return;
      }
      c++; el.textContent = phrases[p].slice(0, c);
      if (c >= phrases[p].length) { del = true; typingTimer = setTimeout(tick, 2000); return; }
      typingTimer = setTimeout(tick, 80);
    }
    typingTimer = setTimeout(tick, 2000);
  }

  function setMeta(d) {
    var h = d.hero, title = d.meta.title || ((h.name || 'Portfolio') + (has(h.headline) ? ' — ' + h.headline : ''));
    document.title = title;
    var desc = d.meta.description || String(h.bio || '').slice(0, 155);
    var m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', desc);
    var fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2563eb';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="' + bg + '"/><text x="32" y="42" font-family="sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="#fff">' + initials(h.name) + '</text></svg>';
    fav.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function render(raw) {
    var d = PF.normalize(raw);
    var def = styleDef(d.design.style);
    DATA = d;
    ensureFonts(def);
    ensureTheme(def.id, function () {
      applyAppearance(d);
      var app = document.getElementById('app'), html = buildPage(d);
      if (html !== lastHTML) {
        var y = window.scrollY;
        app.innerHTML = html; lastHTML = html;
        if (previewing) window.scrollTo(0, y);
        startTyping(); watchSections();
      }
      fitNav(); setTimeout(fitNav, 350);   // again once the new style's fonts have changed the text widths
      setMeta(d);
      document.documentElement.classList.remove('pf-loading');
    });
  }

  // Collapse the nav into a menu button when the links can't fit on one line.
  function fitNav() {
    var h = document.querySelector('.site-nav'), l = document.getElementById('nav-links');
    if (!h || !l) return;
    h.classList.remove('nav-compact');
    if (window.innerWidth <= 960 || l.scrollWidth > l.clientWidth + 1) h.classList.add('nav-compact');
  }
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(fitNav, 80); });
  if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(fitNav); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitNav); }

  // ── interactions ───────────────────────────────────────────────────────
  var observer = null;
  function watchSections() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        [].slice.call(document.querySelectorAll('[data-nav]')).forEach(function (a) {
          if (a.getAttribute('data-nav') === en.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    [].slice.call(document.querySelectorAll('main > section')).forEach(function (s) { observer.observe(s); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('#mode-toggle, #nav-burger, .nav-links a') : null;
    if (!t || !DATA) return;
    var header = document.querySelector('.site-nav');
    if (t.id === 'mode-toggle') {
      var next = document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
      if (previewing) modeOverride = next; else { try { localStorage.setItem('pf-mode', next); } catch (err) {} }
      applyAppearance(DATA);
    } else if (t.id === 'nav-burger') {
      var open = header.classList.toggle('nav-open'); t.setAttribute('aria-expanded', open ? 'true' : 'false');
    } else if (header) { header.classList.remove('nav-open'); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.hasAttribute || !f.hasAttribute('data-mailto') || !DATA) return;
    e.preventDefault();
    var fd = new FormData(f);
    location.href = 'mailto:' + DATA.contact.email + '?subject=' + encodeURIComponent('Message from ' + fd.get('name')) +
      '&body=' + encodeURIComponent(fd.get('message') + '\n\n— ' + fd.get('name') + ' (' + fd.get('email') + ')');
  });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { if (DATA) applyAppearance(DATA); });
  }

  // live updates from admin / generator
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !e.data) return;
    if (e.data.type === 'pf-data') {
      previewing = true;
      var m = e.data.data && e.data.data.design && e.data.data.design.mode;
      if (m !== lastDesignMode) { modeOverride = null; lastDesignMode = m; }
      render(e.data.data);
    } else if (e.data.type === 'pf-scroll') {
      var el = document.getElementById(e.data.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  if (window.parent !== window) { try { window.parent.postMessage({ type: 'pf-ready' }, '*'); } catch (e) {} }

  window.PFRenderer = { render: render };
  // Inside the admin/generator preview we wait for the editor to send the data instead of showing the saved copy first.
  var waitForParent = window.__PF_PREVIEW || /[?&]pf-preview/.test(location.search);
  if (!waitForParent) render(window.PORTFOLIO_DATA || {});
})();
