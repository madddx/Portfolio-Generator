// npm run dev — rebuilds whenever you save a file in themes/ or src/.
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
let t; const run = () => { const r = spawnSync(process.execPath, ['build.mjs'], { stdio: 'inherit' }); if (r.status === 0) console.log('  ✓ rebuilt ' + new Date().toLocaleTimeString() + ' — refresh dist/gallery.html'); };
run();
for (const dir of ['themes', 'src']) fs.watch(dir, { recursive: true }, (_, f) => { if (!f || /\.(swp|tmp)$|~$/.test(f)) return; clearTimeout(t); t = setTimeout(run, 250); });
console.log('Watching themes/ and src/ … (Ctrl+C to stop)');
