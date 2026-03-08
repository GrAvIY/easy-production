/**
 * Easy Production — Calculator Config Editor
 * Reads / writes EP_CONFIG pricing tables.
 */
const CalcConfig = {

  _cfg: null, // reference to EP_CONFIG saved in content

  init(content) {
    // The calculator config lives in EP_CONFIG (js/config.js).
    // We store overrides in content.calcOverrides and apply them via app.js.
    // If no overrides saved yet, load from the live EP_CONFIG object (if on same page).
    const saved = content.calcOverrides || this._defaultConfig();
    content.calcOverrides = saved;
    this._cfg = saved;
    this._render();
  },

  collect(content) {
    const cfg = content.calcOverrides || {};

    // Base print cost
    const baseEl = document.getElementById('calc-printBase');
    if (baseEl) cfg.printBaseCost = parseFloat(baseEl.value) || 250;

    // Products
    cfg.products = {};
    document.querySelectorAll('#calc-products [data-prod]').forEach(row => {
      const key = row.dataset.prod;
      cfg.products[key] = {
        label:     row.querySelector('[data-f="label"]').value,
        basePrice: parseFloat(row.querySelector('[data-f="price"]').value) || 0,
      };
    });

    // Methods
    cfg.methods = {};
    document.querySelectorAll('#calc-methods [data-mth]').forEach(row => {
      const key = row.dataset.mth;
      cfg.methods[key] = {
        label:      row.querySelector('[data-f="label"]').value,
        multiplier: parseFloat(row.querySelector('[data-f="mult"]').value) || 1,
        minQty:     parseInt(row.querySelector('[data-f="minqty"]').value) || 1,
      };
    });

    // Print sizes
    cfg.printSizes = {};
    document.querySelectorAll('#calc-sizes [data-sz]').forEach(row => {
      const key = row.dataset.sz;
      cfg.printSizes[key] = {
        label:    row.querySelector('[data-f="label"]').value,
        priceAdd: parseFloat(row.querySelector('[data-f="add"]').value) || 0,
      };
    });

    // Quantity tiers
    cfg.quantityTiers = [];
    document.querySelectorAll('#calc-tiers [data-tier]').forEach(row => {
      cfg.quantityTiers.push({
        min:      parseInt(row.querySelector('[data-f="min"]').value) || 0,
        max:      row.querySelector('[data-f="max"]').value === '∞' ? Infinity : parseInt(row.querySelector('[data-f="max"]').value) || 9999,
        discount: parseFloat(row.querySelector('[data-f="disc"]').value) / 100 || 0,
        label:    row.querySelector('[data-f="lbl"]').value,
      });
    });

    content.calcOverrides = cfg;
  },

  _render() {
    const cfg = this._cfg;

    // Base cost
    const baseEl = document.getElementById('calc-printBase');
    if (baseEl) baseEl.value = cfg.printBaseCost || 250;

    // Products table
    this._buildTable('calc-products',
      ['Изделие', 'Название', 'Базовая цена (₽)'],
      Object.entries(cfg.products || {}),
      ([key, p]) => `<tr data-prod="${key}">
        <td><code style="font-size:12px">${key}</code></td>
        <td><input data-f="label" value="${esc(p.label)}" /></td>
        <td><input data-f="price" value="${p.basePrice}" style="width:90px" /></td>
      </tr>`
    );

    // Methods table
    this._buildTable('calc-methods',
      ['Ключ', 'Название', 'Коэф.', 'Мин. кол-во'],
      Object.entries(cfg.methods || {}),
      ([key, m]) => `<tr data-mth="${key}">
        <td><code style="font-size:12px">${key}</code></td>
        <td><input data-f="label" value="${esc(m.label)}" /></td>
        <td><input data-f="mult"  value="${m.multiplier}" style="width:70px" /></td>
        <td><input data-f="minqty" value="${m.minQty}" style="width:70px" /></td>
      </tr>`
    );

    // Print sizes
    this._buildTable('calc-sizes',
      ['Ключ', 'Название', 'Надбавка (₽)'],
      Object.entries(cfg.printSizes || {}),
      ([key, s]) => `<tr data-sz="${key}">
        <td><code style="font-size:12px">${key}</code></td>
        <td><input data-f="label" value="${esc(s.label)}" /></td>
        <td><input data-f="add"   value="${s.priceAdd}" style="width:90px" /></td>
      </tr>`
    );

    // Quantity tiers
    this._buildTable('calc-tiers',
      ['От', 'До', 'Скидка (%)', 'Метка'],
      cfg.quantityTiers || [],
      (tier, idx) => `<tr data-tier="${idx}">
        <td><input data-f="min"  value="${tier.min}" style="width:70px" /></td>
        <td><input data-f="max"  value="${tier.max === Infinity ? '∞' : tier.max}" style="width:70px" /></td>
        <td><input data-f="disc" value="${Math.round((tier.discount || 0) * 100)}" style="width:70px" /></td>
        <td><input data-f="lbl"  value="${esc(tier.label)}" /></td>
      </tr>`
    );
  },

  _buildTable(id, headers, rows, rowFn) {
    const el = document.getElementById(id);
    if (!el) return;
    const head = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const body = `<tbody>${rows.map(rowFn).join('')}</tbody>`;
    el.innerHTML = head + body;
  },

  _defaultConfig() {
    // Mirror of js/config.js defaults
    return {
      printBaseCost: 250,
      products: {
        tshirt:     { label: 'Футболка',   basePrice: 450  },
        longsleeve: { label: 'Лонгслив',   basePrice: 580  },
        hoodie:     { label: 'Худи',       basePrice: 1250 },
        ziphoodie:  { label: 'Зип-худи',   basePrice: 1450 },
        sweatshirt: { label: 'Свитшот',    basePrice: 950  },
        shorts:     { label: 'Шорты',      basePrice: 520  },
        pants:      { label: 'Штаны',      basePrice: 750  },
        hat:        { label: 'Шапка',      basePrice: 380  },
      },
      methods: {
        dtf:         { label: 'DTF-печать',         multiplier: 1.00, minQty: 1  },
        dtg:         { label: 'Прямая печать (DTG)', multiplier: 1.20, minQty: 1  },
        screenprint: { label: 'Шелкография',        multiplier: 0.82, minQty: 30 },
        embroidery:  { label: 'Вышивка',            multiplier: 1.50, minQty: 1  },
        sublimation: { label: 'Сублимация',         multiplier: 1.10, minQty: 1  },
        vinylcut:    { label: 'Термовинил',         multiplier: 0.90, minQty: 1  },
        emboss:      { label: 'Тиснение / деборе',  multiplier: 1.80, minQty: 50 },
      },
      printSizes: {
        xs: { label: 'XS — до 8×8 см',   priceAdd: 0   },
        sm: { label: 'S — до 15×15 см',  priceAdd: 60  },
        md: { label: 'M — до 25×25 см',  priceAdd: 130 },
        lg: { label: 'L — до 35×35 см',  priceAdd: 220 },
        xl: { label: 'XL — до 45×45 см', priceAdd: 340 },
      },
      quantityTiers: [
        { min: 1,    max: 9,        discount: 0.00, label: 'от 1 шт'    },
        { min: 10,   max: 29,       discount: 0.05, label: 'от 10 шт'   },
        { min: 30,   max: 99,       discount: 0.12, label: 'от 30 шт'   },
        { min: 100,  max: 299,      discount: 0.20, label: 'от 100 шт'  },
        { min: 300,  max: 999,      discount: 0.28, label: 'от 300 шт'  },
        { min: 1000, max: Infinity, discount: 0.36, label: 'от 1000 шт' },
      ],
    };
  },
};

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
