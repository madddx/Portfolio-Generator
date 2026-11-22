# Portfolio generator

Visitors fill in a form, pick a style and a colour mode, and download a ready-to-publish portfolio site.
The site ships with its own `admin.html`, so they never need the generator again, except to try a new style.

Everything runs in the browser. There is no server, database or account.

## 1. Put it online with Vercel (about 10 minutes)

You need a free [GitHub](https://github.com) account and a free [Vercel](https://vercel.com) account.

1. **Extract the zip.** On Windows: right-click the `.zip` → **Properties** → tick **Unblock** → **OK**, then **Extract All**.
2. **Upload the folder to a new GitHub repository.** On github.com click **New repository**, then **uploading an existing file**, and drag in the *contents* of the extracted folder (`package.json`, `build.mjs`, `themes/`, `src/` and so on). Do not upload `node_modules`.
3. **Import it in Vercel.** Vercel → **Add New… → Project** → pick the repository → **Deploy**. Nothing to change: `vercel.json` already sets the build command (`npm run build`) and the output folder (`dist`).
4. Open the address Vercel gives you. Visitors land on a welcome page (`index.html`) and press **Start generating** to reach the generator (`generate.html`). Add your own domain under **Settings → Domains**.

Prefer no GitHub? Run `npm install` then `npm run build` on your computer and drag the **`dist`** folder onto vercel.com/new. New themes then need another `npm run build` and re-upload.

## 2. Ship a new theme (the weekly routine)

All themes live in one folder: **`themes/`**. One folder per theme:

```
themes/
  aurora/   theme.json  theme.css  thumb.svg
  slate/    theme.json  theme.css  thumb.svg
  ...
```

**Add a theme:** put its folder in `themes/` and commit/upload it to GitHub. Vercel rebuilds by itself, and the new theme appears in the generator and in the gallery a minute later. No code changes.

**Remove a theme:** delete its folder from `themes/`. It disappears from the generator after the next deploy. Sites people already downloaded keep working and keep their style.

Making the theme (on your computer):

```bash
npm install
npm run new-theme -- sunrise "Sunrise"     # creates themes/sunrise/ from the template (add  --from slate  to start from an existing one)
npm run dev                                # rebuilds on every save. Keep dist/gallery.html open and refresh to see all themes
npm run check-themes                       # contrast, both modes, scoping. Must pass
```

Then set `"released"` in `theme.json` to the launch date (themes are shown newest first, with a **New** badge for 14 days), and upload the folder.
**If a theme fails the check, the deploy fails and the old version stays live.** Nothing broken ever reaches visitors. Check the build log in Vercel.

`/gallery.html` on your live site shows every theme side by side, in light and dark, on desktop and phone. Share it with visitors if you like.

How the sync works: `npm run build` runs the checks, then writes `dist/themes/index.json` (every theme and its CSS). The hosted generator downloads that file when it opens, so it always shows exactly what is in `themes/`. If that download fails, or the file is opened from disk, it falls back to the themes baked into the page.

## 3. Clients who want a new theme

1. Open your generator website.
2. **Project → Open my site (.zip)…** (or the *Upload it to change the style* button on the first step) and choose the zip they downloaded earlier. A `portfolio-data.js` on its own also works.
3. Their content and photos load. The **Design** step opens, showing every current theme including the newest.
4. Pick a theme, check the preview, press **Download site**, then publish the new folder in place of the old one.

Their words, photos, section order and colours are kept.

## What a visitor gets (the zip)

| File | Purpose |
| --- | --- |
| `index.html` | The site. Reads `portfolio-data.js` and renders it. |
| `admin.html` | Editor with live preview. Saves by downloading a new `portfolio-data.js`. |
| `portfolio-data.js` | All content, settings and photos (images are resized and stored inline). |
| `css/base.css`, `css/themes/*.css` | Shared layout plus every theme that existed when they downloaded. |
| `js/schema.js`, `js/renderer.js` | Data defaults and the renderer. |

Works from `file://` too, because the data is a script file rather than a `fetch`ed JSON.

## Layout of this repo

```
themes/          ONE FOLDER PER THEME  (theme.json, theme.css, thumb.svg). The only place you add or remove themes
src/site/        the generated website (index.html, renderer, base.css)
src/editor/      the editor used by BOTH the generator and the admin page, plus preview + UI css
src/generator/   generator shell (zip export, import, drafts), theme catalog loader, sample content
src/admin/       admin shell (load / save / drafts)
src/gallery/     the theme gallery page
src/landing/     the welcome page (live demo cycling through the themes)
src/brand/       favicon (SVG + PNG). Replace these to change the icon; the tab title is in each page's <title>
tools/           new-theme scaffold, theme checker, dev watcher
build.mjs        checks themes, then writes dist/ (index.html landing, generate.html, gallery.html, themes/index.json, icons)
vercel.json      tells Vercel how to build and serve
test/            end-to-end, mobile, gallery and catalog tests (node test/<name>.mjs)
```

Because the editor is shared, a new field added in `src/editor/editor.js` appears in the generator and in every admin page at once.

## Add a section

1. `SECTIONS` in `src/site/js/schema.js`, and the empty value in `emptyData()`.
2. A builder in `BUILD` and a filter in `FILTER` in `src/site/js/renderer.js`.
3. A panel in `PANELS` and `CONTENT` in `src/editor/editor.js`.

## Troubleshooting (Windows)

- **Zip won't extract, or "Windows found that this file is potentially harmful":** Windows marks downloads as untrusted.
  Right-click the `.zip` → **Properties** → tick **Unblock** → **OK**, then extract again. Use **Extract All**, not drag-out.
- **Never double-click `portfolio-data.js`.** Windows tries to run `.js` files as programs. It is only content.
  Open `index.html` (the site) or `admin.html` (the editor) instead. Right-click → Properties → Unblock also works for a freshly saved data file.
- Still stuck? Extract with [7-Zip](https://www.7-zip.org).

## Notes

- Updating a site means replacing `portfolio-data.js`. The admin page can't change a live site by itself, so it is safe to leave published.
- Fonts come from Google Fonts and icons from Font Awesome 6.5 on cdnjs.
- Tests need Playwright (globally installed), plus the `@fontsource/*` and Font Awesome devDependencies to serve fonts offline. Vercel skips those.
- A client's own admin page only knows the themes in their zip. To get newer ones they re-open their zip in the generator (section 3).
