#!/usr/bin/env node
/* Сборка публичной папки сайта (public/) при публикации на Vercel.
 * В неё попадают только файлы, нужные посетителям. Служебное (tools/, gallery/README.md, vercel.json, .vercelignore,
 * gallery/titles.json, gallery/youtube.txt) наружу не публикуется.
 * Перед копированием обновляется список галереи (gallery/items.json). */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public');

execFileSync(process.execPath, [path.join(__dirname, 'build-gallery.js')], { stdio: 'inherit' });

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copy = (rel) => {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, path.join(out, rel), { recursive: true });
};

for (const f of fs.readdirSync(root)) if (f.endsWith('.html')) copy(f);
['robots.txt', 'sitemap.xml', '0263c939f47b379ab072220a8ffa5ac3.txt', 'css', 'js', 'img', 'lib', 'ru', 'en'].forEach(copy);
copy('gallery/items.json');
copy('gallery/photos');
copy('gallery/videos');

// ---- минификация (только в public/; исходные файлы остаются читаемыми) ----
// Если пакеты не установились, сборка не падает: сайт просто публикуется без сжатия.
async function minifyAll() {
  let terser, csso, hm;
  try { terser = require('terser'); csso = require('csso'); hm = require('html-minifier-terser'); } catch (e) { console.log('минификация пропущена:', e.message); return; }
  const files = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } })(out);
  let before = 0, after = 0, count = 0;
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!['.html', '.css', '.js', '.json'].includes(ext)) continue;
    const src = fs.readFileSync(f, 'utf8');
    let res = src;
    try {
      if (ext === '.html') {
        res = await hm.minify(src, { collapseWhitespace: true, conservativeCollapse: true, removeComments: true, minifyCSS: true, minifyJS: false,
          removeRedundantAttributes: false, removeAttributeQuotes: false, decodeEntities: false, keepClosingSlash: true });
      } else if (ext === '.css') {
        res = csso.minify(src, { restructure: false, comments: 'exclamation' }).css;
      } else if (ext === '.js') {
        if (/.min.js$/.test(f)) continue;
        const r = await terser.minify(src, { compress: { passes: 2 }, mangle: true, format: { comments: /^!|@license|@preserve/ } });
        res = r.code;
      } else if (ext === '.json') {
        res = JSON.stringify(JSON.parse(src));
      }
    } catch (e) { console.log('не удалось сжать', path.relative(out, f), '-', e.message); continue; }
    if (res && res.length < src.length) { fs.writeFileSync(f, res); before += src.length; after += res.length; count += 1; }
  }
  console.log(`минификация: ${count} файлов, ${(before / 1024).toFixed(0)} КБ -> ${(after / 1024).toFixed(0)} КБ`);
}

// счётчик для журнала сборки
let n = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else n += 1; } })(out);
console.log(`public/: ${n} файлов`);
minifyAll().catch((e) => { console.log('минификация пропущена:', e.message); });
