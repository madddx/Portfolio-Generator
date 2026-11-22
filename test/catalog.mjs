// Hosted catalog: a theme added to / removed from themes/index.json shows up in the generator; a site zip can be re-opened.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module';
import { serve } from './helpers.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-')); fs.cpSync('dist', tmp, { recursive: true });
const idx = JSON.parse(fs.readFileSync(path.join(tmp, 'themes/index.json'), 'utf8'));
const slate = idx.themes.find(t => t.id === 'slate');
const clone = { ...slate, id: 'zztest', name: 'Zz Test', css: slate.css.split('data-style="slate"').join('data-style="zztest"') };
idx.themes = idx.themes.filter(t => t.id !== 'terminal'); idx.themes.unshift(clone);
fs.writeFileSync(path.join(tmp, 'themes/index.json'), JSON.stringify(idx));
const { srv, url } = await serve(tmp); const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/fonts|font-awesome|ERR_/.test(m.text() + m.location().url) && errs.push(m.text()));
await pg.goto(url + '/index.html'); await pg.waitForSelector('#editor');
ok(await pg.evaluate(() => PFCatalog.source()) === 'server', 'generator used the server catalog');
const names = await pg.evaluate(() => PF.STYLES.map(s => s.id));
ok(names[0] === 'zztest' && !names.includes('terminal'), 'added theme appears, removed theme is gone: ' + names.join(','));
// open my existing site zip → lands on Design with the new theme listed
await pg.setInputFiles('#import-file', 'dist/example-site.zip');
await pg.waitForSelector('.style');
const cards = await pg.$$eval('.style .style-name', e => e.map(x => x.textContent));
ok(cards.some(c => /Zz Test/.test(c)) && !cards.some(c => /Terminal/.test(c)), 'Design panel lists the catalog: ' + cards.join(' | '));
ok(await pg.evaluate(() => /Raman|\S/.test(document.querySelector('#editor').textContent)), 'editor open');
// choose the new theme and build the zip; it must contain its css and the imported content
await pg.click('.style:has-text("Zz Test")');
const name = await pg.evaluate(() => JSON.parse(localStorage.getItem('pf-generator-draft-v1') || '{}')).catch(() => ({}));
await new Promise(r => setTimeout(r, 900));
const draft = await pg.evaluate(() => JSON.parse(localStorage.getItem('pf-generator-draft-v1')));
ok(draft.design.style === 'zztest' && !!draft.hero.name, 'style switched, content kept (' + draft.hero.name + ')');
await pg.click('#go-download'); const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('button:has-text("Download website")')]);
const zf = path.join(tmp, 'out.zip'); await dl.saveAs(zf);
const JSZip = createRequire(import.meta.url)('jszip'); const z = await JSZip.loadAsync(fs.readFileSync(zf)); const files = Object.keys(z.files);
ok(files.some(f => f.endsWith('css/themes/zztest.css')) && !files.some(f => f.endsWith('themes/terminal.css')), 'zip carries current catalog only');
// the same page opened from disk falls back to built-in themes
const pg2 = await b.newPage(); await pg2.goto('file://' + path.resolve('dist/index.html')); await pg2.waitForSelector('#editor');
ok(await pg2.evaluate(() => PFCatalog.source() === 'built-in' && PF.STYLES.some(s => s.id === 'terminal')), 'file:// falls back to built-in themes');
// broken catalog → fallback, no crash
fs.writeFileSync(path.join(tmp, 'themes/index.json'), '{oops'); const pg3 = await b.newPage(); await pg3.goto(url + '/index.html'); await pg3.waitForSelector('#editor');
ok(await pg3.evaluate(() => PF.STYLES.length >= 6), 'bad index.json → built-in fallback');
ok(!errs.length, 'no console errors ' + errs.join(';'));
await b.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all clean'); process.exit(fail ? 1 : 0);
