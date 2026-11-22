// Renders the sample portfolio in every style x mode and saves screenshots.
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { serve, installAssetRoutes } from './helpers.mjs';

const root = path.resolve('build/site-test'); fs.rmSync(root, { recursive: true, force: true });
fs.cpSync('build/site', root, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await installAssetRoutes(ctx);

// 1. build sample data via the real sample.js in a page (needs canvas)
const p0 = await ctx.newPage(); await p0.goto('about:blank');
await p0.addScriptTag({ path: 'build/site/js/schema.js' }); await p0.addScriptTag({ path: 'src/generator/sample.js' });
const data = await p0.evaluate(() => window.PF_SAMPLE()); const STYLES = await p0.evaluate(() => window.PF.STYLES.map(s => s.id)); await p0.close();
fs.writeFileSync(path.join(root, 'sample.json'), JSON.stringify(data));

const { srv, url } = await serve(root);
const only = process.argv[2] ? process.argv[2].split(',') : null;
const out = path.resolve('build/shots'); fs.mkdirSync(out, { recursive: true });
const errors = [];
for (const style of STYLES) for (const mode of ['light', 'dark']) {
  if (only && !only.includes(style)) continue;
  const d = JSON.parse(JSON.stringify(data)); d.design.style = style; d.design.mode = mode;
  fs.writeFileSync(path.join(root, 'portfolio-data.js'), 'window.PORTFOLIO_DATA = ' + JSON.stringify(d) + ';');
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(style + ' ' + e.message)); page.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(style + ' console: ' + m.text()));
  await page.goto(url + '/index.html'); await page.waitForSelector('.hero-name'); await page.evaluate(() => document.fonts.ready); await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); }); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${style}-${mode}-top.png` });
  await page.screenshot({ path: `${out}/${style}-${mode}-full.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (overflow > 0) errors.push(`${style}/${mode}: horizontal overflow ${overflow}px`);
  await page.close();
}
console.log(errors.length ? 'PROBLEMS:\n' + errors.join('\n') : 'no errors'); srv.close(); await browser.close();
