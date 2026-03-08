/**
 * EASY PRODUCTION — Price Calculator
 *
 * Reads all config from window.EP_CONFIG.
 * Renders all selects and option groups dynamically.
 * Calculates price in real-time on any input change.
 *
 * ─── BACKEND EXTENSION POINT ────────────────────────────────────────────────
 * To connect to a backend / admin panel:
 *
 *   1. Replace EP_CONFIG with an API response:
 *      fetch('/api/v1/pricing').then(r=>r.json()).then(cfg => {
 *        window.EP_CONFIG = { ...window.EP_CONFIG, ...cfg };
 *        EPCalculator.init();
 *      });
 *
 *   2. On form submit, POST to /api/v1/quote with the current state
 *      and replace the result panel with the server response.
 *
 *   3. The `EPCalculator.getQuote()` method returns the full
 *      state object ready to serialize as JSON.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  if (!window.EP_CONFIG?.features?.calculator) return;

  const cfg = window.EP_CONFIG;

  /* ─── DOM refs ──────────────────────────────────────────────────────────── */
  const elProduct    = document.getElementById('calcProduct');
  const elMethod     = document.getElementById('calcMethod');
  const elSize       = document.getElementById('calcSize');
  const elColors     = document.getElementById('calcColors');
  const elQty        = document.getElementById('calcQty');
  const elQtyDisplay = document.getElementById('calcQtyDisplay');
  const elQtyTiers   = document.getElementById('qtyTiers');
  const elAddons     = document.getElementById('calcAddons');
  const elTotal      = document.getElementById('calcTotal');
  const elPerUnit    = document.getElementById('calcPerUnit');
  const elDiscount   = document.getElementById('calcDiscount');
  const elSaving     = document.getElementById('calcSaving');
  const elSync       = document.getElementById('calcSync');

  if (!elProduct || !elMethod || !elTotal) return; // calculator not in DOM

  /* ─── Build selects from config ──────────────────────────────────────────── */

  function populateSelect(el, items, selectedKey) {
    el.innerHTML = '';
    Object.entries(items).forEach(([key, val]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.label;
      if (key === selectedKey) opt.selected = true;
      el.appendChild(opt);
    });
  }

  populateSelect(elProduct, cfg.products, cfg.viewer.defaultProduct);
  populateSelect(elMethod,  cfg.methods,  'dtf');
  populateSelect(elSize,    cfg.printSizes, 'md');
  populateSelect(elColors,  cfg.colorCount, 'full');

  /* ─── Quantity tier buttons ──────────────────────────────────────────────── */
  cfg.quantityTiers.forEach(tier => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qty-tier';
    btn.textContent = tier.label;
    btn.dataset.min = tier.min;
    btn.addEventListener('click', () => {
      const target = Math.min(tier.min, 1000);
      elQty.value = target;
      if (elQtyDisplay) elQtyDisplay.textContent = target;
      updateTierHighlight(target);
      calculate();
    });
    elQtyTiers.appendChild(btn);
  });

  function updateTierHighlight(qty) {
    document.querySelectorAll('.qty-tier').forEach(btn => {
      const min = parseInt(btn.dataset.min, 10);
      // find which tier this quantity falls into
      const tier = cfg.quantityTiers.find(
        t => qty >= t.min && qty <= t.max
      );
      btn.classList.toggle('active', tier && tier.min === min);
    });
  }

  /* ─── Addons ─────────────────────────────────────────────────────────────── */
  Object.entries(cfg.addons).forEach(([key, addon]) => {
    const label  = document.createElement('label');
    label.className = 'calc__addon-check';
    label.htmlFor   = `addon_${key}`;

    const check  = document.createElement('input');
    check.type   = 'checkbox';
    check.id     = `addon_${key}`;
    check.name   = key;
    check.dataset.key = key;
    check.addEventListener('change', calculate);

    const span   = document.createElement('span');
    span.className = 'calc__addon-label';

    // Format the price hint
    let priceHint = '';
    if (addon.type === 'perUnit')    priceHint = `+${addon.pricePerUnit}₽/шт`;
    else if (addon.type === 'flat')  priceHint = `+${addon.priceFlat}₽`;
    else if (addon.type === 'multiplier') priceHint = `×${addon.multiplier}`;

    span.innerHTML = `${addon.label} <small style="color:var(--c-accent)">${priceHint}</small>`;

    label.appendChild(check);
    label.appendChild(span);
    elAddons.appendChild(label);
  });

  /* ─── Core calculation ───────────────────────────────────────────────────── */

  /**
   * Returns the quantity-tier discount (fraction 0–1)
   */
  function getDiscount(qty) {
    const tier = cfg.quantityTiers.find(t => qty >= t.min && qty <= t.max)
              || cfg.quantityTiers[cfg.quantityTiers.length - 1];
    return tier.discount;
  }

  /**
   * Returns per-unit cost BEFORE quantity discount, AFTER all other factors.
   */
  function calcPerUnit(qty) {
    const productKey  = elProduct.value;
    const methodKey   = elMethod.value;
    const sizeKey     = elSize.value;
    const colorsKey   = elColors.value;

    const product = cfg.products[productKey]  || {};
    const method  = cfg.methods[methodKey]    || {};
    const size    = cfg.printSizes[sizeKey]   || {};
    const colors  = cfg.colorCount[colorsKey] || {};

    // Base garment price
    let unit = product.basePrice || 0;

    // Print cost
    const printCost = (cfg.printBaseCost + (size.priceAdd || 0))
                    * (method.multiplier || 1)
                    * (colors.multiplier || 1);
    unit += printCost;

    // Addons
    document.querySelectorAll('#calcAddons input[type="checkbox"]:checked').forEach(check => {
      const addon = cfg.addons[check.dataset.key];
      if (!addon) return;
      if (addon.type === 'perUnit')    unit += addon.pricePerUnit;
      if (addon.type === 'multiplier') unit *= addon.multiplier;
      // flat handled at total level
    });

    return unit;
  }

  function calcFlatAddons() {
    let flat = 0;
    document.querySelectorAll('#calcAddons input[type="checkbox"]:checked').forEach(check => {
      const addon = cfg.addons[check.dataset.key];
      if (addon?.type === 'flat') flat += addon.priceFlat;
    });
    return flat;
  }

  function formatNum(n) {
    return Math.round(n).toLocaleString(cfg.locale || 'ru-RU');
  }

  function calculate() {
    const qty      = parseInt(elQty.value, 10) || 1;
    const discount = getDiscount(qty);
    const perUnit  = calcPerUnit(qty);
    const flatExtra = calcFlatAddons();

    const perUnitDiscounted = perUnit * (1 - discount);
    const total             = perUnitDiscounted * qty + flatExtra;
    const saving            = (perUnit - perUnitDiscounted) * qty;

    // Animate total
    animateNumber(elTotal, total);

    if (elPerUnit)   elPerUnit.textContent   = formatNum(perUnitDiscounted) + ' ₽';
    if (elDiscount)  elDiscount.textContent  = discount > 0 ? `-${(discount * 100).toFixed(0)}%` : '—';
    if (elSaving)    elSaving.textContent    = saving > 0 ? `-${formatNum(saving)} ₽` : '0 ₽';

    updateTierHighlight(qty);
  }

  /* ─── Smooth number animation ────────────────────────────────────────────── */
  let animFrame    = null;
  let currentVal   = 0;

  function animateNumber(el, target) {
    if (animFrame) cancelAnimationFrame(animFrame);

    const start     = currentVal;
    const diff      = target - start;
    const duration  = 400; // ms
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      currentVal = start + diff * eased;
      el.textContent = formatNum(currentVal);
      if (progress < 1) animFrame = requestAnimationFrame(tick);
      else currentVal = target;
    }

    animFrame = requestAnimationFrame(tick);
  }

  /* ─── Event listeners ────────────────────────────────────────────────────── */
  [elProduct, elMethod, elSize, elColors].forEach(el => {
    if (el) el.addEventListener('change', calculate);
  });

  if (elQty) {
    elQty.addEventListener('input', () => {
      const v = parseInt(elQty.value, 10) || 1;
      if (elQtyDisplay) elQtyDisplay.textContent = v;
      calculate();
    });
  }

  /* ─── Sync with customizer ───────────────────────────────────────────────── */
  // When customizer changes clothing type, update calc product select
  if (elProduct) {
    elProduct.addEventListener('change', () => {
      // Sync back to 3D viewer if it's ready
      if (window.EPCustomizer) {
        EPCustomizer.switchClothing(elProduct.value);
        if (elSync) {
          elSync.hidden = false;
          setTimeout(() => { if (elSync) elSync.hidden = true; }, 3000);
        }
      }
    });
  }

  /* ─── Public API ─────────────────────────────────────────────────────────── */
  window.EPCalculator = {
    init: calculate,

    /** Returns the current quote state, ready to POST to backend */
    getQuote() {
      const qty      = parseInt(elQty.value, 10) || 1;
      const discount = getDiscount(qty);
      const perUnit  = calcPerUnit(qty);
      const flatExtra = calcFlatAddons();
      const perUnitDiscounted = perUnit * (1 - discount);
      const total = perUnitDiscounted * qty + flatExtra;

      const addons = [];
      document.querySelectorAll('#calcAddons input[type="checkbox"]:checked').forEach(c => {
        addons.push(c.dataset.key);
      });

      return {
        product:  elProduct.value,
        method:   elMethod.value,
        size:     elSize.value,
        colors:   elColors.value,
        quantity: qty,
        addons,
        perUnitBase:      Math.round(perUnit),
        perUnitFinal:     Math.round(perUnitDiscounted),
        discount:         discount,
        totalEstimate:    Math.round(total),
        currency:         cfg.currency,
        timestamp:        new Date().toISOString(),
      };
    },
  };

  /* ─── Initial render ─────────────────────────────────────────────────────── */
  calculate();

})();
