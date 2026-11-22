/*  Theme catalog. When the generator is hosted (http/https) it asks the server for themes/index.json, so a theme the owner
    drops into the themes/ folder shows up here after the next deploy, with no change to this code.
    Opened from disk, or if the request fails, the themes built into this file are used instead.  */
(function (root) {
  'use strict';
  var PF = root.PF, T = root.PF_TEMPLATES, done = false, waiting = [], source = 'built-in';
  function finish() { done = true; waiting.splice(0).forEach(function (f) { f(); }); }
  function apply(list) {
    if (!Array.isArray(list) || !list.length) return;
    Object.keys(T).forEach(function (k) { if (/^css\/themes\//.test(k)) delete T[k]; });
    var styles = list.map(function (t) { T['css/themes/' + t.id + '.css'] = t.css; var c = {}; for (var k in t) if (k !== 'css') c[k] = t[k]; return c; });
    PF.STYLES.length = 0; Array.prototype.push.apply(PF.STYLES, styles);
    source = 'server';
  }
  function load() {
    if (!/^https?:$/.test(root.location.protocol) || !root.fetch) return finish();
    var timer = setTimeout(finish, 4000);   // never hold the page hostage
    root.fetch('themes/index.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { if (!done) apply(j.themes); }).catch(function () {}).then(function () { clearTimeout(timer); if (!done) finish(); });
  }
  root.PFCatalog = { ready: function (fn) { done ? fn() : waiting.push(fn); }, source: function () { return source; } };
  load();
})(window);
