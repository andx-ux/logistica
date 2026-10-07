/* Защита от копирования текста и кода (сдерживающая мера).
   Что делает: отключает выделение, копирование, перетаскивание картинок, контекстное меню и «горячие клавиши»
   просмотра кода (F12, Ctrl+U, Ctrl+S, Ctrl+Shift+I/J/C). Поля ввода форм и блоки с классом .allow-copy
   (телефоны, e-mail, адрес) остаются доступными для копирования.
   Важно: полностью скрыть код страницы от посетителя технически невозможно — браузер обязан получить HTML, CSS и JS.
   Эта защита останавливает случайное копирование, но не опытного пользователя. */
(function () {
    'use strict';

    function inAllowed(t) {
        return !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], .allow-copy'));
    }
    function stop(e) { e.preventDefault(); }

    document.addEventListener('contextmenu', function (e) { if (!inAllowed(e.target)) stop(e); });
    document.addEventListener('copy', function (e) { if (!inAllowed(e.target)) stop(e); });
    document.addEventListener('cut', function (e) { if (!inAllowed(e.target)) stop(e); });
    document.addEventListener('dragstart', stop);
    document.addEventListener('selectstart', function (e) { if (!inAllowed(e.target)) stop(e); });

    document.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        var mod = e.ctrlKey || e.metaKey;
        var inField = inAllowed(e.target);
        if (e.key === 'F12') return stop(e);
        if (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) return stop(e); // консоль и инспектор
        if (mod && (k === 'u' || k === 's')) return stop(e);                                         // исходный код, сохранение страницы
        if (mod && (k === 'a' || k === 'c' || k === 'x') && !inField) return stop(e);                // выделить всё / копировать вне полей
    });
})();
