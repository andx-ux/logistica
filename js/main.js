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

    // Forms: this template has no server backend, so Contact/Quote/Newsletter
    // are wired to open the visitor's email client via a mailto: link instead.
    var BUSINESS_EMAIL = 'info@rr-logistics.org';

    // Тексты писем — на языке страницы
    var RU = document.documentElement.lang === 'ru';
    var S = RU ? {
        pauseSlides: 'Остановить автоматическую смену слайдов', playSlides: 'Запустить автоматическую смену слайдов',
        name: 'Имя', email: 'E-mail', phone: 'Телефон', transport: 'Вид перевозки', freight: 'Тип груза',
        siteMsg: 'Сообщение с сайта: ', quote: 'Запрос расчёта: ', siteReq: 'Запрос с сайта',
        openMsg: 'Открывается почтовая программа — подтвердите отправку сообщения…', openReq: 'Открывается почтовая программа — подтвердите отправку запроса…'
    } : {
        pauseSlides: 'Slaydların avtomatik dəyişməsini dayandır', playSlides: 'Slaydların avtomatik dəyişməsini başlat',
        name: 'Ad', email: 'E-poçt', phone: 'Telefon', transport: 'Daşınma növü', freight: 'Yükün növü',
        siteMsg: 'Saytdan mesaj: ', quote: 'Hesablama sorğusu: ', siteReq: 'Saytdan sorğu',
        openMsg: 'E-poçt proqramı açılır — mesajı göndərməyi təsdiq edin…', openReq: 'E-poçt proqramı açılır — sorğunu göndərməyi təsdiq edin…'
    };

    function buildMailto(subject, lines) {
        var body = lines.filter(function (line) { return !!line; }).join('\n');
        return 'mailto:' + BUSINESS_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }

    function showFormStatus($form, message) {
        var $status = $form.find('.form-status');
        if ($status.length === 0) {
            $status = $('<div class="form-status alert alert-success mt-3 mb-0"></div>');
            $form.append($status);
        }
        $status.text(message);
    }

    $('#contactForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var email = $form.find('[name="email"]').val().trim();
        var subject = $form.find('[name="subject"]').val().trim();
        var message = $form.find('[name="message"]').val().trim();

        window.location.href = buildMailto(subject || (S.siteMsg + name), [
            S.name + ': ' + name,
            S.email + ': ' + email,
            '',
            message
        ]);
        showFormStatus($form, S.openMsg);
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

        window.location.href = buildMailto(S.quote + name, [
            S.name + ': ' + name,
            S.email + ': ' + email,
            S.phone + ': ' + mobile,
            S.transport + ': ' + (transport || '—'),
            S.freight + ': ' + (freight || '—'),
            '',
            note
        ]);
        showFormStatus($form, S.openReq);
    });

    // Lead / callback forms (name + phone + consent) -> mailto
    $('.js-lead-form').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var phone = $form.find('[name="phone"]').val().trim();
        window.location.href = buildMailto($form.data('subject') || S.siteReq, [
            S.name + ': ' + (name || '—'),
            S.phone + ': ' + phone
        ]);
        showFormStatus($form, S.openReq);
    });

})(jQuery);
