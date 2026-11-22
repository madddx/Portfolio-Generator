import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
const NM = path.resolve('node_modules');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.zip': 'application/zip', '.png': 'image/png' };

export function serve(dir, port = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('nf'); }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    }).listen(port, '127.0.0.1', () => res({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}

// Serve Google Fonts + Font Awesome from node_modules so screenshots show the real typography offline.
export async function installAssetRoutes(context) {
  await context.route('https://fonts.googleapis.com/**', route => {
    const u = new URL(route.request().url()); let css = '';
    for (const fam of u.searchParams.getAll('family')) {
      const name = fam.split(':')[0]; const slug = name.toLowerCase().replace(/\s+/g, '-'); const italic = /ital/.test(fam);
      for (const w of [400, 500, 600, 700, 800]) for (const sty of italic ? ['', '-italic'] : ['']) {
        const f = path.join(NM, '@fontsource', slug, `${w}${sty}.css`); if (!fs.existsSync(f)) continue;
        css += fs.readFileSync(f, 'utf8').replace(/url\(\.\/files\/([^)]+)\)/g, `url(https://fonts.gstatic.com/fs/${slug}/$1)`);
      }
    }
    route.fulfill({ contentType: 'text/css', body: css });
  });
  await context.route('https://fonts.gstatic.com/fs/**', route => {
    const m = route.request().url().match(/fs\/([^/]+)\/(.+)$/); const f = path.join(NM, '@fontsource', m[1], 'files', m[2]);
    fs.existsSync(f) ? route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: '' });
  });
  const FA = path.join(NM, '@fortawesome/fontawesome-free');
  await context.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css', route =>
    route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(FA, 'css/all.min.css'), 'utf8').replace(/\.\.\/webfonts\//g, 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/') }));
  await context.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/**', route => {
    const f = path.join(FA, 'webfonts', route.request().url().split('/').pop().split('?')[0]);
    fs.existsSync(f) ? route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: '' });
  });
}
