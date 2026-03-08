/**
 * EASY PRODUCTION — Main App
 *
 * Responsibilities:
 *  • Preloader
 *  • Header scroll behavior (show/hide, blur)
 *  • Mobile navigation
 *  • Smooth anchor scroll
 *  • Scroll-reveal animations (IntersectionObserver)
 *  • Hero animated canvas background
 *  • Stats counter animation
 *  • Methods section render (from config)
 *  • Contact form (client-side validation + mock submit)
 *  • Footer year
 *  • Active nav link on scroll
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════════════════════════════════════════ */

  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     PRELOADER
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initPreloader() {
    const preloader = document.getElementById('preloader');
    const progress  = document.getElementById('preloaderProgress');
    if (!preloader) return;

    let pct = 0;
    const tick = setInterval(() => {
      pct += Math.random() * 18;
      if (pct >= 100) {
        pct = 100;
        clearInterval(tick);
        if (progress) progress.style.width = '100%';

        setTimeout(() => {
          preloader.classList.add('hidden');
          document.body.classList.remove('loading');
          revealHeroContent();
        }, 300);
      }
      if (progress) progress.style.width = `${Math.min(pct, 99)}%`;
    }, 80);
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     HEADER
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    let lastY  = 0;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 20);
      // Hide on scroll down, show on scroll up (only after 200px)
      if (y > 200) {
        header.classList.toggle('hidden', y > lastY + 5);
      } else {
        header.classList.remove('hidden');
      }
      lastY    = y;
      ticking  = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     MOBILE NAV
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initMobileNav() {
    const burger  = document.getElementById('navBurger');
    const mobile  = document.getElementById('navMobile');
    if (!burger || !mobile) return;

    let open = false;

    function toggle() {
      open = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobile.classList.toggle('open', open);
      mobile.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    burger.addEventListener('click', toggle);

    // Close on link click
    $$('.nav__mobile-link', mobile).forEach(link => {
      link.addEventListener('click', () => {
        if (open) toggle();
      });
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && open) toggle();
    });
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     SMOOTH SCROLL (native scroll-behavior fallback)
  ═══════════════════════════════════════════════════════════════════════════ */

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (!el) return;

    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ═══════════════════════════════════════════════════════════════════════════
     SCROLL REVEAL (IntersectionObserver)
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initScrollReveal() {
    const targets = $$('.reveal-up, .reveal-line');
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    });

    targets.forEach(el => observer.observe(el));
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     ACTIVE NAV LINK on scroll
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initActiveNav() {
    const sections = $$('main section[id]');
    const links    = $$('.nav__link');
    if (!sections.length || !links.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => {
            l.classList.toggle(
              'active',
              l.getAttribute('href') === `#${entry.target.id}`
            );
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => observer.observe(s));
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     HERO CANVAS BACKGROUND
     Animated particle-like noise that gives an organic dark premium feel.
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H;

    const PARTICLE_COUNT = 80;

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:  Math.random(),
      y:  Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      r:  Math.random() * 1.5 + 0.5,
      a:  Math.random() * 0.4 + 0.05,
    }));

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Soft radial glow — red tint for light bg
      const glow = ctx.createRadialGradient(W * 0.15, H * 0.85, 0, W * 0.15, H * 0.85, W * 0.55);
      glow.addColorStop(0,   'rgba(220, 38, 38, 0.05)');
      glow.addColorStop(0.5, 'rgba(220, 38, 38, 0.02)');
      glow.addColorStop(1,   'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Particles — dark on light background
      particles.forEach(p => {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;

        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80, 80, 100, ${p.a})`;
        ctx.fill();
      });

      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = (particles[i].x - particles[j].x) * W;
          const dy = (particles[i].y - particles[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x * W, particles[i].y * H);
            ctx.lineTo(particles[j].x * W, particles[j].y * H);
            ctx.strokeStyle = `rgba(80, 80, 100, ${0.07 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(draw);
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     HERO CONTENT REVEAL
  ═══════════════════════════════════════════════════════════════════════════ */

  function revealHeroContent() {
    const lines   = $$('.hero__title .reveal-line');
    const others  = $$('.hero .reveal-up');

    lines.forEach((el, i) => {
      setTimeout(() => el.classList.add('in-view'), i * 120);
    });

    others.forEach((el, i) => {
      setTimeout(() => el.classList.add('in-view'), 100 + i * 100);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STATS COUNTER
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function animateCounter(el) {
      const target   = parseInt(el.dataset.count, 10);
      const duration = 1800;
      const start    = performance.now();

      function tick(now) {
        const progress = clamp((now - start) / duration, 0, 1);
        el.textContent = Math.round(easeOut(progress) * target);
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     METHODS SECTION — render from config
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initMethods() {
    const list = document.getElementById('methodsList');
    if (!list || !window.EP_CONFIG) return;

    Object.entries(EP_CONFIG.methods).forEach(([, method]) => {
      const div = document.createElement('div');
      div.className = 'method-item reveal-up';

      // Re-observe this dynamically created element
      div.innerHTML = `
        <p class="method-item__name">${method.label}</p>
        <p class="method-item__desc">${method.desc || ''}</p>
        <span class="method-item__tag">от ${method.minQty} шт</span>
      `;

      list.appendChild(div);
    });

    // Re-init observer for newly added elements
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    $$('.method-item.reveal-up', list).forEach(el => observer.observe(el));
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     CONTACT FORM
  ═══════════════════════════════════════════════════════════════════════════ */

  /* ═══════════════════════════════════════════════════════════════════════════
     ORDER MODAL — saves to localStorage['ep_orders'] for admin panel
  ═══════════════════════════════════════════════════════════════════════════ */
  (function initOrderModal() {
    const modal       = document.getElementById('orderModal');
    const overlay     = document.getElementById('orderModalOverlay');
    const closeBtn    = document.getElementById('orderModalClose');
    const form        = document.getElementById('orderForm');
    const successBox  = document.getElementById('orderSuccess');
    const successClose = document.getElementById('orderSuccessClose');
    const attachBtn   = document.getElementById('orderAttachBtn');
    const snapshotStrip = document.getElementById('orderSnapshotStrip');
    const snapshotImg  = document.getElementById('orderSnapshotImg');
    const snapshotRemove = document.getElementById('orderSnapshotRemove');
    const submitBtn   = document.getElementById('orderSubmitBtn');
    if (!modal) return;

    let _snapshot = null;   // base64 jpeg of 3D canvas
    let _withDesign = false; // was modal opened from customizer

    function openModal(withDesignCapture, prefill) {
      _withDesign = !!withDesignCapture;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      form.hidden = false;
      successBox.hidden = true;

      // Pre-fill product type
      if (prefill && prefill.product) {
        const sel = document.getElementById('oProduct');
        // Try to match option text
        let matched = false;
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.toLowerCase().includes(prefill.product.toLowerCase())
              || prefill.product.toLowerCase().includes(sel.options[i].text.toLowerCase())) {
            sel.value = sel.options[i].value;
            matched = true;
            break;
          }
        }
        if (!matched) sel.value = 'Другое';
      }

      // Pre-fill quantity
      if (prefill && prefill.qty) {
        const qtyEl = document.getElementById('oQty');
        qtyEl.value = prefill.qty;
      }

      // Auto-capture canvas when opened from customizer button
      if (withDesignCapture) captureDesign();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
    }

    function captureDesign() {
      const canvas = document.getElementById('threeCanvas');
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        _snapshot = dataUrl;
        snapshotImg.src = dataUrl;
        snapshotStrip.hidden = false;
        attachBtn.textContent = '✓ Дизайн прикреплён';
        attachBtn.classList.add('attached');
      } catch (_) {}
    }

    function removeSnapshot() {
      _snapshot = null;
      snapshotStrip.hidden = true;
      attachBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><path d="M2 11l3.5-3.5L8 10l2.5-2.5L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Прикрепить дизайн из конструктора';
      attachBtn.classList.remove('attached');
    }

    function saveOrder(data) {
      try {
        const orders = JSON.parse(localStorage.getItem('ep_orders') || '[]');
        orders.unshift(data);  // newest first
        localStorage.setItem('ep_orders', JSON.stringify(orders));
      } catch (_) {}
    }

    // Open from customizer button — capture design + pre-fill clothing type
    const customizerBtn = document.getElementById('customizerOrderBtn');
    if (customizerBtn) customizerBtn.addEventListener('click', () => {
      const activeTab = document.querySelector('.clothing-tab.active');
      const productLabel = activeTab ? activeTab.querySelector('span:last-child').textContent.trim() : '';
      openModal(true, { product: productLabel });
    });

    // Open from calculator button — pre-fill product + quantity from calc
    const calcBtn = document.getElementById('calcOrderBtn');
    if (calcBtn) calcBtn.addEventListener('click', () => {
      const calcProduct = document.getElementById('calcProduct');
      const calcQty     = document.getElementById('calcQty');
      const productText = calcProduct ? calcProduct.options[calcProduct.selectedIndex]?.text || '' : '';
      const qty         = calcQty ? calcQty.value : '';
      openModal(false, { product: productText, qty });
    });

    // Open from nav CTA (if pointing to #order)
    document.addEventListener('click', e => {
      if (e.target.closest('[href="#order"]')) {
        e.preventDefault();
        openModal(false);
      }
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    successClose.addEventListener('click', closeModal);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    attachBtn.addEventListener('click', () => {
      if (_snapshot) { removeSnapshot(); } else { captureDesign(); }
    });

    snapshotRemove.addEventListener('click', removeSnapshot);

    // Validate a field
    function reqOk(el) {
      const ok = el.value.trim().length > 0;
      el.classList.toggle('err', !ok);
      return ok;
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name    = document.getElementById('oName');
      const phone   = document.getElementById('oPhone');
      const product = document.getElementById('oProduct');
      const qty     = document.getElementById('oQty');

      if (![name, phone, product, qty].map(reqOk).every(Boolean)) return;

      // Build order record
      const order = {
        id:        Date.now(),
        createdAt: new Date().toISOString(),
        status:    'new',
        name:      name.value.trim(),
        surname:   document.getElementById('oSurname').value.trim(),
        phone:     phone.value.trim(),
        email:     document.getElementById('oEmail').value.trim(),
        product:   product.value,
        qty:       parseInt(qty.value) || 0,
        comment:   document.getElementById('oComment').value.trim(),
        design:    _snapshot || null,
        // attach current calculator quote if available
        quote:     window.EPCalculator ? EPCalculator.getQuote() : null,
        source:    _withDesign ? 'customizer' : 'form',
      };

      saveOrder(order);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем…';
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить заявку';
        form.reset();
        removeSnapshot();
        form.hidden = true;
        successBox.hidden = false;
      }, 600);
    });

    // Clear err on input
    form.querySelectorAll('input,select,textarea').forEach(el => {
      el.addEventListener('input', () => el.classList.remove('err'));
    });
  })();

  (function initContactForm() {
    const form      = document.getElementById('contactForm');
    const submitBtn = document.getElementById('formSubmitBtn');
    const success   = document.getElementById('formSuccess');
    if (!form) return;

    function validateField(el) {
      const valid = el.value.trim().length > 0;
      el.classList.toggle('error', !valid);
      return valid;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const name    = form.querySelector('#fName');
      const contact = form.querySelector('#fContact');
      const message = form.querySelector('#fMessage');

      const validName    = validateField(name);
      const validContact = validateField(contact);
      const validMessage = validateField(message);

      if (!validName || !validContact || !validMessage) return;

      // Save to localStorage so admin panel receives it
      try {
        const orders = JSON.parse(localStorage.getItem('ep_orders') || '[]');
        orders.unshift({
          id:        Date.now(),
          createdAt: new Date().toISOString(),
          status:    'new',
          name:      name.value.trim(),
          phone:     contact.value.trim(),
          comment:   message.value.trim(),
          quote:     window.EPCalculator ? EPCalculator.getQuote() : null,
          source:    'contact',
        });
        localStorage.setItem('ep_orders', JSON.stringify(orders));
      } catch (_) {}

      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем…';

      await new Promise(r => setTimeout(r, 600));

      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';

      form.reset();
      if (success) success.hidden = false;

      // Auto-hide success message
      setTimeout(() => { if (success) success.hidden = true; }, 6000);
    });

    // Clear error on input
    $$('.form__input, .form__textarea', form).forEach(el => {
      el.addEventListener('input', () => el.classList.remove('error'));
    });
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     FOOTER YEAR
  ═══════════════════════════════════════════════════════════════════════════ */

  (function () {
    const el = document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     MICRO-INTERACTIONS — service cards tilt on hover
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initTilt() {
    // Only on non-touch devices
    if (window.matchMedia('(hover: none)').matches) return;

    $$('.service-card, .portfolio__item').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateZ(4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s ease';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     PORTFOLIO HOVER — overlay shimmer
  ═══════════════════════════════════════════════════════════════════════════ */

  (function initPortfolioHover() {
    $$('.portfolio__img').forEach(img => {
      img.addEventListener('mousemove', e => {
        const rect = img.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top)  / rect.height) * 100;
        img.style.setProperty('--mx', `${x}%`);
        img.style.setProperty('--my', `${y}%`);
      });
    });
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     PERFORMANCE: pause heavy work when tab is hidden
  ═══════════════════════════════════════════════════════════════════════════ */

  document.addEventListener('visibilitychange', () => {
    // Three.js OrbitControls and animation loop will still run but won't
    // render to screen — this is fine. If needed, expose pause/resume API.
  });

  /* ═══════════════════════════════════════════════════════════════════════════
     CONTENT OVERRIDES — apply saved admin-panel edits from localStorage
     Patches text nodes and CSS vars without touching HTML structure.
  ═══════════════════════════════════════════════════════════════════════════ */
  (function applyContentOverrides() {
    let content;
    try {
      const raw = localStorage.getItem('ep_content');
      if (!raw) return;
      content = JSON.parse(raw);
    } catch (_) { return; }

    // Helper: set innerText of first matching element (safe, no-op if missing)
    function setText(sel, value) {
      if (!value) return;
      const el = document.querySelector(sel);
      if (el) el.textContent = value;
    }
    function setHref(sel, value) {
      if (!value) return;
      document.querySelectorAll(sel).forEach(el => { el.href = value; });
    }

    const s = content;

    // ── Hero
    if (s.hero) {
      setText('.hero__eyebrow',   s.hero.eyebrow);
      setText('.hero__subtitle',  s.hero.subtitle);
      // Title lines
      const titleLines = document.querySelectorAll('.hero__title .reveal-line');
      if (s.hero.titleLine1 && titleLines[0]) titleLines[0].textContent = s.hero.titleLine1;
      if (s.hero.titleLine2 && titleLines[1]) titleLines[1].textContent = s.hero.titleLine2;
      if (s.hero.titleLine3 && titleLines[2]) titleLines[2].textContent = s.hero.titleLine3;
      // Stats
      const statVals = document.querySelectorAll('.hero__stat-value');
      const statLbls = document.querySelectorAll('.hero__stat-label');
      if (s.hero.stat1Value && statVals[0]) statVals[0].textContent = s.hero.stat1Value;
      if (s.hero.stat1Label && statLbls[0]) statLbls[0].textContent = s.hero.stat1Label;
      if (s.hero.stat2Value && statVals[1]) statVals[1].textContent = s.hero.stat2Value;
      if (s.hero.stat2Label && statLbls[1]) statLbls[1].textContent = s.hero.stat2Label;
      if (s.hero.stat3Value && statVals[2]) statVals[2].textContent = s.hero.stat3Value;
      if (s.hero.stat3Label && statLbls[2]) statLbls[2].textContent = s.hero.stat3Label;
      // Multi-photo hero slider (preferred) or legacy single bgImage
      var heroPhotos = Array.isArray(s.hero.photos) && s.hero.photos.length ? s.hero.photos : (s.hero.bgImage ? [s.hero.bgImage] : []);
      if (heroPhotos.length > 0) {
        var heroBg = document.querySelector('.hero__bg');
        if (heroBg) {
          if (heroPhotos.length === 1) {
            heroBg.style.backgroundImage = 'url(' + heroPhotos[0] + ')';
            heroBg.style.backgroundSize = 'cover';
            heroBg.style.backgroundPosition = 'center';
          } else if (window.EPSlider) {
            EPSlider.build(heroBg, heroPhotos, 'Hero');
          }
        }
      }
    }

    // ── About
    if (s.about) {
      setText('#about .section-label', s.about.label);
      setText('#about .section-title', s.about.title);
      const paras = document.querySelectorAll('#about .about__text');
      if (s.about.text1 && paras[0]) paras[0].textContent = s.about.text1;
      if (s.about.text2 && paras[1]) paras[1].textContent = s.about.text2;
      // Pillars
      const pillarTexts = document.querySelectorAll('.about__pillar-text');
      if (s.about.pillar1 && pillarTexts[0]) pillarTexts[0].textContent = s.about.pillar1;
      if (s.about.pillar2 && pillarTexts[1]) pillarTexts[1].textContent = s.about.pillar2;
      if (s.about.pillar3 && pillarTexts[2]) pillarTexts[2].textContent = s.about.pillar3;
      if (s.about.pillar4 && pillarTexts[3]) pillarTexts[3].textContent = s.about.pillar4;
      // Multi-photo about slider (preferred) or legacy single image
      var aboutPhotos = Array.isArray(s.about.photos) && s.about.photos.length ? s.about.photos : (s.about.image ? [s.about.image] : []);
      if (aboutPhotos.length > 0) {
        var aboutPhotoWrap = document.querySelector('.about__photo--admin');
        if (!aboutPhotoWrap) {
          aboutPhotoWrap = document.createElement('div');
          aboutPhotoWrap.className = 'about__photo--admin';
          aboutPhotoWrap.style.cssText = 'width:100%;aspect-ratio:4/3;border-radius:16px;overflow:hidden;margin-bottom:var(--sp-8);position:relative;';
          var aboutRight = document.querySelector('.about__right');
          if (aboutRight) aboutRight.insertBefore(aboutPhotoWrap, aboutRight.firstChild);
        }
        if (aboutPhotos.length === 1) {
          aboutPhotoWrap.style.backgroundImage = 'url(' + aboutPhotos[0] + ')';
          aboutPhotoWrap.style.backgroundSize = 'cover';
          aboutPhotoWrap.style.backgroundPosition = 'center';
        } else if (window.EPSlider) {
          EPSlider.build(aboutPhotoWrap, aboutPhotos, 'About');
        }
      }
    }

    // ── Services
    if (s.services) {
      setText('#services .section-label', s.services.label);
      setText('#services .section-title', s.services.title);
      // Individual service cards
      [1, 2, 3, 4].forEach(function(n) {
        const card = document.querySelector('.service-card:nth-child(' + n + ')');
        if (!card) return;
        const titleEl = card.querySelector('.service-card__title');
        const descEl  = card.querySelector('.service-card__desc');
        const liEls   = card.querySelectorAll('.service-card__list li');
        if (s.services['card' + n + 'Title'] && titleEl) titleEl.textContent = s.services['card' + n + 'Title'];
        if (s.services['card' + n + 'Desc']  && descEl)  descEl.textContent  = s.services['card' + n + 'Desc'];
        if (s.services['card' + n + 'F1'] && liEls[0]) liEls[0].textContent = s.services['card' + n + 'F1'];
        if (s.services['card' + n + 'F2'] && liEls[1]) liEls[1].textContent = s.services['card' + n + 'F2'];
        if (s.services['card' + n + 'F3'] && liEls[2]) liEls[2].textContent = s.services['card' + n + 'F3'];
        // Card photos (multiple) or legacy single image
        var cardPhotos = s.services['card' + n + 'Photos'];
        var cardImg    = s.services['card' + n + 'Img'];
        if (cardPhotos && cardPhotos.length > 0) {
          // Remove any previous slider
          var prevSlider = card.querySelector('.service-card__slider');
          if (prevSlider) prevSlider.remove();
          // Create slider container before card title
          var sliderWrap = document.createElement('div');
          sliderWrap.className = 'service-card__slider';
          card.insertBefore(sliderWrap, card.firstChild);
          if (window.EPSlider) EPSlider.build(sliderWrap, cardPhotos, s.services['card' + n + 'Title'] || '');
          // Hide SVG icon
          var iconEl2 = card.querySelector('.service-card__icon');
          if (iconEl2) iconEl2.style.display = 'none';
        } else if (cardImg) {
          var iconEl = card.querySelector('.service-card__icon');
          if (iconEl) {
            iconEl.style.cssText = 'width:80px;height:80px;border-radius:12px;background-size:cover;background-position:center;background-image:url(' + cardImg + ');';
            var svg = iconEl.querySelector('svg');
            if (svg) svg.style.display = 'none';
          }
        }
      });
    }

    // ── Process
    if (s.process) {
      setText('#process .section-label', s.process.label);
      setText('#process .section-title', s.process.title);
      // Individual steps
      const steps = document.querySelectorAll('.process__step');
      [1, 2, 3, 4, 5].forEach(function(n) {
        const step = steps[n - 1];
        if (!step) return;
        const h3El = step.querySelector('.process__body h3');
        const pEl  = step.querySelector('.process__body p');
        if (s.process['step' + n + 'Title'] && h3El) h3El.textContent = s.process['step' + n + 'Title'];
        if (s.process['step' + n + 'Desc']  && pEl)  pEl.textContent  = s.process['step' + n + 'Desc'];
        // Process step photos
        var stepPhotos = s.process['step' + n + 'Photos'];
        if (Array.isArray(stepPhotos) && stepPhotos.length > 0) {
          var prevWrap = step.querySelector('.process__photo-admin');
          if (!prevWrap) {
            prevWrap = document.createElement('div');
            prevWrap.className = 'process__photo-admin';
            prevWrap.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;margin-bottom:12px;position:relative;';
            step.insertBefore(prevWrap, step.firstChild);
          }
          if (stepPhotos.length === 1) {
            prevWrap.style.backgroundImage = 'url(' + stepPhotos[0] + ')';
            prevWrap.style.backgroundSize = 'cover';
            prevWrap.style.backgroundPosition = 'center';
          } else if (window.EPSlider) {
            EPSlider.build(prevWrap, stepPhotos, s.process['step' + n + 'Title'] || '');
          }
        }
      });
    }

    // ── Customizer
    if (s.customizer) {
      setText('#customizer .section-label', s.customizer.label);
      setText('#customizer .section-title', s.customizer.title);
      setText('#customizer .section-desc',  s.customizer.desc);
    }

    // ── Calculator
    if (s.calculator) {
      setText('#calculator .section-label', s.calculator.label);
      setText('#calculator .section-title', s.calculator.title);
      setText('#calculator .section-desc',  s.calculator.desc);
      setText('.calc__disclaimer', s.calculator.disclaimer);
    }

    // ── Portfolio
    if (s.portfolio) {
      setText('#portfolio .section-label', s.portfolio.label);
      setText('#portfolio .section-title', s.portfolio.title);
      // Portfolio items — text and images
      if (Array.isArray(s.portfolio.items)) {
        const pItems = document.querySelectorAll('.portfolio__item');
        s.portfolio.items.forEach(function(item, i) {
          if (!pItems[i]) return;
          const nameEl = pItems[i].querySelector('.portfolio__name');
          const tagEl  = pItems[i].querySelector('.portfolio__tag');
          if (item.title && nameEl) nameEl.textContent = item.title;
          if (item.tag   && tagEl)  tagEl.textContent  = item.tag;
          // Photos: prefer multi-photo array, fall back to legacy single img
          var portfolioImgEl = pItems[i].querySelector('.portfolio__img');
          if (portfolioImgEl) {
            var photos = (Array.isArray(item.photos) && item.photos.length)
              ? item.photos
              : (item.img ? [item.img] : []);

            if (photos.length > 0) {
              var ph = portfolioImgEl.querySelector('.portfolio__placeholder');
              if (ph) ph.style.display = 'none';

              if (photos.length === 1) {
                // Single image — background approach
                portfolioImgEl.style.backgroundImage    = 'url(' + photos[0] + ')';
                portfolioImgEl.style.backgroundSize     = 'cover';
                portfolioImgEl.style.backgroundPosition = 'center';
              } else {
                // Multiple images — inject slider
                portfolioImgEl.style.backgroundImage = '';
                if (window.EPSlider) {
                  EPSlider.build(portfolioImgEl, photos, item.title || '');
                }
              }
            }
          }
        });
      }
    }

    // ── FAQ
    if (s.faq) {
      setText('#faq .section-label', s.faq.label);
      setText('#faq .section-title', s.faq.title);
      if (Array.isArray(s.faq.items)) {
        const qEls = document.querySelectorAll('.faq__q');
        const aEls = document.querySelectorAll('.faq__a');
        s.faq.items.forEach((item, i) => {
          if (qEls[i]) qEls[i].textContent = item.q;
          if (aEls[i]) aEls[i].textContent = item.a;
        });
      }
    }

    // ── Contact
    if (s.contact) {
      setText('#contact .section-label', s.contact.label);
      setText('#contact .section-title', s.contact.title);
      setText('#contact .section-desc',  s.contact.desc);
      if (s.contact.telegram) setHref('a[href*="t.me"]',      s.contact.telegram);
      if (s.contact.whatsapp) setHref('a[href*="wa.me"]',     s.contact.whatsapp);
      if (s.contact.email)    setHref('a[href^="mailto"]',    'mailto:' + s.contact.email);
      if (s.contact.phone)    setHref('a[href^="tel"]',       'tel:' + s.contact.phone.replace(/\D/g, ''));
    }

    // ── Nav CTA
    if (s.nav && s.nav.cta) {
      const navBtn = document.querySelector('.nav .btn');
      if (navBtn) {
        const tn = navBtn.childNodes[0];
        if (tn && tn.nodeType === 3) tn.textContent = s.nav.cta + ' ';
      }
    }

    // ── Footer
    if (s.footer) {
      setText('.footer__tagline', s.footer.tagline);
    }

    // ── Site-level CSS overrides
    // Uses <style> injection with !important to beat liquid-glass.css overrides
    if (s.site) {
      const cssRules = [];

      // Accent colour (CSS var only — not overridden by liquid-glass.css)
      if (s.site.accentColor) {
        cssRules.push(':root { --c-accent: ' + s.site.accentColor + '; --c-accent-dim: ' + s.site.accentColor + '1F; }');
      }

      // Text colour
      if (s.site.textColor) {
        cssRules.push(':root { --c-text: ' + s.site.textColor + '; }');
        cssRules.push('body, body p, body h1, body h2, body h3, body h4, body h5, body h6, body span, body li, body a { color: ' + s.site.textColor + ' !important; }');
      }

      // Font family — load from Google Fonts CDN if needed, then apply
      if (s.site.fontFamily) {
        const font = s.site.fontFamily;
        const systemFonts = ['system-ui', 'Arial', 'Georgia'];
        if (!systemFonts.includes(font)) {
          const linkId = 'ep-gfont';
          if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id   = linkId;
            link.rel  = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family='
              + font.replace(/ /g, '+')
              + ':wght@300;400;500;600;700;800&display=swap';
            document.head.appendChild(link);
          }
        }
        const stack = '"' + font + '", system-ui, sans-serif';
        cssRules.push(':root { --font-main: ' + stack + '; }');
        cssRules.push('*, *::before, *::after { font-family: ' + stack + ' !important; }');
      }

      // Background — colour mode
      if (s.site.bgType === 'color' && s.site.bgColor) {
        cssRules.push('body { background: ' + s.site.bgColor + ' !important; background-attachment: initial !important; }');
      }

      // Apply all rules via injected <style> element (beats liquid-glass.css !important)
      if (cssRules.length) {
        var styleEl = document.getElementById('ep-design-overrides');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'ep-design-overrides';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = cssRules.join('\n');
      }
      // bgType === 'image' is applied in applyPhotosFromDB (async, after render)
    }

    // ── Calculator price overrides (write to EP_CONFIG so calc picks them up)
    if (s.calcOverrides && window.EP_CONFIG) {
      const ov = s.calcOverrides;
      if (ov.printBaseCost) EP_CONFIG.printBaseCost = ov.printBaseCost;
      if (ov.products)      Object.assign(EP_CONFIG.products, ov.products);
      if (ov.methods)       Object.assign(EP_CONFIG.methods, ov.methods);
      if (ov.printSizes)    Object.assign(EP_CONFIG.printSizes, ov.printSizes);
      if (ov.quantityTiers) EP_CONFIG.quantityTiers = ov.quantityTiers;
    }

    // ── Init any sliders injected above
    if (window.EPSlider) EPSlider.initAll();
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     PHOTOS FROM INDEXEDDB — overlay photos saved in admin panel
     Runs async after the page renders; overrides localStorage photos with
     the unlimited IDB versions.
  ═══════════════════════════════════════════════════════════════════════════ */
  (async function applyPhotosFromDB() {
    if (typeof EpDB === 'undefined') return;

    function applyBg(el, photos, sliderTitle) {
      if (!el || !photos.length) return;
      var ph = el.querySelector && el.querySelector('.portfolio__placeholder');
      if (ph) ph.style.display = 'none';
      if (photos.length === 1) {
        el.style.backgroundImage    = 'url(' + photos[0] + ')';
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
      } else if (window.EPSlider) {
        el.style.backgroundImage = '';
        EPSlider.build(el, photos, sliderTitle || '');
      }
    }

    // ── Hero
    var heroPhotos = await EpDB.photos.get('hero').catch(() => null) || [];
    if (heroPhotos.length) applyBg(document.querySelector('.hero__bg'), heroPhotos, 'Hero');

    // ── About
    var aboutPhotos = await EpDB.photos.get('about').catch(() => null) || [];
    if (aboutPhotos.length) {
      var aboutWrap = document.querySelector('.about__photo--admin');
      if (!aboutWrap) {
        aboutWrap = document.createElement('div');
        aboutWrap.className = 'about__photo--admin';
        aboutWrap.style.cssText = 'width:100%;aspect-ratio:4/3;border-radius:16px;overflow:hidden;margin-bottom:var(--sp-8,32px);position:relative;';
        var aboutRight = document.querySelector('.about__right');
        if (aboutRight) aboutRight.insertBefore(aboutWrap, aboutRight.firstChild);
      }
      applyBg(aboutWrap, aboutPhotos, 'О студии');
    }

    // ── Service cards
    for (var n = 1; n <= 4; n++) {
      var cardPhotos = await EpDB.photos.get('services:' + n).catch(() => null) || [];
      if (!cardPhotos.length) continue;
      var card = document.querySelector('.service-card:nth-child(' + n + ')');
      if (!card) continue;
      var prev = card.querySelector('.service-card__slider');
      if (prev) prev.remove();
      var wrap = document.createElement('div');
      wrap.className = 'service-card__slider';
      card.insertBefore(wrap, card.firstChild);
      if (window.EPSlider) EPSlider.build(wrap, cardPhotos, '');
      var iconEl = card.querySelector('.service-card__icon');
      if (iconEl) iconEl.style.display = 'none';
    }

    // ── Process steps
    var stepEls = document.querySelectorAll('.process__step');
    for (var sn = 1; sn <= 5; sn++) {
      var stepPhotos = await EpDB.photos.get('process.step' + sn).catch(() => null) || [];
      if (!stepPhotos.length) continue;
      var step = stepEls[sn - 1];
      if (!step) continue;
      var stepWrap = step.querySelector('.process__photo-admin');
      if (!stepWrap) {
        stepWrap = document.createElement('div');
        stepWrap.className = 'process__photo-admin';
        stepWrap.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;margin-bottom:12px;position:relative;';
        step.insertBefore(stepWrap, step.firstChild);
      }
      applyBg(stepWrap, stepPhotos, '');
    }

    // ── Portfolio items
    var pItems = document.querySelectorAll('.portfolio__item');
    for (var pi = 0; pi < pItems.length; pi++) {
      var pPhotos = await EpDB.photos.get('portfolio:' + pi).catch(() => null) || [];
      if (!pPhotos.length) continue;
      var imgEl = pItems[pi].querySelector('.portfolio__img');
      if (!imgEl) continue;
      applyBg(imgEl, pPhotos, '');
    }

    // ── Site background image (only when admin set bgType = 'image')
    try {
      var siteRaw = localStorage.getItem('ep_content');
      var siteSettings = siteRaw ? (JSON.parse(siteRaw).site || {}) : {};
      if (siteSettings.bgType === 'image') {
        var siteBgPhotos = await EpDB.photos.get('site.bg').catch(() => null) || [];
        if (siteBgPhotos.length) {
          var bgStyleEl = document.getElementById('ep-design-overrides');
          if (!bgStyleEl) {
            bgStyleEl = document.createElement('style');
            bgStyleEl.id = 'ep-design-overrides';
            document.head.appendChild(bgStyleEl);
          }
          bgStyleEl.textContent += '\nbody { background: url("' + siteBgPhotos[0] + '") center/cover fixed no-repeat !important; }';
        }
      }
    } catch (_) {}
  })();

  /* ═══════════════════════════════════════════════════════════════════════════
     MOBILE CUSTOMIZER CONTROLS TOGGLE
  ═══════════════════════════════════════════════════════════════════════════ */
  (function initCustMobToggle() {
    var toggleBtn = document.getElementById('custMobToggle');
    var panel     = document.getElementById('customizerControls');
    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener('click', function () {
      var isOpen = panel.classList.toggle('mob-open');
      toggleBtn.classList.toggle('open', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Update viewport hint text for touch devices
    var isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isTouchDevice) {
      var hintMain = document.getElementById('viewportHintMain');
      var hintSub  = document.getElementById('viewportHintSub');
      if (hintMain) hintMain.textContent = 'Проведи для вращения';
      if (hintSub)  hintSub.textContent  = 'Два пальца — масштаб';
    }
  }());

  /* ═══════════════════════════════════════════════════════════════════════════
     SECRET ADMIN ACCESS
     Two methods for the site owner only:
     1. Type "admin" on the keyboard (any page focus, within 3 s between keystrokes)
     2. Triple-click the hidden dot in the footer copyright line
     Admin panel is still password-protected — this just navigates there.
  ═══════════════════════════════════════════════════════════════════════════ */
  (function initSecretAdmin() {
    var SEQ    = 'admin';
    var buf    = '';
    var timer  = null;
    var ADMIN  = 'admin.html';

    // Method 1: keyboard sequence "admin"
    document.addEventListener('keydown', function (e) {
      // Ignore when user is typing in an input/textarea/select
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      buf += e.key.toLowerCase();
      if (buf.length > SEQ.length) buf = buf.slice(-SEQ.length);

      clearTimeout(timer);
      if (buf === SEQ) {
        buf = '';
        window.location.href = ADMIN;
        return;
      }
      // Reset buffer after 3 s of inactivity
      timer = setTimeout(function () { buf = ''; }, 3000);
    });

    // Method 2: triple-click the hidden dot in the footer
    var dot = document.getElementById('adminSecretDot');
    if (dot) {
      var clicks = 0;
      var clickTimer = null;
      dot.addEventListener('click', function () {
        clicks++;
        clearTimeout(clickTimer);
        if (clicks >= 3) {
          clicks = 0;
          window.location.href = ADMIN;
          return;
        }
        clickTimer = setTimeout(function () { clicks = 0; }, 1200);
      });
    }
  }());

})();
