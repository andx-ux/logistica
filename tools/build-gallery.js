#!/usr/bin/env node
/* Qalereya siyahısını (gallery/items.json) qovluqlardakı fayllardan yığır.
 *
 *   gallery/photos/   — şəkillər (jpg, jpeg, png, webp, gif, avif)
 *   gallery/videos/   — videolar (mp4, webm, m4v, ogv); eyni adlı şəkil (məs. tur.mp4 + tur.jpg) video üçün ön görüntü olur
 *   gallery/youtube.txt  — hər sətirdə bir YouTube linki və ya video ID (istəyə bağlı; böyük videolar üçün ən yaxşı yol)
 *   gallery/titles.json  — istəyə bağlı başlıqlar: { "foto-1.jpg": "Anbarda yüklənmə" }
 *
 * İşə salmaq:  node tools/build-gallery.js
 * Fayllar ada görə (əlifba/rəqəm sırası ilə) düzülür: 01-..., 02-... kimi adlandırıb sıranı idarə edə bilərsiniz.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'gallery');
const PHOTO = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO = /\.(mp4|webm|m4v|ogv)$/i;
const enc = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith('.')).sort((a, b) => a.localeCompare(b, 'az', { numeric: true })) : []);

let titles = {};
try { titles = JSON.parse(fs.readFileSync(path.join(root, 'titles.json'), 'utf8')); } catch { /* başlıqsız */ }

const items = [];
for (const f of list(path.join(root, 'photos')).filter((x) => PHOTO.test(x))) {
  items.push({ type: 'photo', src: enc(`gallery/photos/${f}`), title: titles[f] || '' });
}
const vdir = path.join(root, 'videos');
const vfiles = list(vdir);
for (const f of vfiles.filter((x) => VIDEO.test(x))) {
  const base = f.replace(/\.[^.]+$/, '');
  const poster = vfiles.find((x) => PHOTO.test(x) && x.replace(/\.[^.]+$/, '') === base);
  const it = { type: 'video', src: enc(`gallery/videos/${f}`), title: titles[f] || '' };
  if (poster) it.poster = enc(`gallery/videos/${poster}`);
  items.push(it);
}
try {
  const lines = fs.readFileSync(path.join(root, 'youtube.txt'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  for (const l of lines) {
    const m = l.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,20})/) || l.match(/^([\w-]{6,20})$/);
    if (m) items.push({ type: 'youtube', id: m[1], title: titles[m[1]] || '' });
    else console.warn('YouTube linki başa düşülmədi:', l);
  }
} catch { /* youtube.txt yoxdur */ }

fs.writeFileSync(path.join(root, 'items.json'), JSON.stringify(items, null, 2) + '\n');
console.log(`gallery/items.json: ${items.filter((i) => i.type === 'photo').length} foto, ${items.filter((i) => i.type !== 'photo').length} video`);
