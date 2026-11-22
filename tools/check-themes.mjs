// Quality gate for themes. `npm run check-themes` (also runs inside `npm run build`).
import fs from 'node:fs'; import path from 'node:path';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const rgb = h => { h = h.slice(1); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

// walk CSS and return every style-rule selector (including those inside @media / @supports)
function selectors(css, out = [], keyframes = []) {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    const prelude = css.slice(i, open).trim(); let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (/^@(media|supports)/i.test(prelude)) selectors(body, out, keyframes);
    else if (/^@(-\w+-)?keyframes/i.test(prelude)) keyframes.push(prelude.replace(/^@\S+\s+/, ''));
    else if (!prelude.startsWith('@')) out.push(prelude);
    i = j;
  }
  return { selectors: out, keyframes };
}
function tokens(css, id, mode) {
  const re = new RegExp(`:root\\[data-style="${id}"\\]\\[data-mode="${mode}"\\]\\s*\\{([^}]*)\\}`, 'g'); const t = {}; let m;
  while ((m = re.exec(css))) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) t[d[1]] = d[2].trim();
  return t;
}

export function checkTheme(dir) {
  const id = path.basename(dir), errors = [], warnings = [], E = m => errors.push(m), W = m => warnings.push(m);
  const f = n => path.join(dir, n);
  for (const n of ['theme.json', 'theme.css', 'thumb.svg']) if (!fs.existsSync(f(n))) E(`missing ${n}`);
  if (errors.length) return { id, errors, warnings };
  let meta; try { meta = JSON.parse(fs.readFileSync(f('theme.json'), 'utf8')); } catch (e) { E('theme.json is not valid JSON: ' + e.message); return { id, errors, warnings }; }
  if (meta.id !== id) E(`theme.json id "${meta.id}" must equal the folder name "${id}"`);
  if (!/^[a-z][a-z0-9-]{2,23}$/.test(id)) E('id must be 3–24 chars: lowercase letters, digits, hyphens');
  if (!meta.name || meta.name.length > 24) E('name is required (max 24 chars)');
  if (/^\s*todo/i.test(meta.blurb || '')) E('blurb still says TODO — write one friendly sentence about how the style feels');
  if (!meta.blurb || meta.blurb.length > 130) E('blurb is required (max 130 chars) — one friendly sentence on what the style feels like');
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(meta.released || '')) E('released must be YYYY-MM-DD (optionally with a time: YYYY-MM-DDTHH:MM)');
  if (!/^family=/.test(meta.fonts || '')) E('fonts must be a Google Fonts query, e.g. "family=Inter:wght@400;600"');
  for (const m of ['light', 'dark']) {
    if (!HEX.test(meta.accent?.[m] || '')) E(`accent.${m} must be a hex colour`);
    if (!Array.isArray(meta.swatch?.[m]) || meta.swatch[m].length !== 3 || !meta.swatch[m].every(c => HEX.test(c))) E(`swatch.${m} must be [background, text, accent] hex colours`);
  }
  const svg = fs.readFileSync(f('thumb.svg'), 'utf8');
  if (!/<svg[^>]*viewBox="0 0 120 76"/.test(svg)) E('thumb.svg must be an <svg viewBox="0 0 120 76">');
  for (const ph of ['{bg}', '{ink}', '{ac}']) if (!svg.includes(ph)) W(`thumb.svg never uses ${ph}, so it won't change with the mode`);
  if (/<script|onload=|onerror=|href="http/i.test(svg)) E('thumb.svg must not contain scripts or external links');

  const css = fs.readFileSync(f('theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const { selectors: sels, keyframes } = selectors(css);
  const bad = new Set();
  const splitTop = sel => { const parts = []; let d = 0, cur = ''; for (const ch of sel) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && !d) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts; };
  for (const s of sels) for (const part of splitTop(s)) if (!part.includes(`[data-style="${id}"]`)) bad.add(part.trim().slice(0, 70));
  if (bad.size) E(`selectors must be scoped to [data-style="${id}"] or they leak into other themes: ${[...bad].slice(0, 3).join(' | ')}${bad.size > 3 ? ` (+${bad.size - 3} more)` : ''}`);
  for (const k of keyframes) if (!k.startsWith(id + '-')) E(`@keyframes "${k}" must be prefixed "${id}-" so names can't collide`);
  const imp = (css.match(/!important/g) || []).length; if (imp > 3) W(`${imp} uses of !important — prefer more specific selectors`);
  if (/url\(\s*['"]?https?:/i.test(css)) W('theme.css loads an external URL; keep themes self-contained (fonts go in theme.json)');

  const need = ['--bg', '--surface', '--border', '--text', '--text-2', '--heading', '--accent', '--accent-ink'];
  const notes = [];
  for (const mode of ['light', 'dark']) {
    const t = tokens(css, id, mode);
    if (!Object.keys(t).length) { E(`no :root[data-style="${id}"][data-mode="${mode}"] token block`); continue; }
    for (const n of need) if (!t[n]) E(`${mode}: token ${n} is missing`);
    const val = n => { let v = t[n]; if (v && /^var\(--[\w-]+\)$/.test(v)) v = t[v.slice(4, -1)]; return HEX.test(v || '') ? v : null; };
    const pair = (fg, bg, min, hard, label) => { const a = val(fg), b = val(bg); if (!a || !b) { notes.push(`${mode}: ${label} not checked (not plain hex)`); return; }
      const r = contrast(a, b); if (r < hard) E(`${mode}: ${label} contrast ${r.toFixed(2)}:1 — must be at least ${hard}:1`); else if (r < min) W(`${mode}: ${label} contrast ${r.toFixed(2)}:1 — below the ${min}:1 target`); };
    pair('--text', '--bg', 4.5, 4.5, 'body text on background');
    pair('--text', '--surface', 4.5, 4.5, 'body text on cards');
    pair('--heading', '--bg', 4.5, 4.5, 'headings on background');
    pair('--text-2', '--bg', 4.5, 3, 'secondary text on background');
    pair('--text-2', '--surface', 4.5, 3, 'secondary text on cards');
    pair(t['--accent-text'] ? '--accent-text' : '--accent', '--bg', 4.5, 3, 'links/accent text on background');
    pair('--accent-ink', '--accent', 4.5, 4.5, 'button text on accent');
  }
  return { id, meta, errors, warnings, notes };
}

export function checkAll(root = 'themes') {
  const dirs = fs.readdirSync(root).filter(d => !d.startsWith('_') && fs.statSync(path.join(root, d)).isDirectory());
  const results = dirs.map(d => checkTheme(path.join(root, d)));
  const names = {}; results.forEach(r => r.meta && (names[r.meta.name] = (names[r.meta.name] || []).concat(r.id)));
  Object.entries(names).forEach(([n, ids]) => ids.length > 1 && results.find(r => r.id === ids[1]).errors.push(`name "${n}" is already used by ${ids[0]}`));
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('check-themes.mjs')) {
  const results = checkAll(); let bad = 0;
  for (const r of results) {
    console.log(`${r.errors.length ? '✗' : '✓'} ${r.id}${r.errors.length ? '' : r.warnings.length ? `  (${r.warnings.length} warning${r.warnings.length > 1 ? 's' : ''})` : ''}`);
    r.errors.forEach(e => console.log('    ERROR  ' + e)); r.warnings.forEach(w => console.log('    warn   ' + w)); bad += r.errors.length;
  }
  console.log(bad ? `\n${bad} error(s). Fix them before shipping.` : `\n${results.length} themes OK.`); process.exit(bad ? 1 : 0);
}
