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
['robots.txt', 'sitemap.xml', '0263c939f47b379ab072220a8ffa5ac3.txt', 'css', 'js', 'img', 'lib', 'ru'].forEach(copy);
copy('gallery/items.json');
copy('gallery/photos');
copy('gallery/videos');

// счётчик для журнала сборки
let n = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else n += 1; } })(out);
console.log(`public/: ${n} файлов`);
