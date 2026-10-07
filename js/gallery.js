/* Qalereya: gallery/items.json faylından foto və videoları oxuyur.
   - #galStage   — avtomatik dəyişən foto paneli
   - #galGrid    — foto/video şəbəkəsi (data-limit="6" olarsa yalnız ilk 6 foto — ana səhifədə)
   - #galFilter  — Hamısı / Foto / Video düymələri
   Faylları gallery/photos və gallery/videos qovluqlarına atın, sonra: node tools/build-gallery.js */
(function () {
    'use strict';

    var stage = document.getElementById('galStage');
    var grid = document.getElementById('galGrid');
    if (!stage && !grid) return;

    var lang = document.documentElement.lang === 'ru' ? 'ru' : 'az';
    var TT = {
        az: { all: 'Hamısı', photo: 'Foto', video: 'Video', empty: 'Qalereya tezliklə doldurulacaq.', prev: 'Əvvəlki', next: 'Növbəti', pause: 'Avtomatik dəyişməni dayandır', play: 'Avtomatik dəyişməni başlat', close: 'Bağla', photoN: 'Fotoşəkil', videoN: 'Video', gallery: 'Qalereya', of: ' / ' },
        ru: { all: 'Все', photo: 'Фото', video: 'Видео', empty: 'Галерея скоро будет заполнена.', prev: 'Назад', next: 'Вперёд', pause: 'Остановить автоматическую смену', play: 'Запустить автоматическую смену', close: 'Закрыть', photoN: 'Фото', videoN: 'Видео', gallery: 'Галерея', of: ' / ' }
    };
    var T = TT[lang];
    var holder = stage || grid;
    var BASE = holder.getAttribute('data-base') || '';   // «../» на страницах русской версии
    // подпись может быть строкой или объектом { "az": "...", "ru": "..." }
    function titleOf(it) { var t = it && it.title; if (t && typeof t === 'object') return t[lang] || t.az || t.ru || ''; return t || ''; }
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var INTERVAL = 5000;

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function icon(name) { var i = el('i', 'bi bi-' + name); i.setAttribute('aria-hidden', 'true'); return i; }
    function safeSrc(s) { return typeof s === 'string' && /^[\w\-./%()~!*]+$/.test(s) && s.indexOf('..') === -1; }

    /* Источник 1 — панель управления (admin.html): Firestore, коллекция logistica_gallery.
       Источник 2 (запасной, пока в панели пусто) — файл gallery/items.json с образцами. */
    var FB = { project: 'rr-logistics-9b299', key: 'AIzaSyCo8EzOZQERwqMWe78MlV2FuuOD2Pd39YQ', col: 'logistica_gallery' };
    var IMG_HOSTS = ['i.postimg.cc', 'postimg.cc', 'i.ibb.co'];
    function remoteImgOk(u) {
        try { var x = new URL(u); return x.protocol === 'https:' && IMG_HOSTS.indexOf(x.hostname) !== -1 && /\.(jpe?g|png|webp|gif|avif)$/i.test(x.pathname); } catch (e) { return false; }
    }
    function fetchRemote() {
        var url = 'https://firestore.googleapis.com/v1/projects/' + FB.project + '/databases/(default)/documents/' + FB.col +
            '?pageSize=300&orderBy=' + encodeURIComponent('timestamp desc') + '&key=' + FB.key;
        return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
            return (j.documents || []).map(function (d) {
                var f = d.fields || {};
                var s = function (k) { return f[k] && f[k].stringValue != null ? f[k].stringValue : ''; };
                var title = { az: s('title_az'), ru: s('title_ru') };
                if (s('type') === 'youtube') return { type: 'youtube', id: s('yt'), title: title };
                return { type: 'photo', src: s('url'), title: title, remote: true };
            });
        });
    }
    function fetchStatic() {
        return fetch(BASE + 'gallery/items.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    }
    fetchRemote().catch(function () { return []; })
        .then(function (r) { return r.length ? r : fetchStatic().catch(function () { return []; }); })
        .then(init);

    function init(raw) {
        var items = (Array.isArray(raw) ? raw : []).filter(function (it) {
            if (!it || typeof it !== 'object') return false;
            if (it.type === 'youtube') return /^[\w-]{6,20}$/.test(it.id || '');
            if (it.remote) return it.type === 'photo' && remoteImgOk(it.src);
            return (it.type === 'photo' || it.type === 'video') && safeSrc(it.src);
        }).map(function (it) {
            var c = {}; for (var k in it) c[k] = it[k];
            c.title = titleOf(it);
            if (c.src && !it.remote) c.src = BASE + c.src;
            if (c.poster && safeSrc(c.poster)) c.poster = BASE + c.poster;
            return c;
        });
        var photos = items.filter(function (i) { return i.type === 'photo'; });
        if (stage) buildStage(photos);
        if (grid) buildGrid(items);
    }

    /* ---------- Avtomatik dəyişən panel ---------- */
    function buildStage(photos) {
        if (!photos.length) { stage.hidden = true; return; }
        var slides = [], dots = [], idx = 0, timer = null, paused = reduced, userPaused = reduced;

        photos.forEach(function (p, i) {
            var fig = el('figure', 'gal-slide');
            fig.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
            var img = el('img');
            img.src = p.src;
            img.alt = p.title || (T.photoN + ' ' + (i + 1));
            img.decoding = 'async';
            if (i > 1) img.loading = 'lazy';
            fig.appendChild(img);
            if (p.title) fig.appendChild(el('figcaption', '', p.title));
            stage.appendChild(fig);
            slides.push(fig);
        });

        var progress = el('div', 'gal-progress'), bar = el('i');
        progress.appendChild(bar);
        stage.appendChild(progress);

        if (photos.length > 1) {
            var prev = el('button', 'gal-btn gal-prev'), next = el('button', 'gal-btn gal-next');
            prev.type = next.type = 'button';
            prev.setAttribute('aria-label', T.prev); next.setAttribute('aria-label', T.next);
            prev.appendChild(icon('chevron-left')); next.appendChild(icon('chevron-right'));
            prev.addEventListener('click', function () { go(idx - 1, true); });
            next.addEventListener('click', function () { go(idx + 1, true); });
            stage.appendChild(prev); stage.appendChild(next);

            var ctr = el('div', 'gal-controls'), dwrap = el('div', 'gal-dots');
            photos.forEach(function (_, i) {
                var d = el('button', 'gal-dot');
                d.type = 'button';
                d.setAttribute('aria-label', T.photoN + ' ' + (i + 1));
                d.addEventListener('click', function () { go(i, true); });
                dwrap.appendChild(d); dots.push(d);
            });
            ctr.appendChild(dwrap); stage.appendChild(ctr);

            var pb = el('button', 'gal-pause');
            pb.type = 'button';
            function pbState() {
                pb.setAttribute('aria-label', userPaused ? T.play : T.pause);
                pb.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
                pb.replaceChildren(icon(userPaused ? 'play-fill' : 'pause-fill'));
            }
            pb.addEventListener('click', function () { userPaused = !userPaused; paused = userPaused; pbState(); schedule(); });
            pbState();
            stage.appendChild(pb);

            stage.addEventListener('mouseenter', function () { paused = true; schedule(); });
            stage.addEventListener('mouseleave', function () { paused = userPaused; schedule(); });
            stage.addEventListener('focusin', function () { paused = true; schedule(); });
            stage.addEventListener('focusout', function () { paused = userPaused; schedule(); });
            document.addEventListener('visibilitychange', schedule);

            var x0 = null;
            stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
            stage.addEventListener('touchend', function (e) {
                if (x0 === null) return;
                var dx = e.changedTouches[0].clientX - x0; x0 = null;
                if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1), true);
            }, { passive: true });
        }

        function schedule() {
            clearTimeout(timer);
            bar.className = ''; void bar.offsetWidth;
            if (photos.length < 2 || paused || document.hidden) return;
            stage.style.setProperty('--gal-ms', INTERVAL + 'ms');
            bar.className = 'run';
            timer = setTimeout(function () { go(idx + 1, false); }, INTERVAL);
        }
        function go(n, byUser) {
            idx = (n + photos.length) % photos.length;
            slides.forEach(function (s, i) {
                var on = i === idx;
                s.classList.toggle('is-active', on);
                s.setAttribute('aria-hidden', on ? 'false' : 'true');
            });
            dots.forEach(function (d, i) {
                d.classList.toggle('is-active', i === idx);
                if (i === idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
            });
            schedule();
        }
        go(0, false);
    }

    /* ---------- Şəbəkə + süzgəc + böyütmə ---------- */
    function buildGrid(items) {
        var limit = parseInt(grid.getAttribute('data-limit'), 10) || 0;
        var filterBox = document.getElementById('galFilter');
        var list = limit ? items.filter(function (i) { return i.type === 'photo'; }).slice(0, limit) : items;
        var current = list;

        if (!list.length) { grid.appendChild(el('p', 'gal-empty', T.empty)); if (filterBox) filterBox.hidden = true; return; }

        var hasPhoto = list.some(function (i) { return i.type === 'photo'; });
        var hasVideo = list.some(function (i) { return i.type !== 'photo'; });
        if (filterBox && hasPhoto && hasVideo) {
            [['all', T.all], ['photo', T.photo], ['video', T.video]].forEach(function (f) {
                var b = el('button', '', f[1]);
                b.type = 'button';
                b.setAttribute('aria-pressed', f[0] === 'all' ? 'true' : 'false');
                b.addEventListener('click', function () {
                    [].forEach.call(filterBox.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
                    current = list.filter(function (i) { return f[0] === 'all' || (f[0] === 'photo' ? i.type === 'photo' : i.type !== 'photo'); });
                    draw();
                });
                filterBox.appendChild(b);
            });
        } else if (filterBox) { filterBox.hidden = true; }

        function draw() {
            grid.replaceChildren();
            current.forEach(function (it, i) {
                var b = el('button', 'gal-item');
                b.type = 'button';
                var label = it.title || (it.type === 'photo' ? T.photoN : T.videoN) + ' ' + (i + 1);
                b.setAttribute('aria-label', label);
                if (it.type === 'photo') {
                    var img = el('img'); img.src = it.src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
                    b.appendChild(img);
                } else if (it.type === 'video') {
                    var v = el('video'); v.src = it.src + '#t=0.5'; v.preload = 'metadata'; v.muted = true; v.setAttribute('playsinline', '');
                    if (it.poster) v.poster = it.poster;
                    b.appendChild(v);
                    b.appendChild(el('span', 'gal-badge', T.videoN));
                    var pl = el('span', 'gal-play'); pl.appendChild(icon('play-fill')); b.appendChild(pl);
                } else {
                    var yt = el('img'); yt.src = 'https://i.ytimg.com/vi/' + it.id + '/hqdefault.jpg'; yt.alt = ''; yt.loading = 'lazy';
                    b.appendChild(yt);
                    b.appendChild(el('span', 'gal-badge', T.videoN));
                    var pl2 = el('span', 'gal-play'); pl2.appendChild(icon('play-fill')); b.appendChild(pl2);
                }
                if (it.title) b.appendChild(el('span', 'gal-cap', it.title));
                b.addEventListener('click', function () { openBox(i); });
                grid.appendChild(b);
            });
        }
        draw();

        /* böyütmə pəncərəsi */
        var box = null, body, cap, count, at = 0;
        function ensureBox() {
            if (box) return;
            box = el('dialog', 'gal-lightbox');
            box.setAttribute('aria-label', T.gallery);
            body = el('div', 'gal-lb-body'); cap = el('div', 'gal-lb-cap'); count = el('div', 'gal-lb-count');
            var close = el('button', 'gal-lb-close'), pr = el('button', 'gal-lb-prev'), nx = el('button', 'gal-lb-next');
            close.type = pr.type = nx.type = 'button';
            close.setAttribute('aria-label', T.close); pr.setAttribute('aria-label', T.prev); nx.setAttribute('aria-label', T.next);
            close.appendChild(icon('x-lg')); pr.appendChild(icon('chevron-left')); nx.appendChild(icon('chevron-right'));
            close.addEventListener('click', function () { box.close(); });
            pr.addEventListener('click', function () { show(at - 1); });
            nx.addEventListener('click', function () { show(at + 1); });
            box.addEventListener('click', function (e) { if (e.target === box || e.target === body) box.close(); });
            box.addEventListener('close', function () { body.replaceChildren(); });
            box.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowLeft') { show(at - 1); } else if (e.key === 'ArrowRight') { show(at + 1); }
            });
            [close, count, pr, nx, body, cap].forEach(function (n) { box.appendChild(n); });
            document.body.appendChild(box);
        }
        function show(n) {
            at = (n + current.length) % current.length;
            var it = current[at];
            body.replaceChildren();
            if (it.type === 'photo') {
                var im = el('img'); im.src = it.src; im.alt = it.title || (T.photoN + ' ' + (at + 1)); body.appendChild(im);
            } else if (it.type === 'video') {
                var v = el('video'); v.src = it.src; v.controls = true; v.autoplay = true; v.setAttribute('playsinline', '');
                if (it.poster) v.poster = it.poster;
                body.appendChild(v);
            } else {
                var f = el('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + it.id + '?rel=0'; f.title = it.title || T.videoN;
                f.allow = 'accelerometer; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
                body.appendChild(f);
            }
            cap.textContent = it.title || '';
            count.textContent = (at + 1) + T.of + current.length;
        }
        function openBox(n) {
            ensureBox();
            show(n);
            if (!box.open) box.showModal();
        }
    }
})();
