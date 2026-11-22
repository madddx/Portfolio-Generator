// npm run new-theme -- <id> "<Name>" [--from <existing-id>]
import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi >= 0 ? args.splice(fi, 2)[1] : null;
const [id, name] = args;
if (!id || !name) { console.error('Usage: npm run new-theme -- <id> "<Name>" [--from <existing-id>]\n  e.g.  npm run new-theme -- sunrise "Sunrise"'); process.exit(1); }
if (!/^[a-z][a-z0-9-]{2,23}$/.test(id)) { console.error('The id must be 3–24 characters: lowercase letters, digits and hyphens, starting with a letter.'); process.exit(1); }
const dest = path.join('themes', id); if (fs.existsSync(dest)) { console.error(`themes/${id} already exists.`); process.exit(1); }
const srcDir = path.join('themes', from || '_template'); if (!fs.existsSync(srcDir)) { console.error(`themes/${from} doesn't exist.`); process.exit(1); }
const today = new Date().toISOString().slice(0, 10);
fs.mkdirSync(dest, { recursive: true });
for (const f of ['theme.json', 'theme.css', 'thumb.svg']) {
  let t = fs.readFileSync(path.join(srcDir, f), 'utf8');
  if (from) { t = t.split(`data-style="${from}"`).join(`data-style="${id}"`); if (f === 'theme.css') t = t.replace(new RegExp(`@keyframes ${from}-`, 'g'), `@keyframes ${id}-`); }
  t = t.replace(/__ID__/g, id).replace(/__NAME__/g, name).replace(/__DATE__/g, today);
  if (from && f === 'theme.json') { const j = JSON.parse(t); j.id = id; j.name = name; j.released = today; j.order = 100; j.blurb = 'TODO: one friendly sentence about how this style feels.'; t = JSON.stringify(j, null, 2) + '\n'; }
  fs.writeFileSync(path.join(dest, f), t);
}
console.log(`Created themes/${id}/${from ? `  (started from ${from})` : ''}

Next:
  1. Edit themes/${id}/theme.css       (colours first, then one signature move)
  2. Edit themes/${id}/theme.json      (blurb, fonts, accent + swatch colours)
  3. npm run dev                        rebuilds on every save — keep dist/gallery.html open and refresh
  4. npm run check-themes               must pass before you ship
  5. Set "released" in theme.json to the launch date, then npm run build and deploy dist/`);
