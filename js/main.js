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
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').css('top', '0px');
        } else {
            $('.sticky-top').css('top', '-100px');
        }
    });
    
    
    // Dropdown on mouse hover
    const $dropdown = $(".dropdown");
    const $dropdownToggle = $(".dropdown-toggle");
    const $dropdownMenu = $(".dropdown-menu");
    const showClass = "show";
    
    $(window).on("load resize", function() {
        if (this.matchMedia("(min-width: 992px)").matches) {
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


    // Header carousel
    $(".header-carousel").owlCarousel({
        autoplay: true,
        autoplayTimeout: 6000,
        smartSpeed: 1200,
        items: 1,
        dots: true,
        loop: true,
        nav: false
    });


    // Forms: this template has no server backend, so Contact/Quote/Newsletter
    // are wired to open the visitor's email client via a mailto: link instead.
    // TODO: replace with a real business email once you have one.
    var BUSINESS_EMAIL = 'info@example.com';

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

        window.location.href = buildMailto(subject || ('Сообщение с сайта от ' + name), [
            'Имя: ' + name,
            'Email: ' + email,
            '',
            message
        ]);
        showFormStatus($form, 'Открываем почтовый клиент для отправки сообщения…');
    });

    $('#quoteForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var email = $form.find('[name="email"]').val().trim();
        var mobile = $form.find('[name="mobile"]').val().trim();
        var freight = $form.find('[name="freight"]').val();
        var note = $form.find('[name="note"]').val().trim();

        window.location.href = buildMailto('Запрос расчёта от ' + name, [
            'Имя: ' + name,
            'Email: ' + email,
            'Телефон: ' + mobile,
            'Тип груза: ' + freight,
            '',
            note
        ]);
        showFormStatus($form, 'Открываем почтовый клиент для отправки заявки…');
    });

    $('#newsletterForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var email = $form.find('[name="email"]').val().trim();

        window.location.href = buildMailto('Подписка на рассылку', [
            'Пожалуйста, подпишите этот email на рассылку: ' + email
        ]);
        showFormStatus($form, 'Открываем почтовый клиент для подтверждения подписки…');
    });



    // Lead / callback forms (name + phone + consent) -> mailto
    $('.js-lead-form').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var name = $form.find('[name="name"]').val().trim();
        var phone = $form.find('[name="phone"]').val().trim();
        window.location.href = buildMailto($form.data('subject') || 'Заявка с сайта', [
            'Имя: ' + (name || '—'),
            'Телефон: ' + phone
        ]);
        showFormStatus($form, 'Открываем почтовый клиент для отправки заявки…');
    });

})(jQuery);
