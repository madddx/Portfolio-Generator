// Builds everything into dist/:  index.html (the generator, ONE file)  and  gallery.html (all themes side by side).
// Also assembles build/site/ — the website template — which the tests use.
import fs from 'node:fs'; import path from 'node:path';
import { checkAll } from './tools/check-themes.mjs';
const R = p => fs.readFileSync(p, 'utf8');
const W = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const tag = src => '<script>' + safe(src) + '</script>';
const jsonInScript = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const fill = (html, map) => html.replace(/<!--@([\w.-]+)-->/g, (_, k) => { if (!(k in map)) throw new Error('missing ' + k); return map[k]; });

// 1. quality gate
const checks = checkAll('themes'); let failed = false;
for (const r of checks) { if (r.errors.length) { failed = true; console.error(`✗ theme "${r.id}"`); r.errors.forEach(e => console.error('    ' + e)); } r.warnings.forEach(w => console.warn(`  warn ${r.id}: ${w}`)); }
if (failed) { console.error('\nBuild stopped: fix the theme errors above (npm run check-themes).'); process.exit(1); }

// 2. registry: newest first, then by "order", then by name
const themes = checks.map(r => ({ meta: r.meta, css: R(`themes/${r.id}/theme.css`), thumb: R(`themes/${r.id}/thumb.svg`).trim() }))
  .sort((a, b) => b.meta.released.localeCompare(a.meta.released) || (a.meta.order ?? 100) - (b.meta.order ?? 100) || a.meta.name.localeCompare(b.meta.name));
const styles = themes.map(t => ({ id: t.meta.id, name: t.meta.name, blurb: t.meta.blurb, released: t.meta.released, fonts: t.meta.fonts, accent: t.meta.accent, swatch: t.meta.swatch, thumb: t.thumb }));

// 3. website template (build/site)
fs.rmSync('build/site', { recursive: true, force: true }); fs.cpSync('src/site', 'build/site', { recursive: true });
const schema = R('src/site/js/schema.js'); if (!schema.includes('/*@@STYLES@@*/[]')) throw new Error('schema.js lost its STYLES marker');
W('build/site/js/schema.js', schema.replace('/*@@STYLES@@*/[]', () => JSON.stringify(styles)));
for (const t of themes) W(`build/site/css/themes/${t.meta.id}.css`, t.css);
const templates = { 'index.html': R('build/site/index.html'), 'css/base.css': R('build/site/css/base.css'), 'js/schema.js': R('build/site/js/schema.js'), 'js/renderer.js': R('build/site/js/renderer.js') };
for (const t of themes) templates[`css/themes/${t.meta.id}.css`] = t.css;

const css = '<style>' + R('src/editor/tool.css') + '</style>';
const common = { 'tool.css': css, 'schema.js': tag(templates['js/schema.js']), 'editor.js': tag(R('src/editor/editor.js')), 'preview.js': tag(R('src/editor/preview.js')),
  'sample.js': tag(R('src/generator/sample.js')), 'assemble.js': tag(R('src/generator/assemble.js')), 'catalog.js': tag(R('src/generator/catalog.js')), 'templates': '<script>window.PF_TEMPLATES=' + jsonInScript(templates) + ';</script>' };

// 4. admin.html (ships inside every generated site; schema + data load from beside it)
templates['admin.html'] = fill(R('src/admin/admin.html'), { 'tool.css': css, 'editor.js': common['editor.js'], 'preview.js': common['preview.js'], 'admin.js': tag(R('src/admin/admin.js')) });
common['templates'] = '<script>window.PF_TEMPLATES=' + jsonInScript(templates) + ';</script>';

// 5. generator + gallery
fs.mkdirSync('dist', { recursive: true });
const gen = fill(R('src/generator/generator.html'), { ...common, jszip: tag(R('node_modules/jszip/dist/jszip.min.js')), 'generator.js': tag(R('src/generator/generator.js')) });
W('dist/index.html', gen);
const gal = fill(R('src/gallery/gallery.html'), { ...common, 'gallery.js': tag(R('src/gallery/gallery.js')) });
W('dist/gallery.html', gal);
// 6. the hosted catalog: dist/themes/index.json (everything the generator needs to offer every theme in this folder)
W('dist/themes/index.json', JSON.stringify({ generated: new Date().toISOString(), themes: themes.map((t, i) => ({ ...styles[i], css: t.css })) }));
console.log(`built ${themes.length} themes → dist/index.html ${(gen.length / 1024).toFixed(0)} KB · dist/gallery.html ${(gal.length / 1024).toFixed(0)} KB · admin.html ${(templates['admin.html'].length / 1024).toFixed(0)} KB`);
