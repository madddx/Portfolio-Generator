/*  Builds one self-contained HTML document from the site templates (used by the preview and the theme gallery). */
(function (root) {
  'use strict';
  var PF = root.PF;
  function safeJSON(o) { return JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
  function safeScript(s) { return s.replace(/<\/script/gi, '<\\/script'); }
  // data === null → wait for the parent window to post it (live preview). Otherwise render that data directly.
  function inlineDoc(T, data) {
    var html = T['index.html'];
    html = html.replace('<link rel="stylesheet" href="css/base.css">', function () { return '<style>' + T['css/base.css'] + '</style>'; });
    var themes = PF.STYLES.map(function (s) { return '<style data-theme-css="' + s.id + '" media="not all">' + T['css/themes/' + s.id + '.css'] + '</style>'; }).join('');
    html = html.replace('</head>', function () { return themes + '</head>'; });
    html = html.replace('<script src="portfolio-data.js"></script>', function () { return data ? '<script>window.PORTFOLIO_DATA=' + safeJSON(data) + ';</script>' : '<script>window.__PF_PREVIEW=true;</script>'; });
    html = html.replace('<script src="js/schema.js"></script>', function () { return '<script>' + safeScript(T['js/schema.js']) + '</script>'; });
    html = html.replace('<script src="js/renderer.js"></script>', function () { return '<script>' + safeScript(T['js/renderer.js']) + '</script>'; });
    return html;
  }
  root.PFAssemble = { inlineDoc: inlineDoc };
})(window);
