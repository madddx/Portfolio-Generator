import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { installAssetRoutes } from './helpers.mjs';

const out = path.resolve('build/e2e'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const errors = [], results = [];
const ok = (name, cond, extra = '') => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); if (!cond) errors.push(name); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, colorScheme: 'light' }); await installAssetRoutes(ctx);
const watch = (page, tag) => { page.on('pageerror', e => { errors.push(tag + ' pageerror: ' + e.message); }); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(tag + ' console: ' + m.text()); }); };

// ── 1. generator ──────────────────────────────────────────────────────────
const gen = await ctx.newPage(); watch(gen, 'gen');
await gen.goto('file://' + path.resolve('dist/generate.html')); await gen.waitForSelector('.ed-nav');
const pv = gen.frameLocator('iframe.pv-frame');
await gen.fill('input[placeholder="Jane Doe"]', 'Test Person'); await gen.fill('input[placeholder="Full-stack developer"]', 'Backend engineer');
await pv.locator('.hero-name').waitFor(); await gen.waitForTimeout(400);
ok('live preview shows typed name', (await pv.locator('.hero-name').textContent()) === 'Test Person');
ok('preview hides empty sections', (await pv.locator('main > section').count()) === 1);

// image upload through the real file input (profile photo)
const png = path.join(out, 'big.png');
execSync(`python3 -I -c "from PIL import Image; Image.effect_mandelbrot((2400,3000),(-2,-1.5,1,1.5),30).convert('RGB').save('${png}')"`);
await gen.setInputFiles('.img-field input[type=file]', png); await gen.waitForSelector('.img-meta:has-text("Uploaded")');
const meta = await gen.locator('.img-meta').first().textContent(); ok('photo is compressed', /Uploaded · \d+ KB/.test(meta), meta);
await gen.waitForTimeout(300); ok('photo appears in preview', await pv.locator('.hero-photo img').count() === 1);

// sample content, then undo
await gen.click('text=Try with sample content'); await gen.waitForTimeout(500);
ok('sample loads', (await pv.locator('.hero-name').textContent()) === 'Nila Raman');
await gen.click('.ed-toast .link'); await gen.waitForTimeout(400);
ok('undo restores previous', (await pv.locator('.hero-name').textContent()) === 'Test Person');
await gen.click('text=Try with sample content'); await gen.waitForTimeout(500);

// lists: add / remove / undo / reorder
await gen.click('.ed-link:has-text("Projects")'); await gen.waitForSelector('.item');
const n0 = await gen.locator('.item').count();
await gen.click('.btn.add'); ok('add project', (await gen.locator('.item').count()) === n0 + 1);
await gen.locator('.item.open input').first().fill('Brand new project'); await gen.waitForTimeout(300);
ok('card title follows typing', (await gen.locator('.it-title').last().textContent()) === 'Brand new project');
await gen.locator('.item').last().locator('button[aria-label="Remove project"]').click(); ok('remove project', (await gen.locator('.item').count()) === n0);
await gen.click('.ed-toast .link'); ok('undo remove', (await gen.locator('.item').count()) === n0 + 1);
await gen.locator('.item').last().locator('button[aria-label="Move up"]').click(); await gen.waitForTimeout(300);
ok('reorder moves card', (await gen.locator('.it-title').nth(n0 - 1).textContent()) === 'Brand new project');
await gen.locator('.item').nth(n0 - 1).locator('button[aria-label="Remove project"]').click();

// style + mode + accent
await gen.click('.ed-link:has-text("Style")'); await gen.waitForSelector('.styles');
await gen.screenshot({ path: out + '/gen-design.png' });
for (const [name, id] of [['Slate', 'slate'], ['Folio', 'folio'], ['Brutal', 'brutal'], ['Bloom', 'bloom'], ['Terminal', 'terminal'], ['Aurora', 'aurora']]) {
  await gen.click(`.style:has-text("${name}")`); await gen.waitForTimeout(500);
  ok('style ' + id, (await pv.locator('html').getAttribute('data-style')) === id);
}
await gen.click('.style:has-text("Terminal")'); await gen.click('.seg button:has-text("Dark")'); await gen.waitForTimeout(500);
ok('dark mode applies', (await pv.locator('html').getAttribute('data-mode')) === 'dark');
await gen.click('.sw >> nth=1'); await gen.waitForTimeout(300);
ok('accent override applies', /#/.test(await pv.locator('html').evaluate(e => e.style.getPropertyValue('--accent'))));
await gen.screenshot({ path: out + '/gen-terminal-dark.png' });
// hide a section and reorder
await gen.locator('.sec-row').first().locator('input[type=checkbox]').uncheck(); await gen.waitForTimeout(400);
ok('hiding a section removes it', (await pv.locator('#about').count()) === 0);
await gen.locator('.sec-row').first().locator('input[type=checkbox]').check();
await gen.click('.style:has-text("Aurora")'); await gen.click('.seg button:has-text("Match device")'); await gen.click('.sw >> nth=0'); await gen.click('button:has-text("style’s own colour")');

// draft survives reload
await gen.reload(); await gen.waitForSelector('.ed-nav'); await gen.waitForTimeout(600);
ok('draft restored after reload', (await gen.locator('#status').textContent()).includes('restored'));

// download
await gen.click('#go-download'); await gen.waitForSelector('.checks');
await gen.screenshot({ path: out + '/gen-download.png' });
const [dl] = await Promise.all([gen.waitForEvent('download'), gen.click('button:has-text("Download website (.zip)")')]);
const zipPath = out + '/' + dl.suggestedFilename(); await dl.saveAs(zipPath); ok('zip name', dl.suggestedFilename() === 'nila-raman-website.zip', dl.suggestedFilename());
execSync(`cd ${out} && unzip -q -o ${zipPath} -d site`); const siteDir = out + '/site/nila-raman-website';
const listing = execSync(`cd ${siteDir} && find . -type f | sort`).toString().trim().split('\n');
ok('zip contents', ['./index.html', './admin.html', './portfolio-data.js', './css/base.css', './js/renderer.js', './js/schema.js', './css/themes/folio.css', './README.txt'].every(f => listing.includes(f)), listing.length + ' files');
ok('title baked into index.html', /<title>Nila Raman — Full-stack developer &amp; data engineer<\/title>/.test(fs.readFileSync(siteDir + '/index.html', 'utf8')));

// ── 2. generated site, opened straight from disk ─────────────────────────
const site = await ctx.newPage(); watch(site, 'site');
await site.goto('file://' + siteDir + '/index.html'); await site.waitForSelector('.hero-name', { timeout: 8000 });
ok('site renders from file://', (await site.locator('.hero-name').textContent()) === 'Nila Raman');
ok('site has sections', (await site.locator('main > section').count()) >= 8);
await site.click('#mode-toggle'); const m1 = await site.locator('html').getAttribute('data-mode'); await site.click('#mode-toggle');
ok('mode toggle flips', m1 !== (await site.locator('html').getAttribute('data-mode')));
await site.screenshot({ path: out + '/site.png' });
await site.setViewportSize({ width: 390, height: 800 }); await site.waitForTimeout(300);
ok('mobile: no horizontal overflow', (await site.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
ok('mobile: nav collapses to menu', await site.locator('.site-nav.nav-compact').count() === 1);
await site.click('#nav-burger'); ok('mobile menu opens', await site.locator('.nav-links a').first().isVisible());
await site.screenshot({ path: out + '/site-mobile.png' });

// ── 3. admin, opened from disk ───────────────────────────────────────────
const adm = await ctx.newPage(); watch(adm, 'admin');
await adm.goto('file://' + siteDir + '/admin.html'); await adm.waitForSelector('.ed-nav'); await adm.waitForTimeout(800);
ok('admin loads existing data', (await adm.inputValue('input[placeholder="Jane Doe"]')) === 'Nila Raman');
const apv = adm.frameLocator('iframe.pv-frame'); await apv.locator('.hero-name').waitFor({ timeout: 8000 });
ok('admin preview renders', (await apv.locator('.hero-name').textContent()) === 'Nila Raman');
await adm.fill('input[placeholder="Jane Doe"]', 'Nila R. Updated'); await adm.waitForTimeout(500);
ok('admin preview updates live', (await apv.locator('.hero-name').textContent()) === 'Nila R. Updated');
ok('admin shows unsaved state', (await adm.locator('#status').textContent()) === 'Unsaved changes');
await adm.click('.ed-link:has-text("Style")'); await adm.click('.style:has-text("Bloom")'); await adm.waitForTimeout(500);
ok('admin can switch style', (await apv.locator('html').getAttribute('data-style')) === 'bloom');
await adm.screenshot({ path: out + '/admin.png' });
const [dl2] = await Promise.all([adm.waitForEvent('download'), adm.click('#save')]);
const newData = out + '/portfolio-data.js'; await dl2.saveAs(newData);
ok('admin save filename', dl2.suggestedFilename() === 'portfolio-data.js');
ok('saved file has edits', /Nila R\. Updated/.test(fs.readFileSync(newData, 'utf8')) && /"style": "bloom"/.test(fs.readFileSync(newData, 'utf8')));
await adm.waitForTimeout(300); ok('status resets after save', (await adm.locator('#status').textContent()) === 'No changes');

// replace the file and reload the real site
fs.copyFileSync(newData, siteDir + '/portfolio-data.js');
await site.setViewportSize({ width: 1280, height: 800 }); await site.reload(); await site.waitForSelector('.hero-name');
ok('replacing the data file updates the site', (await site.locator('.hero-name').textContent()) === 'Nila R. Updated' && (await site.locator('html').getAttribute('data-style')) === 'bloom');
fs.cpSync(siteDir, 'dist/example-site', { recursive: true });

console.log(results.join('\n')); console.log(errors.length ? '\nPROBLEMS:\n' + errors.join('\n') : '\nall clean');
await browser.close();
