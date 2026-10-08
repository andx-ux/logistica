(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Animations are skipped for users who prefer reduced motion
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) { new WOW().init(); } else { $(".wow").css("visibility", "visible"); }


    // Dropdown on mouse hover
    const $dropdown = $(".dropdown");
    const $dropdownToggle = $(".dropdown-toggle");
    const $dropdownMenu = $(".dropdown-menu");
    const showClass = "show";
    
    $(window).on("load resize", function() {
        if (this.matchMedia("(min-width: 992px)").matches && this.matchMedia("(hover: hover)").matches) {
            $dropdown.hover(
            function() {
                const $this = $(this);
                $this.addClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "true");
                $this.find($dropdownMenu).addClass(showClass);
            },
            function() {
                const $this = $(this);
                $this.removeClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "false");
                $this.find($dropdownMenu).removeClass(showClass);
            }
            );
        } else {
            $dropdown.off("mouseenter mouseleave");
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Owl clones duplicate slides for the loop: keep them out of the accessibility tree
    function hideClones() {
        $(".header-carousel .owl-item.cloned").attr("aria-hidden", "true").find("a,button").attr("tabindex", "-1");
    }

    // Header carousel
    $(".header-carousel").owlCarousel({
        autoplay: !reducedMotion,
        autoplayHoverPause: true,
        autoplayTimeout: 6000,
        smartSpeed: 1200,
        items: 1,
        dots: true,
        loop: true,
        nav: false,
        onInitialized: hideClones,
        onRefreshed: hideClones
    });

    // Pause / play control for the hero slider (WCAG 2.2.2)
    $(".hero-pause").on("click", function () {
        var $b = $(this);
        var paused = $b.attr("aria-pressed") === "true";
        $(".header-carousel").trigger(paused ? "play.owl.autoplay" : "stop.owl.autoplay");
        $b.attr("aria-pressed", paused ? "false" : "true")
          .attr("aria-label", paused ? S.pauseSlides : S.playSlides)
          .find("i").attr("class", paused ? "bi bi-pause-fill" : "bi bi-play-fill");
    });


    // Точки слайдера главной получают подписи (для экранных дикторов)
    $('.header-carousel .owl-dot').each(function (i) { $(this).attr('aria-label', (RU ? 'Слайд ' : 'Slayd ') + (i + 1)); });

    // Кнопка «Написать»: раскрывает список мессенджеров
    (function () {
        var fab = document.getElementById('chatFab');
        if (!fab) return;
        var btn = fab.querySelector('.chat-toggle'), menu = document.getElementById('chatMenu');
        function set(open) { menu.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
        btn.addEventListener('click', function () { set(menu.hidden); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
        document.addEventListener('click', function (e) { if (!fab.contains(e.target)) set(false); });
    })();

    // Карта Google: подгружается только после нажатия кнопки
    $('.map-load').on('click', function () {
        var $box = $(this).closest('.map-box');
        var src = String($box.data('src') || '');
        if (src.indexOf('https://www.google.com/maps') !== 0) return;
        var f = document.createElement('iframe');
        f.src = src;
        f.title = String($box.data('title') || '');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        $box.empty().append(f);
    });

    // Forms: this template has no server backend, so Contact/Quote/Newsletter
    // are wired to open the visitor's email client via a mailto: link instead.
    var BUSINESS_EMAIL = 'info@rr-logistics.org';

    // Тексты писем — на языке страницы
    var RU = document.documentElement.lang === 'ru';
    var S = RU ? {
        pauseSlides: 'Остановить автоматическую смену слайдов', playSlides: 'Запустить автоматическую смену слайдов',
        name: 'Имя', email: 'E-mail', phone: 'Телефон', transport: 'Вид перевозки', freight: 'Тип груза',
        siteMsg: 'Сообщение с сайта: ', quote: 'Запрос расчёта: ', siteReq: 'Запрос с сайта',
        sending: 'Отправляем…', sent: 'Спасибо! Сообщение отправлено — мы свяжемся с вами в ближайшее время.',
        openMsg: 'Открывается почтовая программа — подтвердите отправку сообщения…', openReq: 'Открывается почтовая программа — подтвердите отправку запроса…'
    } : {
        pauseSlides: 'Slaydların avtomatik dəyişməsini dayandır', playSlides: 'Slaydların avtomatik dəyişməsini başlat',
        name: 'Ad', email: 'E-poçt', phone: 'Telefon', transport: 'Daşınma növü', freight: 'Yükün növü',
        siteMsg: 'Saytdan mesaj: ', quote: 'Hesablama sorğusu: ', siteReq: 'Saytdan sorğu',
        sending: 'Göndərilir…', sent: 'Təşəkkür edirik! Mesajınız göndərildi — tezliklə sizinlə əlaqə saxlayacağıq.',
        openMsg: 'E-poçt proqramı açılır — mesajı göndərməyi təsdiq edin…', openReq: 'E-poçt proqramı açılır — sorğunu göndərməyi təsdiq edin…'
    };

    var T0 = Date.now();

    function buildMailto(subject, lines) {
        var body = lines.filter(function (line) { return !!line; }).join('\n');
        return 'mailto:' + BUSINESS_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }

    function showFormStatus($form, message, ok) {
        var $status = $form.find('.form-status');
        if ($status.length === 0) {
            $status = $('<div class="form-status alert mt-3 mb-0" role="status"></div>');
            $form.append($status);
        }
        $status.toggleClass('alert-success', ok !== false).toggleClass('alert-warning', ok === false).text(message);
    }

    // Заявка уходит в Telegram через /api/lead. Если это не получилось (нет связи, сервис не настроен) —
    // открывается обычное письмо на почту компании, как раньше.
    function sendLead(kind, data) {
        var payload = $.extend({ kind: kind, page: location.href, t: Date.now() - T0 }, data);
        return fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!(r.ok && j.ok)) throw new Error(j.error || r.status); }); });
    }

    function submitForm($form, kind, data, mailSubject, mailLines, fallbackText) {
        var $btn = $form.find('[type="submit"]');
        $btn.prop('disabled', true);
        showFormStatus($form, S.sending);
        sendLead(kind, data).then(function () {
            showFormStatus($form, S.sent);
            $form[0].reset();
        }).catch(function () {
            window.location.href = buildMailto(mailSubject, mailLines);
            showFormStatus($form, fallbackText);
        }).then(function () { $btn.prop('disabled', false); });
    }

    // Кнопка «Отправить в WhatsApp»: открывает чат с готовым текстом из формы
    $('.js-wa-send').on('click', function () {
        var $btn = $(this), $form = $btn.closest('form');
        if ($form[0] && $form[0].reportValidity && !$form[0].reportValidity()) return;
        var lines = [RU ? 'Здравствуйте! Сообщение с сайта rr-logistics.org' : 'Salam! rr-logistics.org saytından mesaj'];
        function v(n) { return ($form.find('[name="' + n + '"]').val() || '').trim(); }
        var rows = [[S.name, v('name')], [S.phone, v('phone') || v('mobile')], [S.email, v('email')],
            [RU ? 'Тема' : 'Mövzu', v('subject')], [S.transport, v('transport')], [S.freight, v('freight')]];
        rows.forEach(function (r) { if (r[1]) lines.push(r[0] + ': ' + r[1]); });
        var msg = v('message') || v('note');
        if (msg) { lines.push(''); lines.push(msg); }
        var url = 'https://wa.me/' + String($btn.data('wa')).replace(/\D/g, '') + '?text=' + encodeURIComponent(lines.join('\n'));
        var w = window.open(url, '_blank', 'noopener');
        if (!w) { window.location.href = url; }
    });

    $('#contactForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var email = $form.find('[name="email"]').val().trim();
        var subject = $form.find('[name="subject"]').val().trim();
        var message = $form.find('[name="message"]').val().trim();
        submitForm($form, 'contact', { name: name, email: email, subject: subject, message: message },
            subject || (S.siteMsg + name), [S.name + ': ' + name, S.email + ': ' + email, '', message], S.openMsg);
    });

    $('#quoteForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var email = $form.find('[name="email"]').val().trim();
        var mobile = $form.find('[name="mobile"]').val().trim();
        var freight = $form.find('[name="freight"]').val();
        var transport = $form.find('[name="transport"]').val();
        var note = $form.find('[name="note"]').val().trim();
        submitForm($form, 'quote', { name: name, email: email, phone: mobile, transport: transport, freight: freight, message: note },
            S.quote + name, [S.name + ': ' + name, S.email + ': ' + email, S.phone + ': ' + mobile,
                S.transport + ': ' + (transport || '—'), S.freight + ': ' + (freight || '—'), '', note], S.openReq);
    });

    // Короткие формы (имя + телефон): «обратный звонок» и «заявка» на главной
    $('.js-lead-form').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var phone = $form.find('[name="phone"]').val().trim();
        var kind = $form.closest('#callbackModal').length ? 'callback' : 'lead';
        submitForm($form, kind, { name: name, phone: phone },
            $form.data('subject') || S.siteReq, [S.name + ': ' + (name || '—'), S.phone + ': ' + phone], S.openReq);
    });

})(jQuery);
