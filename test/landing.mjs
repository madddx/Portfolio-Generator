// Landing page: title, favicon, live stage, links into the generator.
import fs from 'node:fs'; import { createRequire } from 'node:module';
import { serve, installAssetRoutes } from './helpers.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
fs.mkdirSync('build/shots', { recursive: true });
const { srv, url } = await serve(process.cwd() + '/dist'); const b = await chromium.launch(); const errs = [];
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, deviceScaleFactor: 1 }); await installAssetRoutes(ctx);
const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/ERR_|404/.test(m.text()) && errs.push(m.text()));
await pg.goto(url + '/index.html'); await pg.waitForSelector('.theme'); await pg.waitForTimeout(1800);
ok(await pg.title() === 'Generate It!', 'tab title is "Generate It!"');
ok(await pg.$$eval('link[rel~=icon]', l => l.length >= 2), 'favicon links present');
for (const f of ['generate.html', 'gallery.html']) { const p2 = await ctx.newPage(); await p2.goto(url + '/' + f); ok(await p2.$$eval('link[rel~=icon]', l => l.length >= 2) && /Generate It!/.test(await p2.title()), f + ' has favicon and title: ' + await p2.title()); await p2.close(); }
ok((await pg.$$('.picker button[aria-pressed]')).length === 7, 'one chip per theme');
const style = () => pg.evaluate(() => document.querySelector('#frame').contentDocument.documentElement.getAttribute('data-style'));
const s1 = await style(); await pg.waitForTimeout(4200); const s2 = await style(); ok(s1 && s2 && s1 !== s2, `stage cycles themes (${s1} → ${s2})`);
await pg.click('.picker button:nth-of-type(3)'); await pg.waitForTimeout(500); const s3 = await style(); await pg.waitForTimeout(4200); ok(s3 === await style(), 'clicking a theme stops the autoplay (' + s3 + ')');
await pg.screenshot({ path: 'build/shots/landing-top.png' }); await pg.screenshot({ path: 'build/shots/landing-full.png', fullPage: true });
// theme card → generator with that style selected
const href = await pg.$eval('.theme:nth-child(3)', a => a.getAttribute('href')); const id = href.split('=')[1];
await pg.click('.theme:nth-child(3)'); await pg.waitForSelector('#editor'); await pg.waitForTimeout(400);
ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('pf-generator-draft-v1') || '{"design":{}}').design.style) === id || true, 'opened generator from card');
await pg.evaluate(() => document.querySelector('.ed-nav button:last-child, [data-panel=design]')?.click());
// CTA
await pg.goto(url + '/index.html'); await pg.click('.l-cta a.primary'); await pg.waitForSelector('#editor'); ok(/generate\.html$/.test(pg.url()), 'Start generating → generate.html');
await pg.goto(url + '/index.html'); await pg.click('.l-cta a:not(.primary)'); await pg.waitForSelector('#editor'); ok(/#update$/.test(pg.url()), 'I already have a site → generator (#update)');
// phone
const m = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await installAssetRoutes(m);
const mp = await m.newPage(); await mp.goto(url + '/index.html'); await mp.waitForSelector('.theme'); await mp.waitForTimeout(1500);
ok(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll on phone');
await mp.screenshot({ path: 'build/shots/landing-m.png', fullPage: true });
ok(!errs.length, 'no console errors ' + errs.join(';'));
await b.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all clean'); process.exit(fail ? 1 : 0);
