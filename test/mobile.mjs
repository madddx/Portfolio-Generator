import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { serve, installAssetRoutes } from './helpers.mjs';
const root = path.resolve('build/site-test'); const data = JSON.parse(fs.readFileSync(root + '/sample.json', 'utf8'));
const { srv, url } = await serve(root); const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1 }); await installAssetRoutes(ctx);
const bad = [];
const STYLES = fs.readdirSync('themes').filter(d => !d.startsWith('_')); for (const style of STYLES) for (const mode of ['light', 'dark']) {
  data.design.style = style; data.design.mode = mode; fs.writeFileSync(root + '/portfolio-data.js', 'window.PORTFOLIO_DATA=' + JSON.stringify(data) + ';');
  const p = await ctx.newPage(); await p.goto(url + '/index.html'); await p.waitForSelector('.hero-name'); await p.waitForTimeout(500);
  const over = await p.evaluate(() => { const w = innerWidth; const offenders = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1 && !e.closest('.nav-links') && !(function(n){ for (n = n.parentElement; n && n !== document.body; n = n.parentElement) { var o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; })(e) && getComputedStyle(e).position !== 'fixed').slice(0, 3).map(e => e.className || e.tagName); return { d: document.documentElement.scrollWidth - w, offenders }; });
  if (over.d > 0 || over.offenders.length) bad.push(`${style}/${mode}: +${over.d}px ${over.offenders.join(',')}`);
  if (mode === 'light' && ['slate'].includes(style)) await p.screenshot({ path: `build/shots/m-${style}.png` });
  await p.close();
}
console.log(bad.length ? 'MOBILE PROBLEMS:\n' + bad.join('\n') : 'mobile: all ' + STYLES.length * 2 + ' style/mode combos fit at 390px'); srv.close(); await b.close();
