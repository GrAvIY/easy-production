/**
 * EASY PRODUCTION — Global Configuration
 *
 * All pricing coefficients, product options, and feature flags live here.
 * This is the SINGLE SOURCE OF TRUTH for the calculator and customizer.
 *
 * ─── ADMIN PANEL HOOK ───────────────────────────────────────────────────────
 * In production, replace this static object with an API call:
 *
 *   fetch('/api/v1/config')
 *     .then(r => r.json())
 *     .then(cfg => { window.EP_CONFIG = cfg; App.init(); });
 *
 * The admin panel should expose the same JSON structure below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

window.EP_CONFIG = {

  // ─── Products ────────────────────────────────────────────────────────────
  // basePrice: производственная цена без нанесения (RUB)
  products: {
    tshirt:      { label: 'Футболка',    basePrice: 450,  icon: 'icon-tshirt',     popular: true  },
    longsleeve:  { label: 'Лонгслив',   basePrice: 580,  icon: 'icon-longsleeve', popular: false },
    hoodie:      { label: 'Худи',        basePrice: 1250, icon: 'icon-hoodie',     popular: true  },
    ziphoodie:   { label: 'Зип-худи',   basePrice: 1450, icon: 'icon-ziphoodie',  popular: false },
    sweatshirt:  { label: 'Свитшот',    basePrice: 950,  icon: 'icon-sweatshirt', popular: false },
    shorts:      { label: 'Шорты',      basePrice: 520,  icon: 'icon-shorts',     popular: false },
    pants:       { label: 'Штаны',      basePrice: 750,  icon: 'icon-pants',      popular: false },
    hat:         { label: 'Шапка',      basePrice: 380,  icon: 'icon-hat',        popular: false },
  },

  // ─── Application methods ─────────────────────────────────────────────────
  // multiplier: коэффициент к базовой цене нанесения
  methods: {
    dtf:         { label: 'DTF-печать',           multiplier: 1.00, minQty: 1,   desc: 'Любое количество цветов. Фото-качество.' },
    dtg:         { label: 'Прямая печать (DTG)',   multiplier: 1.20, minQty: 1,   desc: 'Печать прямо на ткани. Мягкий результат.' },
    screenprint: { label: 'Шелкография',          multiplier: 0.82, minQty: 30,  desc: 'Лучшая цена на тиражи от 30 шт.' },
    embroidery:  { label: 'Вышивка',              multiplier: 1.50, minQty: 1,   desc: 'Плотная объёмная вышивка. Премиум-качество.' },
    sublimation: { label: 'Сублимация',           multiplier: 1.10, minQty: 1,   desc: 'Только для светлых синтетических тканей.' },
    vinylcut:    { label: 'Термовинил',           multiplier: 0.90, minQty: 1,   desc: 'Матовые / глянцевые плёнки, флок.' },
    emboss:      { label: 'Тиснение / деборе',    multiplier: 1.80, minQty: 50,  desc: 'Рельефный логотип без краски.' },
  },

  // ─── Print sizes ─────────────────────────────────────────────────────────
  printSizes: {
    xs:   { label: 'XS — до 8×8 см',   priceAdd: 0    },
    sm:   { label: 'S — до 15×15 см',  priceAdd: 60   },
    md:   { label: 'M — до 25×25 см',  priceAdd: 130  },
    lg:   { label: 'L — до 35×35 см',  priceAdd: 220  },
    xl:   { label: 'XL — до 45×45 см', priceAdd: 340  },
  },

  // ─── Color count (актуально для шелкографии) ─────────────────────────────
  colorCount: {
    1:    { label: '1 цвет',             multiplier: 1.00 },
    2:    { label: '2 цвета',            multiplier: 1.14 },
    3:    { label: '3 цвета',            multiplier: 1.26 },
    4:    { label: '4 цвета',            multiplier: 1.38 },
    full: { label: 'Полноцвет / фото',   multiplier: 1.55 },
  },

  // ─── Quantity discounts ──────────────────────────────────────────────────
  quantityTiers: [
    { min: 1,    max: 9,       discount: 0.00, label: 'от 1 шт'    },
    { min: 10,   max: 29,      discount: 0.05, label: 'от 10 шт'   },
    { min: 30,   max: 99,      discount: 0.12, label: 'от 30 шт'   },
    { min: 100,  max: 299,     discount: 0.20, label: 'от 100 шт'  },
    { min: 300,  max: 999,     discount: 0.28, label: 'от 300 шт'  },
    { min: 1000, max: Infinity, discount: 0.36, label: 'от 1000 шт' },
  ],

  // ─── Addons ──────────────────────────────────────────────────────────────
  addons: {
    rushOrder:    { label: 'Срочный заказ (3–5 дней)',    pricePerUnit: 350, type: 'perUnit' },
    packaging:    { label: 'Индивидуальная упаковка',     pricePerUnit: 90,  type: 'perUnit' },
    brandedTags:  { label: 'Брендированные бирки',        pricePerUnit: 65,  type: 'perUnit' },
    frontBack:    { label: 'Двустороннее нанесение',      multiplier: 1.75,  type: 'multiplier' },
    proofSample:  { label: 'Образец перед тиражом',       priceFlat: 1500,   type: 'flat' },
  },

  // ─── Print base cost (RUB) ───────────────────────────────────────────────
  // Стоимость нанесения ДО применения коэффициентов
  printBaseCost: 250,

  // ─── UI / UX ─────────────────────────────────────────────────────────────
  currency: '₽',
  locale: 'ru-RU',

  // ─── 3D Viewer ───────────────────────────────────────────────────────────
  viewer: {
    defaultProduct: 'tshirt',
    defaultColor: '#FFFFFF',
    colors: [
      { hex: '#FFFFFF', name: 'Белый'       },
      { hex: '#1A1A1A', name: 'Чёрный'      },
      { hex: '#D9D0C4', name: 'Молочный'    },
      { hex: '#4A5568', name: 'Серый'       },
      { hex: '#2B4C7E', name: 'Тёмно-синий' },
      { hex: '#2D6A4F', name: 'Хаки'        },
      { hex: '#8B2635', name: 'Бордо'       },
      { hex: '#E8C547', name: 'Жёлтый'      },
    ],
    // File paths for 3D models (fallback when no IDB model uploaded via admin).
    // Place .glb files in assets/models/ and set paths here.
    // Set to null to use procedural geometry for that type.
    models: {
      tshirt:     'assets/models/tshirt.glb',
      longsleeve: 'assets/models/longsleeve.glb',
      hoodie:     'assets/models/hoodie.glb',
      ziphoodie:  'assets/models/ziphoodie.glb',
      sweatshirt: 'assets/models/sweatshirt.glb',
      shorts:     'assets/models/shorts.glb',
      pants:      'assets/models/pants.glb',
      hat:        'assets/models/hat.glb',
    },
  },

  // ─── Contact ─────────────────────────────────────────────────────────────
  contact: {
    telegram:  'https://t.me/easyprod_ru',
    whatsapp:  'https://wa.me/79001234567',
    email:     'hello@easy-production.ru',
    phone:     '+7 (900) 123-45-67',
    address:   'Москва, ул. Промышленная, 12',
    workHours: 'Пн–Пт: 9:00–19:00',
  },

  // ─── Feature flags ───────────────────────────────────────────────────────
  // Позволяют включать/выключать секции без правки HTML
  features: {
    threeDViewer:    true,
    drawMode:        true,
    printUpload:     true,
    calculator:      true,
    portfolio:       true,
    faq:             true,
  },

};
