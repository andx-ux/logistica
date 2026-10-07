/* Панель управления галереей (admin.html).
   Вход — по e-mail и паролю администратора (Firebase Authentication, отдельный проект rr-logistics-9b299).
   Данные галереи — коллекция «logistica_gallery» в Firestore; сайт читает её напрямую (js/gallery.js).
   Фото — по прямой ссылке (postimages.org), видео — ссылка на YouTube.
   Работает без сторонних скриптов: запросы идут на REST-интерфейсы Firebase. */
(function () {
    'use strict';

    var FB = {
        project: 'rr-logistics-9b299',
        key: 'AIzaSyCo8EzOZQERwqMWe78MlV2FuuOD2Pd39YQ',   // публичный ключ веб-приложения Firebase (не секрет)
        col: 'logistica_gallery'
    };
    // Войти в панель могут только эти адреса. Настоящая защита — правила Firestore (см. инструкцию в admin.html).
    var ADMIN_EMAILS = ['anaris0909@gmail.com'];
    var IMG_HOSTS = ['i.postimg.cc', 'postimg.cc', 'i.ibb.co'];
    var DOCS = 'https://firestore.googleapis.com/v1/projects/' + FB.project + '/databases/(default)/documents';

    var $ = function (id) { return document.getElementById(id); };
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

    var session = null;      // { idToken, refreshToken, expires, email }
    var items = [];

    /* ---------- хранение сессии ---------- */
    // Вход хранится в sessionStorage (исчезает при закрытии вкладки). Если отмечено «Запомнить на этом компьютере» — в localStorage.
    var remember = false;
    function saveSession() {
        try {
            localStorage.removeItem('rr_admin'); sessionStorage.removeItem('rr_admin');
            if (session) (remember ? localStorage : sessionStorage).setItem('rr_admin', JSON.stringify({ r: session.refreshToken, e: session.email }));
        } catch (e) { /* без запоминания */ }
    }
    function loadSaved() {
        try {
            var s = sessionStorage.getItem('rr_admin');
            if (s) return JSON.parse(s);
            s = localStorage.getItem('rr_admin');
            if (s) { remember = true; return JSON.parse(s); }
        } catch (e) { /* пусто */ }
        return null;
    }

    /* ---------- вход ---------- */
    var AUTH_ERR = {
        INVALID_LOGIN_CREDENTIALS: 'Неверная почта или пароль.',
        INVALID_PASSWORD: 'Неверная почта или пароль.',
        EMAIL_NOT_FOUND: 'Неверная почта или пароль.',
        INVALID_EMAIL: 'Введите корректный адрес почты.',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'Слишком много попыток. Подождите несколько минут и попробуйте снова.',
        USER_DISABLED: 'Этот аккаунт отключён.'
    };
    function authMsg(m) { var k = String(m || '').split(' ')[0]; return AUTH_ERR[k] || ('Ошибка входа: ' + (m || 'нет ответа')); }

    function post(url, body) {
        return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error((j.error && j.error.message) || r.status); e.status = r.status; throw e; } return j; }); });
    }
    function setSession(j, email) {
        session = { idToken: j.idToken || j.id_token, refreshToken: j.refreshToken || j.refresh_token, expires: Date.now() + (Number(j.expiresIn || j.expires_in) - 60) * 1000, email: email || (session && session.email) };
        saveSession();
    }
    function login(email, password) {
        return post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FB.key, { email: email, password: password, returnSecureToken: true })
            .then(function (j) {
                if (ADMIN_EMAILS.indexOf(String(j.email).toLowerCase()) === -1) { var e = new Error('NOT_ADMIN'); throw e; }
                setSession(j, j.email);
            });
    }
    function refresh() {
        return post('https://securetoken.googleapis.com/v1/token?key=' + FB.key, { grant_type: 'refresh_token', refresh_token: session.refreshToken }).then(function (j) { setSession(j); });
    }
    function token() {
        if (!session) return Promise.reject(new Error('NO_SESSION'));
        return (Date.now() < session.expires ? Promise.resolve() : refresh()).then(function () { return session.idToken; });
    }

    /* ---------- Firestore (REST) ---------- */
    function api(method, path, body) {
        return token().then(function (t) {
            return fetch(DOCS + path, { method: method, headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        }).then(function (r) {
            if (r.status === 204 || (method === 'DELETE' && r.ok)) return {};
            return r.json().then(function (j) {
                if (!r.ok) { var e = new Error((j.error && j.error.message) || r.status); e.status = r.status; throw e; }
                return j;
            });
        });
    }
    function sv(s) { return { stringValue: String(s || '') }; }
    function docToItem(d) {
        var f = d.fields || {};
        var g = function (k) { return f[k] && f[k].stringValue != null ? f[k].stringValue : ''; };
        return { id: d.name.split('/').pop(), type: g('type'), url: g('url'), yt: g('yt'), az: g('title_az'), ru: g('title_ru'), ts: f.timestamp ? Number(f.timestamp.integerValue || 0) : 0 };
    }
    function loadItems() {
        return api('GET', '/' + FB.col + '?pageSize=300&orderBy=' + encodeURIComponent('timestamp desc')).then(function (j) {
            items = (j.documents || []).map(docToItem);
            draw();
        });
    }
    function add(it) {
        return api('POST', '/' + FB.col, { fields: {
            type: sv(it.type), url: sv(it.url), yt: sv(it.yt), title_az: sv(it.az), title_ru: sv(it.ru),
            timestamp: { integerValue: String(it.ts) }
        } });
    }
    function patch(id, fields, mask) {
        return api('PATCH', '/' + FB.col + '/' + encodeURIComponent(id) + '?' + mask.map(function (m) { return 'updateMask.fieldPaths=' + m; }).join('&'), { fields: fields });
    }

    /* ---------- проверка ссылок ---------- */
    function imgUrlOk(u) {
        try { var x = new URL(u); return x.protocol === 'https:' && IMG_HOSTS.indexOf(x.hostname) !== -1 && /\.(jpe?g|png|webp|gif|avif)$/i.test(x.pathname); } catch (e) { return false; }
    }
    function ytId(s) {
        s = String(s || '').trim();
        var m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{6,20})/) || s.match(/^([\w-]{11})$/);
        return m ? m[1] : '';
    }
    function lines(v) { return String(v || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }

    /* ---------- интерфейс ---------- */
    function show(screen) { $('loginScreen').hidden = screen !== 'login'; $('panel').hidden = screen !== 'panel'; }
    function note(id, text, ok) { var n = $(id); n.textContent = text || ''; n.className = 'adm-note ' + (ok ? 'ok' : 'err'); n.hidden = !text; }
    function explain(e) {
        if (e && (e.status === 403 || /PERMISSION_DENIED|Missing or insufficient/i.test(e.message))) return 'Нет прав на запись. Добавьте правило Firestore из инструкции внизу страницы (шаг 1) и нажмите «Опубликовать».';
        if (e && e.message === 'NO_SESSION') return 'Сессия закончилась — войдите снова.';
        return 'Ошибка: ' + (e && e.message ? e.message : e);
    }

    function draw() {
        var box = $('list');
        box.replaceChildren();
        $('count').textContent = items.length ? '(' + items.length + ')' : '';
        if (!items.length) { box.appendChild(el('p', 'adm-empty', 'Пока ничего нет. Пока галерея пуста, на сайте показываются образцы из шаблона — добавьте первое фото или видео выше.')); return; }
        items.forEach(function (it, i) {
            var card = el('div', 'adm-item');
            var th = el('div', 'adm-thumb');
            var img = el('img');
            img.alt = '';
            img.loading = 'lazy';
            img.src = it.type === 'youtube' ? 'https://i.ytimg.com/vi/' + it.yt + '/hqdefault.jpg' : it.url;
            th.appendChild(img);
            if (it.type === 'youtube') th.appendChild(el('span', 'adm-badge', 'YouTube'));
            card.appendChild(th);
            var cap = el('div', 'adm-cap');
            cap.appendChild(el('b', '', it.az || it.ru || (it.type === 'youtube' ? 'Видео' : 'Фото')));
            if (it.az && it.ru) cap.appendChild(el('small', '', it.ru));
            card.appendChild(cap);
            var act = el('div', 'adm-actions');
            function btn(label, title, fn) { var b = el('button', 'adm-btn-sm', label); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.addEventListener('click', fn); return b; }
            var up = btn('▲', 'Выше', function () { move(i, -1); }); up.disabled = i === 0;
            var dn = btn('▼', 'Ниже', function () { move(i, 1); }); dn.disabled = i === items.length - 1;
            act.appendChild(up); act.appendChild(dn);
            act.appendChild(btn('✎', 'Изменить подпись', function () { rename(it); }));
            act.appendChild(btn('🗑', 'Удалить', function () { remove(it); }));
            card.appendChild(act);
            box.appendChild(card);
        });
    }

    function busy(b, on, label) { b.disabled = on; if (label) b.textContent = on ? 'Подождите…' : label; }

    function move(i, d) {
        var a = items[i], b = items[i + d];
        if (!a || !b) return;
        Promise.all([
            patch(a.id, { timestamp: { integerValue: String(b.ts) } }, ['timestamp']),
            patch(b.id, { timestamp: { integerValue: String(a.ts) } }, ['timestamp'])
        ]).then(loadItems).catch(function (e) { note('listNote', explain(e)); });
    }
    function rename(it) {
        var az = window.prompt('Подпись на азербайджанском (можно пусто):', it.az);
        if (az === null) return;
        var ru = window.prompt('Подпись на русском (можно пусто):', it.ru);
        if (ru === null) return;
        patch(it.id, { title_az: sv(az.trim().slice(0, 150)), title_ru: sv(ru.trim().slice(0, 150)) }, ['title_az', 'title_ru'])
            .then(loadItems).catch(function (e) { note('listNote', explain(e)); });
    }
    function remove(it) {
        if (!window.confirm('Удалить этот элемент из галереи?\n(Файл на postimages/YouTube не удаляется — он просто пропадёт с сайта.)')) return;
        api('DELETE', '/' + FB.col + '/' + encodeURIComponent(it.id)).then(loadItems).catch(function (e) { note('listNote', explain(e)); });
    }

    /* фото: превью первой ссылки */
    function previewPhoto() {
        var first = lines($('photoUrls').value)[0];
        var pv = $('photoPreview');
        if (first && imgUrlOk(first)) { pv.src = first; pv.hidden = false; } else { pv.hidden = true; pv.removeAttribute('src'); }
    }
    function previewYt() {
        var id = ytId(lines($('ytUrls').value)[0]);
        var pv = $('ytPreview');
        if (id) { pv.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; pv.hidden = false; } else { pv.hidden = true; pv.removeAttribute('src'); }
    }

    function addMany(kind) {
        var btn = kind === 'photo' ? $('addPhoto') : $('addYt');
        var noteId = kind === 'photo' ? 'photoNote' : 'ytNote';
        var raw = lines($(kind === 'photo' ? 'photoUrls' : 'ytUrls').value);
        var az = $(kind === 'photo' ? 'photoAz' : 'ytAz').value.trim().slice(0, 150);
        var ru = $(kind === 'photo' ? 'photoRu' : 'ytRu').value.trim().slice(0, 150);
        if (!raw.length) { note(noteId, kind === 'photo' ? 'Вставьте хотя бы одну ссылку на фото.' : 'Вставьте хотя бы одну ссылку на видео.'); return; }
        var list = [];
        for (var i = 0; i < raw.length; i++) {
            if (kind === 'photo') {
                if (!imgUrlOk(raw[i])) { note(noteId, 'Ссылка №' + (i + 1) + ' не подходит. Нужна «прямая ссылка» на картинку с postimages.org (адрес вида https://i.postimg.cc/…/foto.jpg).'); return; }
                list.push({ type: 'photo', url: raw[i], yt: '' });
            } else {
                var id = ytId(raw[i]);
                if (!id) { note(noteId, 'Ссылка №' + (i + 1) + ' не похожа на ссылку YouTube.'); return; }
                list.push({ type: 'youtube', url: '', yt: id });
            }
        }
        note(noteId, '');
        busy(btn, true);
        var base = Date.now();
        // по одному, чтобы сохранить порядок: первая ссылка в списке окажется выше остальных
        list.reduce(function (p, it, k) {
            return p.then(function () { return add({ type: it.type, url: it.url, yt: it.yt, az: az, ru: ru, ts: base + (list.length - k) }); });
        }, Promise.resolve()).then(function () {
            $(kind === 'photo' ? 'photoUrls' : 'ytUrls').value = '';
            $(kind === 'photo' ? 'photoAz' : 'ytAz').value = '';
            $(kind === 'photo' ? 'photoRu' : 'ytRu').value = '';
            (kind === 'photo' ? previewPhoto : previewYt)();
            note(noteId, 'Добавлено: ' + list.length + '. Оно уже на сайте.', true);
            return loadItems();
        }).catch(function (e) { note(noteId, explain(e)); }).then(function () { busy(btn, false); });
    }

    function enter() {
        show('panel');
        $('who').textContent = session.email || '';
        loadItems().catch(function (e) { note('listNote', explain(e)); });
    }

    /* ---------- запуск ---------- */
    document.addEventListener('DOMContentLoaded', function () {
        $('loginForm').addEventListener('submit', function (ev) {
            ev.preventDefault();
            var b = $('loginBtn'); busy(b, true);
            note('loginNote', '');
            remember = $('remember').checked;
            login($('email').value.trim(), $('password').value).then(function () { $('password').value = ''; enter(); })
                .catch(function (e) { note('loginNote', e.message === 'NOT_ADMIN' ? 'У этого аккаунта нет доступа к панели.' : authMsg(e.message)); })
                .then(function () { busy(b, false, 'Войти'); });
        });
        $('logout').addEventListener('click', function () { session = null; saveSession(); items = []; show('login'); });
        $('photoUrls').addEventListener('input', previewPhoto);
        $('ytUrls').addEventListener('input', previewYt);
        $('photoPreview').addEventListener('error', function () { this.hidden = true; });
        $('addPhoto').addEventListener('click', function () { addMany('photo'); });
        $('addYt').addEventListener('click', function () { addMany('yt'); });

        var saved = loadSaved();
        if (saved && saved.r && ADMIN_EMAILS.indexOf(String(saved.e).toLowerCase()) !== -1) {
            session = { idToken: '', refreshToken: saved.r, expires: 0, email: saved.e };
            refresh().then(enter).catch(function () { session = null; show('login'); });
        } else { show('login'); }
    });

    // для проверок (не нужны на странице)
    window.__admin = { docToItem: docToItem, imgUrlOk: imgUrlOk, ytId: ytId };
})();
