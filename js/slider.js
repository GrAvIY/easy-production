/**
 * Easy Production — EP Photo Slider
 * Lightweight slider for multiple photos in portfolio / service cards.
 *
 * Usage:
 *   EPSlider.init(containerEl)  — init one .ep-photo-slider element
 *   EPSlider.initAll()          — init all .ep-photo-slider on the page
 *
 * Expects: <div class="ep-photo-slider">
 *            <img class="ep-slide" src="...">
 *            <img class="ep-slide" src="...">
 *          </div>
 * Arrows + dots are injected automatically. First slide gets .active.
 */
(function () {
  'use strict';

  var AUTO_INTERVAL = 5000; // ms between auto-advances

  function initSlider(el) {
    if (el._epSliderInit) return; // already initialized
    el._epSliderInit = true;

    var slides = el.querySelectorAll('.ep-slide');
    if (slides.length === 0) return;

    var current = 0;

    // Activate first slide
    slides[0].classList.add('active');

    if (slides.length < 2) return; // no controls needed for 1 slide

    // ── Dots ────────────────────────────────────────────────────────────
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'ep-slider-dots';

    for (var d = 0; d < slides.length; d++) {
      (function (idx) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'ep-slider-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Фото ' + (idx + 1));
        dot.addEventListener('click', function () { go(idx); });
        dotsWrap.appendChild(dot);
      })(d);
    }

    // ── Arrows ───────────────────────────────────────────────────────────
    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'ep-slider-arrow ep-slider-prev';
    prev.innerHTML = '&#8249;';
    prev.setAttribute('aria-label', 'Предыдущее фото');
    prev.addEventListener('click', function () { go(current - 1); });

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'ep-slider-arrow ep-slider-next';
    next.innerHTML = '&#8250;';
    next.setAttribute('aria-label', 'Следующее фото');
    next.addEventListener('click', function () { go(current + 1); });

    el.appendChild(prev);
    el.appendChild(next);
    el.appendChild(dotsWrap);

    // ── Navigation function ───────────────────────────────────────────────
    function go(idx) {
      slides[current].classList.remove('active');
      dotsWrap.children[current].classList.remove('active');
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add('active');
      dotsWrap.children[current].classList.add('active');
    }

    // ── Auto-advance ──────────────────────────────────────────────────────
    var timer = setInterval(function () { go(current + 1); }, AUTO_INTERVAL);

    el.addEventListener('mouseenter', function () { clearInterval(timer); });
    el.addEventListener('mouseleave', function () {
      timer = setInterval(function () { go(current + 1); }, AUTO_INTERVAL);
    });

    // ── Touch/swipe support ───────────────────────────────────────────────
    var touchStartX = 0;
    el.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) go(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.EPSlider = {
    /** Initialize a single slider element */
    init: function (el) { initSlider(el); },

    /** Initialize all .ep-photo-slider elements on the page */
    initAll: function () {
      document.querySelectorAll('.ep-photo-slider').forEach(initSlider);
    },

    /**
     * Build and initialize a slider inside a container element.
     * @param {Element} container  - element to append slider into
     * @param {string[]} photos    - array of image src / dataURL
     * @param {string} altText     - alt text for images
     * @param {Object} [style]     - optional style object to apply to container
     */
    build: function (container, photos, altText, style) {
      if (!photos || photos.length === 0) return;

      // Remove any previous slider
      var old = container.querySelector('.ep-photo-slider');
      if (old) old.remove();

      var sliderEl = document.createElement('div');
      sliderEl.className = 'ep-photo-slider';
      if (style) {
        Object.assign(sliderEl.style, style);
      }

      photos.forEach(function (src) {
        var img = document.createElement('img');
        img.className = 'ep-slide';
        img.src = src;
        img.alt = altText || '';
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
        sliderEl.appendChild(img);
      });

      container.appendChild(sliderEl);
      initSlider(sliderEl);
      return sliderEl;
    }
  };

})();
