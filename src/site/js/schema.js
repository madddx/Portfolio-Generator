/*  Shared schema: styles, sections, social networks, defaults, normalisation.
    Used by the generated site, its admin page and the generator itself.   */
(function (root) {
  'use strict';

  // ── Styles ────────────────────────────────────────────────────────────
  // `fonts` is the Google Fonts query string the style needs.
  // Filled in by build.mjs from themes/*/theme.json (newest first).
  var STYLES = /*@@STYLES@@*/[];
  var DEFAULT_STYLE = 'aurora';

  // ── Sections (order = default page order) ─────────────────────────────
  var SECTIONS = [
    { id: 'about',          title: 'About' },
    { id: 'experience',     title: 'Experience' },
    { id: 'projects',       title: 'Projects' },
    { id: 'skills',         title: 'Skills' },
    { id: 'education',      title: 'Education' },
    { id: 'certifications', title: 'Certifications' },
    { id: 'publications',   title: 'Publications' },
    { id: 'awards',         title: 'Awards' },
    { id: 'learning',       title: 'Courses' },
    { id: 'links',          title: 'Links' },
    { id: 'contact',        title: 'Contact' }
  ];

  // ── Social networks (order = display order) ───────────────────────────
  var SOCIALS = [
    { id: 'linkedin',  label: 'LinkedIn',        icon: 'fab fa-linkedin-in',   ph: 'https://www.linkedin.com/in/you' },
    { id: 'github',    label: 'GitHub',          icon: 'fab fa-github',        ph: 'https://github.com/you' },
    { id: 'x',         label: 'X (Twitter)',     icon: 'fab fa-x-twitter',     ph: 'https://x.com/you' },
    { id: 'instagram', label: 'Instagram',       icon: 'fab fa-instagram',     ph: 'https://instagram.com/you' },
    { id: 'youtube',   label: 'YouTube',         icon: 'fab fa-youtube',       ph: 'https://youtube.com/@you' },
    { id: 'website',   label: 'Website',         icon: 'fas fa-globe',         ph: 'https://yoursite.com' },
    { id: 'medium',    label: 'Medium',          icon: 'fab fa-medium',        ph: 'https://medium.com/@you' },
    { id: 'behance',   label: 'Behance',         icon: 'fab fa-behance',       ph: 'https://behance.net/you' },
    { id: 'dribbble',  label: 'Dribbble',        icon: 'fab fa-dribbble',      ph: 'https://dribbble.com/you' },
    { id: 'kaggle',    label: 'Kaggle',          icon: 'fab fa-kaggle',        ph: 'https://kaggle.com/you' },
    { id: 'leetcode',  label: 'LeetCode',        icon: 'fas fa-code',          ph: 'https://leetcode.com/u/you' },
    { id: 'scholar',   label: 'Google Scholar',  icon: 'fas fa-graduation-cap',ph: 'https://scholar.google.com/citations?user=…' },
    { id: 'orcid',     label: 'ORCID',           icon: 'fab fa-orcid',         ph: 'https://orcid.org/0000-0000-0000-0000' },
    { id: 'researchgate', label: 'ResearchGate', icon: 'fab fa-researchgate',  ph: 'https://researchgate.net/profile/you' },
    { id: 'telegram',  label: 'Telegram',        icon: 'fab fa-telegram',      ph: 'https://t.me/you' }
  ];

  // Icon guessing so users never have to type Font Awesome class names.
  var SKILL_ICONS = {
    'python':'fab fa-python','javascript':'fab fa-js','js':'fab fa-js','react':'fab fa-react','react.js':'fab fa-react',
    'node':'fab fa-node-js','node.js':'fab fa-node-js','nodejs':'fab fa-node-js','html':'fab fa-html5','html5':'fab fa-html5',
    'css':'fab fa-css3-alt','css3':'fab fa-css3-alt','java':'fab fa-java','php':'fab fa-php','angular':'fab fa-angular',
    'vue':'fab fa-vuejs','vue.js':'fab fa-vuejs','bootstrap':'fab fa-bootstrap','sass':'fab fa-sass','git':'fab fa-git-alt',
    'github':'fab fa-github','gitlab':'fab fa-gitlab','docker':'fab fa-docker','aws':'fab fa-aws','linux':'fab fa-linux',
    'figma':'fab fa-figma','npm':'fab fa-npm','swift':'fab fa-swift','rust':'fab fa-rust','go':'fab fa-golang','golang':'fab fa-golang',
    'android':'fab fa-android','wordpress':'fab fa-wordpress','jira':'fab fa-jira','slack':'fab fa-slack','unity':'fab fa-unity',
    'azure':'fab fa-microsoft','microsoft':'fab fa-microsoft','google cloud':'fab fa-google','gcp':'fab fa-google',
    'sql':'fas fa-database','mysql':'fas fa-database','postgresql':'fas fa-database','mongodb':'fas fa-database','databricks':'fas fa-database',
    'pyspark':'fas fa-bolt','spark':'fas fa-bolt','machine learning':'fas fa-brain','deep learning':'fas fa-brain','ai':'fas fa-brain',
    'c':'fas fa-code','c++':'fas fa-code','c#':'fas fa-code','typescript':'fas fa-code','kotlin':'fas fa-code'
  };
  var HOST_ICONS = [
    [/github\.com/, 'fab fa-github'], [/linkedin\.com/, 'fab fa-linkedin-in'], [/(twitter|x)\.com/, 'fab fa-x-twitter'],
    [/instagram\.com/, 'fab fa-instagram'], [/youtube\.com|youtu\.be/, 'fab fa-youtube'], [/medium\.com/, 'fab fa-medium'],
    [/behance\.net/, 'fab fa-behance'], [/dribbble\.com/, 'fab fa-dribbble'], [/kaggle\.com/, 'fab fa-kaggle'],
    [/orcid\.org/, 'fab fa-orcid'], [/researchgate\.net/, 'fab fa-researchgate'], [/scholar\.google/, 'fas fa-graduation-cap'],
    [/leetcode\.com/, 'fas fa-code'], [/drive\.google|docs\.google/, 'fab fa-google-drive'], [/t\.me|telegram/, 'fab fa-telegram'],
    [/stackoverflow\.com/, 'fab fa-stack-overflow'], [/codepen\.io/, 'fab fa-codepen'], [/coursera\.org|udemy\.com|edx\.org/, 'fas fa-graduation-cap']
  ];

  function skillIcon(name) { return SKILL_ICONS[String(name || '').trim().toLowerCase()] || ''; }
  function urlIcon(url) {
    var u = String(url || '').toLowerCase();
    for (var i = 0; i < HOST_ICONS.length; i++) if (HOST_ICONS[i][0].test(u)) return HOST_ICONS[i][1];
    return 'fas fa-link';
  }

  // ── Defaults ──────────────────────────────────────────────────────────
  function emptyData() {
    return {
      version: 1,
      meta: { title: '', description: '', year: '' },
      design: { style: DEFAULT_STYLE, mode: 'auto', accent: '', toggle: true },
      sections: SECTIONS.map(function (s) { return { id: s.id, title: s.title, visible: true }; }),
      hero: { name: '', headline: '', typed: [], bio: '', photo: '', location: '', resume: '', stats: [], badges: [] },
      socials: {},
      about: { paragraphs: [], facts: [], interests: [] },
      education: [], experience: [], projects: [], skills: [], certifications: [],
      publications: [], awards: [], learning: [], links: [],
      contact: { intro: '', email: '', phone: '', location: '', form: true }
    };
  }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, src) {
    if (!isObj(src)) return base;
    Object.keys(base).forEach(function (k) {
      if (!(k in src) || src[k] == null) return;
      if (isObj(base[k]) && k !== 'socials') base[k] = merge(base[k], src[k]);
      else if (Array.isArray(base[k])) base[k] = Array.isArray(src[k]) ? src[k] : base[k];
      else base[k] = src[k];
    });
    if (isObj(base.socials) && isObj(src.socials)) base.socials = src.socials;
    return base;
  }

  // Fills in anything missing so older/hand-edited files still render.
  function normalize(input) {
    var d = merge(emptyData(), input || {});
    var known = {}, out = [];
    (d.sections || []).forEach(function (s) {
      var def = SECTIONS.filter(function (x) { return x.id === s.id; })[0];
      if (!def || known[s.id]) return;
      known[s.id] = 1;
      out.push({ id: s.id, title: (s.title || def.title), visible: s.visible !== false });
    });
    SECTIONS.forEach(function (def) {
      if (!known[def.id]) out.push({ id: def.id, title: def.title, visible: true });
    });
    d.sections = out;
    if (!STYLES.some(function (s) { return s.id === d.design.style; })) d.design.style = DEFAULT_STYLE;
    if (['light', 'dark', 'auto'].indexOf(d.design.mode) < 0) d.design.mode = 'auto';
    return d;
  }

  // Parses the contents of portfolio-data.js (or plain JSON).
  function parseDataFile(text) {
    var t = String(text || '').trim();
    var m = t.match(/window\.PORTFOLIO_DATA\s*=\s*([\s\S]*?);?\s*$/);
    if (m) t = m[1].replace(/;\s*$/, '');
    return normalize(JSON.parse(t));
  }
  function serializeDataFile(data) {
    return '/* Your portfolio content. Edit it with admin.html, then replace this file. */\n' +
           'window.PORTFOLIO_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
  }

  root.PF = { STYLES: STYLES, SECTIONS: SECTIONS, SOCIALS: SOCIALS, emptyData: emptyData, normalize: normalize,
              parseDataFile: parseDataFile, serializeDataFile: serializeDataFile, skillIcon: skillIcon, urlIcon: urlIcon };
})(typeof window !== 'undefined' ? window : globalThis);
