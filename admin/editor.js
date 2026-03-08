/**
 * Easy Production — Admin Editor
 * Loads content from /data/site-content.json (default) or localStorage (saved).
 * Saves text content to localStorage; photos/models go to IndexedDB (EpDB).
 */

const STORAGE_KEY         = 'ep_content';
const CUSTOM_PRODUCTS_KEY = 'ep_custom_products';
const HIDDEN_PRODUCTS_KEY = 'ep_hidden_products';
const ORDERS_KEY          = 'ep_orders';
let _content = {};

/* ─── Orders helpers ──────────────────────────────────────────────────────── */
function loadOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveOrders(arr) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(arr));
}
function orderUnreadCount() {
  return loadOrders().filter(o => o.status === 'new').length;
}
function deleteOrder(id) {
  saveOrders(loadOrders().filter(o => o.id !== id));
  renderOrdersPanel();
  updateOrdersBadge();
}
function markOrderProcessed(id) {
  const orders = loadOrders();
  const o = orders.find(o => o.id === id);
  if (o) o.status = 'processed';
  saveOrders(orders);
  renderOrdersPanel();
  updateOrdersBadge();
}
function updateOrdersBadge() {
  const badge = document.getElementById('ordersBadge');
  if (!badge) return;
  const n = orderUnreadCount();
  badge.textContent = n;
  badge.hidden = n === 0;
}

function renderOrdersPanel() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  const orders = loadOrders();

  if (orders.length === 0) {
    container.innerHTML = '<p class="orders-empty">Заявок пока нет. Они появятся здесь когда пользователи заполнят форму на сайте.</p>';
    return;
  }

  container.innerHTML = orders.map(o => {
    const date = new Date(o.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isNew = o.status === 'new';
    const sourceLbl = o.source === 'customizer' ? '🎨 Конструктор' : o.source === 'contact' ? '📬 Контакт-форма' : '📝 Форма';
    const designHtml = o.design
      ? `<div class="order-card__design"><img src="${esc(o.design)}" alt="Дизайн" /></div>`
      : '';
    const quoteHtml = o.quote
      ? `<div class="order-card__quote">💰 Предварительный расчёт: <strong>${esc(String(o.quote.total || o.quote.price || JSON.stringify(o.quote)))}</strong></div>`
      : '';
    return `<div class="order-card ${isNew ? 'order-card--new' : ''}">
      <div class="order-card__header">
        <div>
          <span class="order-card__name">${esc(o.name)}${o.surname ? ' ' + esc(o.surname) : ''}</span>
          ${isNew ? '<span class="order-badge-new">Новая</span>' : '<span class="order-badge-done">Обработана</span>'}
        </div>
        <span class="order-card__date">${date}</span>
      </div>
      ${designHtml}
      <div class="order-card__body">
        ${o.phone    ? `<div class="order-card__row"><span>📞</span> <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></div>` : ''}
        ${o.email    ? `<div class="order-card__row"><span>✉️</span> <a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>` : ''}
        ${o.product  ? `<div class="order-card__row"><span>👕</span> ${esc(o.product)}${o.qty ? ', ' + o.qty + ' шт.' : ''}</div>` : ''}
        ${o.comment  ? `<div class="order-card__row order-card__comment"><span>💬</span> ${esc(o.comment)}</div>` : ''}
        ${quoteHtml}
        <div class="order-card__row order-card__source">${sourceLbl}</div>
      </div>
      <div class="order-card__actions">
        ${isNew ? `<button class="btn-order-action btn-order-done" onclick="markOrderProcessed(${o.id})">✓ Отметить обработанной</button>` : ''}
        <button class="btn-order-action btn-order-del" onclick="deleteOrder(${o.id})">🗑 Удалить</button>
      </div>
    </div>`;
  }).join('');
}

/* ─── Custom product helpers ─────────────────────────────────────────────── */
function loadCustomProducts() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_PRODUCTS_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveCustomProducts(arr) {
  localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(arr));
}

/* ─── Hidden built-in product helpers ───────────────────────────────────── */
function loadHiddenProducts() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_PRODUCTS_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveHiddenProducts(arr) {
  localStorage.setItem(HIDDEN_PRODUCTS_KEY, JSON.stringify(arr));
}

/* ─── Site background image (IDB key: 'site.bg') ────────────────────────── */
async function uploadSiteBg() {
  if (typeof EpDB === 'undefined') { toast('IndexedDB недоступен', 'error'); return; }
  const dataUrl = await Uploader.upload();
  if (!dataUrl) return;
  await EpDB.photos.set('site.bg', [dataUrl]);
  _updateBgImgPreview(dataUrl);
  toast('Фоновое изображение загружено', 'success');
}

async function removeSiteBg() {
  if (typeof EpDB !== 'undefined') await EpDB.photos.del('site.bg').catch(() => {});
  _updateBgImgPreview(null);
  toast('Фоновое изображение удалено', 'success');
}

function _updateBgImgPreview(src) {
  const preview     = document.getElementById('bgImgPreview');
  const placeholder = document.getElementById('bgImgPlaceholder');
  const removeBtn   = document.getElementById('bgImgRemove');
  if (src) {
    if (preview)     { preview.src = src; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn)   removeBtn.style.display = '';
  } else {
    if (preview)     { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = '';
    if (removeBtn)   removeBtn.style.display = 'none';
  }
}

async function restoreBgImgPreview() {
  if (typeof EpDB === 'undefined') return;
  const photos = await EpDB.photos.get('site.bg').catch(() => null) || [];
  if (photos.length) _updateBgImgPreview(photos[0]);
}

/* ─── Public API ──────────────────────────────────────────────────────────── */
const Admin = {

  async init() {
    _content = await loadContent();
    populateAllFields();
    CalcConfig.init(_content);
    renderSectionPhotos('hero',  'heroPhotosContainer');
    renderSectionPhotos('about', 'aboutPhotosContainer');
    renderServiceCards();
    renderProcessSteps();
    renderPortfolio();
    renderFaq();
    renderModelsPanel();
    renderOrdersPanel();
    updateOrdersBadge();
    restoreBgImgPreview();
    setStatus('Данные загружены');
  },

  show(panelId) {
    document.querySelectorAll('.editor-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) panel.classList.add('active');
    document.querySelector(`[data-panel="${panelId}"]`)?.classList.add('active');
    if (panelId === 'orders') { renderOrdersPanel(); updateOrdersBadge(); }
  },

  save() {
    try {
      // Collect all simple [data-key] fields
      document.querySelectorAll('[data-key]').forEach(el => {
        setByPath(_content, el.dataset.key, el.value);
      });

      // Collect calculator config
      try { CalcConfig.collect(_content); } catch (_) {}

      // Collect portfolio (text only — photos are in IndexedDB)
      if (!_content.portfolio) _content.portfolio = {};
      _content.portfolio.items = Editor.collectPortfolio();

      // Collect FAQ
      if (!_content.faq) _content.faq = {};
      _content.faq.items = Editor.collectFaq();

      const json    = JSON.stringify(_content);
      const sizeKb  = Math.round(json.length / 1024);
      localStorage.setItem(STORAGE_KEY, json);
      setStatus('Сохранено ✓ (' + sizeKb + ' KB)', 'success');
      toast('Сохранено (' + sizeKb + ' KB)', 'success');
    } catch (err) {
      setStatus('Ошибка сохранения', 'error');
      toast('Ошибка: ' + err.message, 'error');
    }
  },

  preview() {
    window.open('../index.html', '_blank');
  },

  exportJSON() {
    Admin.save();
    const blob = new Blob([JSON.stringify(_content, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site-content.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('JSON экспортирован', 'success');
  },

  reset() {
    if (!confirm('Сбросить ВСЕ изменения? Будут возвращены исходные тексты.')) return;
    localStorage.removeItem(STORAGE_KEY);
    toast('Сброс выполнен. Перезагрузка...', 'success');
    setTimeout(() => location.reload(), 1200);
  },
};

/* ─── Editor helpers ─────────────────────────────────────────────────────── */
const Editor = {
  addPortfolioItem() {
    if (!_content.portfolio) _content.portfolio = {};
    if (!Array.isArray(_content.portfolio.items)) _content.portfolio.items = [];
    _content.portfolio.items.push({ title: 'Новый проект', client: 'Клиент', method: 'Метод', tag: 'Мерч' });
    renderPortfolio();
  },

  collectPortfolio() {
    const rows = document.querySelectorAll('.portfolio-row');
    return Array.from(rows).map(r => ({
      title:  r.querySelector('[data-field="title"]')?.value  || '',
      client: r.querySelector('[data-field="client"]')?.value || '',
      method: r.querySelector('[data-field="method"]')?.value || '',
      tag:    r.querySelector('[data-field="tag"]')?.value    || '',
    }));
  },

  removePortfolioItem(idx) {
    _content.portfolio.items.splice(idx, 1);
    // Delete IDB photos for that index (best-effort, don't await)
    if (typeof EpDB !== 'undefined') EpDB.photos.del('portfolio:' + idx).catch(() => {});
    renderPortfolio();
  },

  addFaqItem() {
    if (!_content.faq) _content.faq = {};
    if (!Array.isArray(_content.faq.items)) _content.faq.items = [];
    _content.faq.items.push({ q: 'Вопрос?', a: 'Ответ.' });
    renderFaq();
  },

  collectFaq() {
    const items = document.querySelectorAll('.faq-edit-item');
    return Array.from(items).map(el => ({
      q: el.querySelector('[data-field="q"]').value,
      a: el.querySelector('[data-field="a"]').value,
    }));
  },

  removeFaqItem(idx) {
    _content.faq.items.splice(idx, 1);
    renderFaq();
  },
};

/* ─── Render dynamic sections ────────────────────────────────────────────── */

async function renderServiceCards() {
  const container = document.getElementById('serviceCardsContainer');
  if (!container) return;

  // Load photos from IDB for all 4 cards in parallel
  const photoArrays = typeof EpDB !== 'undefined'
    ? await Promise.all([1,2,3,4].map(n => EpDB.photos.get('services:' + n).then(r => r || [])))
    : [[],[],[],[]];

  const cards = [1,2,3,4].map((n, ni) => {
    const photos    = photoArrays[ni];
    const photoGrid = renderPhotoGrid(photos, 'removeServiceCardPhoto_' + n);
    return `
    <div class="card">
      <div class="card__title card__title--mb12">Карточка ${n}: ${esc(_content.services?.[`card${n}Title`] || '')}</div>
      <div class="upload-area" style="flex-direction:column;align-items:flex-start;gap:8px;">
        <div class="card__hint" style="font-size:11px;color:#888;margin-bottom:2px;">Фото для карточки (до 4)</div>
        ${photoGrid}
        <button class="btn-icon" onclick="uploadServiceCardPhotos(${n})">&#128247; Добавить фото</button>
      </div>
      <div class="fields-grid">
        <div class="field-group"><label>Заголовок</label><input type="text" data-key="services.card${n}Title" value="${esc(_content.services?.[`card${n}Title`])}" /></div>
        <div class="field-group"><label>Описание</label><textarea data-key="services.card${n}Desc">${esc(_content.services?.[`card${n}Desc`])}</textarea></div>
      </div>
      <div class="fields-grid cols3">
        <div class="field-group"><label>Фича 1</label><input type="text" data-key="services.card${n}F1" value="${esc(_content.services?.[`card${n}F1`])}" /></div>
        <div class="field-group"><label>Фича 2</label><input type="text" data-key="services.card${n}F2" value="${esc(_content.services?.[`card${n}F2`])}" /></div>
        <div class="field-group"><label>Фича 3</label><input type="text" data-key="services.card${n}F3" value="${esc(_content.services?.[`card${n}F3`])}" /></div>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = cards;

  // Attach remove handlers for each card
  [1,2,3,4].forEach(n => {
    window['removeServiceCardPhoto_' + n] = (pi) => removeServiceCardPhoto(n, pi);
  });
}

async function renderProcessSteps() {
  const container = document.getElementById('processStepsContainer');
  if (!container) return;

  // Load photos from IDB for all 5 steps in parallel
  const photoArrays = typeof EpDB !== 'undefined'
    ? await Promise.all([1,2,3,4,5].map(n => EpDB.photos.get('process.step' + n).then(r => r || [])))
    : [[],[],[],[],[]];

  const steps = [1,2,3,4,5].map((n, ni) => {
    const photos = photoArrays[ni];
    const thumbs = photos.length
      ? `<div class="photo-thumb-grid">${photos.map((src, i) =>
          `<div class="photo-thumb-item"><img src="${src}" alt="Фото ${i+1}" /><button class="photo-thumb-remove" onclick="removeSectionPhoto('process.step${n}',${i})" title="Удалить">\u2715</button></div>`
        ).join('')}</div>`
      : '<div style="font-size:11px;color:#888;margin-bottom:8px;">Нет фото</div>';
    return `
    <div class="card">
      <div class="fields-grid">
        <div class="field-group"><label>Шаг ${n} — Заголовок</label><input type="text" data-key="process.step${n}Title" value="${esc(_content.process?.['step' + n + 'Title'])}" /></div>
        <div class="field-group"><label>Шаг ${n} — Описание</label><textarea data-key="process.step${n}Desc">${esc(_content.process?.['step' + n + 'Desc'])}</textarea></div>
      </div>
      <div class="field-group">
        <label>Фото шага (до 4)</label>
        <div id="processStep${n}Photos">${thumbs}</div>
        <button class="btn-icon" onclick="uploadSectionPhotos('process.step${n}')" style="margin-top:6px;">&#128247; Добавить фото</button>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = steps;
}

async function renderPortfolio() {
  const list = document.getElementById('portfolioList');
  if (!list) return;
  const items = _content.portfolio?.items || [];

  // Load photos from IDB for all portfolio items in parallel
  const photoArrays = typeof EpDB !== 'undefined'
    ? await Promise.all(items.map((_, idx) => EpDB.photos.get('portfolio:' + idx).then(r => r || [])))
    : items.map(() => []);

  list.innerHTML = items.map((item, idx) => {
    const photos    = photoArrays[idx];
    const photoGrid = renderPhotoGridPortfolio(photos, idx);
    return `
    <div class="portfolio-item portfolio-row">
      <div class="upload-area upload-area--compact" style="flex-direction:column;align-items:flex-start;gap:6px;padding:6px;">
        ${photoGrid}
        <button class="btn-icon" onclick="uploadPortfolioPhotos(${idx})" title="Добавить фото">&#128247; Добавить</button>
      </div>
      <input data-field="title"  value="${esc(item.title)}"  placeholder="Название" class="portfolio-input" />
      <input data-field="client" value="${esc(item.client)}" placeholder="Клиент"   class="portfolio-input" />
      <input data-field="method" value="${esc(item.method)}" placeholder="Метод"    class="portfolio-input" />
      <input data-field="tag"    value="${esc(item.tag)}"    placeholder="Тег"      class="portfolio-input" />
      <button class="btn-icon danger" onclick="Editor.removePortfolioItem(${idx})">&#128465;</button>
    </div>`;
  }).join('');
}

function renderFaq() {
  const list = document.getElementById('faqList');
  if (!list) return;
  const items = _content.faq?.items || [];
  list.innerHTML = items.map((item, idx) => `
    <div class="faq-item faq-edit-item">
      <div class="faq-item__row">
        <span class="faq-num">Вопрос ${idx + 1}</span>
        <button class="btn-icon danger" onclick="Editor.removeFaqItem(${idx})">&#128465; Удалить</button>
      </div>
      <div class="field-group"><label>Вопрос</label><input type="text" data-field="q" value="${esc(item.q)}" /></div>
      <div class="field-group"><label>Ответ</label><textarea data-field="a">${esc(item.a)}</textarea></div>
    </div>
  `).join('');
}

/* ─── 3D Models panel ─────────────────────────────────────────────────────── */

const MODEL_TYPES = {
  tshirt:     'Футболка',
  longsleeve: 'Лонгслив',
  hoodie:     'Худи',
  ziphoodie:  'Зип-худи',
  sweatshirt: 'Свитшот',
  shorts:     'Шорты',
  pants:      'Штаны',
  hat:        'Шапка',
};

async function renderModelsPanel() {
  const container = document.getElementById('modelsContainer');
  if (!container) return;
  if (typeof EpDB === 'undefined') {
    container.innerHTML = '<div class="card"><div class="card__hint">IndexedDB недоступен в этом браузере.</div></div>';
    return;
  }

  const existingKeys    = await EpDB.models.keys().catch(() => []);
  const customProducts  = loadCustomProducts();
  const hiddenProducts  = loadHiddenProducts();

  // ── Card renderer ─────────────────────────────────────────────────────────
  function modelCard(type, label, isCustom) {
    const hasModel  = existingKeys.includes(type);
    const isHidden  = !isCustom && hiddenProducts.includes(type);
    const filename  = type + '.glb';
    return `
    <div class="card" style="${isHidden ? 'opacity:.55;' : ''}">
      <div class="card__header">
        <div class="card__title">
          ${esc(label)}
          ${isCustom ? ' <span class="badge">Польз.</span>' : ''}
          ${isHidden  ? ' <span class="badge" style="background:rgba(0,0,0,.08);color:#6B7280;">Скрыт</span>' : ''}
        </div>
        ${hasModel
          ? '<span class="model-status--ok">&#10003; 3D модель загружена</span>'
          : `<span class="model-status--none">${isCustom ? 'Нет модели' : 'Процедурная геометрия'}</span>`}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-icon" onclick="uploadModel('${type}')">&#128230; Загрузить .glb</button>
        ${hasModel ? `<button class="btn-icon" onclick="deployModel('${type}')" title="Скачать файл для публикации на сайте">&#128190; Скачать для сайта</button>` : ''}
        ${hasModel ? `<button class="btn-icon danger" onclick="removeModel('${type}')">&#128465; Удалить модель</button>` : ''}
        ${isCustom
          ? `<button class="btn-icon danger" onclick="removeCustomProduct('${type}')">&#10005; Удалить раздел</button>`
          : isHidden
            ? `<button class="btn-icon" onclick="restoreBuiltinProduct('${type}')">&#8635; Восстановить раздел</button>`
            : `<button class="btn-icon danger" onclick="hideBuiltinProduct('${type}')">&#10005; Удалить раздел</button>`}
      </div>
      ${hasModel ? `<p style="font-size:11px;color:#6B7280;margin-top:8px;">&#128161; Нажмите «Скачать для сайта», сохраните файл как <code>assets/models/${filename}</code> и обновите сайт — тогда модель увидят все пользователи на всех устройствах.</p>` : ''}
    </div>`;
  }

  const builtinHtml = Object.entries(MODEL_TYPES)
    .map(([type, label]) => modelCard(type, label, false))
    .join('');

  const customHtml = customProducts.length
    ? customProducts.map(p => modelCard(p.key, p.label, true)).join('')
    : '<div class="card"><div class="card__hint">Нет пользовательских разделов.</div></div>';

  // ── Add-section form ──────────────────────────────────────────────────────
  const addForm = `
    <div class="card">
      <div class="card__title card__title--mb12">Добавить раздел конструктора</div>
      <div class="card__hint">Новый раздел появится как вкладка в 3D конструкторе на сайте. После добавления загрузите для него .glb модель.</div>
      <div style="display:flex;gap:10px;align-items:flex-end;margin-top:12px;">
        <div class="field-group" style="flex:1;margin-bottom:0;">
          <label>Название раздела</label>
          <input type="text" id="newProductLabel" placeholder="Например: Куртка" />
        </div>
        <button class="tb-btn tb-btn--primary" onclick="addCustomProduct()" style="flex-shrink:0;height:40px;">+ Добавить</button>
      </div>
    </div>`;

  container.innerHTML = `
    <div class="card" style="border-color:#FBBF24;background:#FFFBEB;">
      <div class="card__title card__title--mb8" style="color:#92400E;">&#128161; Как сделать модели видимыми для всех пользователей</div>
      <div class="card__hint" style="color:#78350F;">
        Модели загруженные в этой панели хранятся <strong>только в вашем браузере</strong>. Чтобы модели отображались на всех устройствах (телефоны, другие браузеры):
        <ol style="margin:10px 0 0 16px;line-height:2;">
          <li>Загрузите .glb модель кнопкой <strong>«Загрузить .glb»</strong></li>
          <li>Нажмите <strong>«Скачать для сайта»</strong> — файл скачается</li>
          <li>Сохраните файл в папку <code>assets/models/</code> вашего проекта</li>
          <li>В терминале выполните:<br>
            <code>git add assets/models/</code><br>
            <code>git commit -m "Add 3D model"</code><br>
            <code>git push origin main</code>
          </li>
        </ol>
      </div>
    </div>
    <div class="card">
      <div class="card__title card__title--mb8">Стандартные разделы</div>
      <div class="card__hint">Встроенные типы одежды. Загрузите .glb модель, чтобы заменить процедурную геометрию.</div>
    </div>
    ${builtinHtml}
    <div class="card" style="margin-top:24px;">
      <div class="card__title card__title--mb8">Пользовательские разделы</div>
      <div class="card__hint">Собственные вкладки конструктора — требуют загрузки 3D модели.</div>
    </div>
    ${customHtml}
    ${addForm}`;
}

async function uploadModel(type) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.glb,.gltf';
  input.onchange = async function () {
    const file = input.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      await EpDB.models.set(type, buf);
      toast('3D модель загружена: ' + file.name, 'success');
      renderModelsPanel();
    } catch (e) {
      toast('Ошибка загрузки: ' + e.message, 'error');
    }
  };
  input.click();
}

/** Download a model from IDB as a .glb file for deployment into assets/models/ */
async function deployModel(type) {
  try {
    const buf = await EpDB.models.get(type);
    if (!buf) { toast('Модель не найдена в базе', 'error'); return; }
    const blob = new Blob([buf], { type: 'model/gltf-binary' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = type + '.glb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Скачивание началось: ' + type + '.glb', 'success');
  } catch (e) {
    toast('Ошибка скачивания: ' + e.message, 'error');
  }
}

async function removeModel(type) {
  const label = MODEL_TYPES[type] || loadCustomProducts().find(p => p.key === type)?.label || type;
  if (!confirm('Удалить 3D модель для "' + label + '"?')) return;
  await EpDB.models.del(type);
  toast('Модель удалена', 'success');
  renderModelsPanel();
}

function addCustomProduct() {
  const input = document.getElementById('newProductLabel');
  const label = input ? input.value.trim() : '';
  if (!label) { toast('Введите название раздела', 'error'); return; }
  const key      = 'custom_' + Date.now();
  const products = loadCustomProducts();
  products.push({ key, label });
  saveCustomProducts(products);
  toast('Раздел "' + label + '" добавлен. Загрузите .glb модель.', 'success');
  renderModelsPanel();
}

async function removeCustomProduct(key) {
  const products = loadCustomProducts();
  const prod     = products.find(p => p.key === key);
  if (!confirm('Удалить раздел "' + (prod?.label || key) + '" и его 3D модель?')) return;
  saveCustomProducts(products.filter(p => p.key !== key));
  if (typeof EpDB !== 'undefined') await EpDB.models.del(key).catch(() => {});
  toast('Раздел удалён', 'success');
  renderModelsPanel();
}

function hideBuiltinProduct(type) {
  const label = MODEL_TYPES[type] || type;
  if (!confirm('Скрыть раздел "' + label + '" из конструктора? Его можно восстановить в любой момент.')) return;
  const hidden = loadHiddenProducts();
  if (!hidden.includes(type)) hidden.push(type);
  saveHiddenProducts(hidden);
  toast('Раздел "' + label + '" скрыт', 'success');
  renderModelsPanel();
}

function restoreBuiltinProduct(type) {
  saveHiddenProducts(loadHiddenProducts().filter(k => k !== type));
  toast('Раздел "' + (MODEL_TYPES[type] || type) + '" восстановлен', 'success');
  renderModelsPanel();
}

/* ─── Load content ────────────────────────────────────────────────────────── */
async function loadContent() {
  // 1. Try localStorage (saved overrides)
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (_) {}
  }
  // 2. Fallback to JSON file
  try {
    const res = await fetch('../data/site-content.json');
    if (res.ok) return await res.json();
  } catch (_) {}
  return {};
}

/* ─── Populate all [data-key] fields from content ────────────────────────── */
function populateAllFields() {
  document.querySelectorAll('[data-key]').forEach(el => {
    const val = getByPath(_content, el.dataset.key);
    if (val !== undefined) el.value = val;
  });
}

/* ─── Path helpers ────────────────────────────────────────────────────────── */
function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last  = keys.pop();
  const target = keys.reduce((o, k) => { if (!o[k]) o[k] = {}; return o[k]; }, obj);
  target[last] = value;
}

/* ─── UI helpers ──────────────────────────────────────────────────────────── */
function setStatus(msg, type = '') {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'success' ? '#16A34A' : '#6B7280';
  if (type === 'success') setTimeout(() => { el.textContent = ''; }, 4000);
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => { el.className = ''; }, 3000);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/* ─── Photo grid renderers ───────────────────────────────────────────────── */

function renderPhotoGrid(photos, removeFnName) {
  if (!photos || photos.length === 0) {
    return '<div class="upload-placeholder" style="height:48px;font-size:11px;display:flex;align-items:center;justify-content:center;border-radius:8px;">Нет фото</div>';
  }
  return `<div class="photo-thumb-grid">${
    photos.map((src, pi) =>
      `<div class="photo-thumb-item">
        <img src="${src}" alt="Фото ${pi + 1}" />
        <button class="photo-thumb-remove" onclick="${removeFnName}(${pi})" title="Удалить">&#10005;</button>
      </div>`
    ).join('')
  }</div>`;
}

function renderPhotoGridPortfolio(photos, idx) {
  if (!photos || photos.length === 0) {
    return '<div class="upload-placeholder" style="height:48px;font-size:11px;display:flex;align-items:center;justify-content:center;border-radius:8px;">Нет фото</div>';
  }
  return `<div class="photo-thumb-grid">${
    photos.map((src, pi) =>
      `<div class="photo-thumb-item">
        <img src="${src}" alt="Фото ${pi + 1}" />
        <button class="photo-thumb-remove" onclick="removePortfolioPhoto(${idx},${pi})" title="Удалить">&#10005;</button>
      </div>`
    ).join('')
  }</div>`;
}

/* ─── Photo upload helpers ───────────────────────────────────────────────── */

const MAX_SECTION_PHOTOS = 4;

/** Upload photos to a portfolio item (IDB key: 'portfolio:N'). */
async function uploadPortfolioPhotos(idx) {
  if (typeof EpDB === 'undefined') { toast('IndexedDB недоступен', 'error'); return; }
  const existing = await EpDB.photos.get('portfolio:' + idx) || [];
  if (existing.length >= MAX_SECTION_PHOTOS) { toast('Максимум ' + MAX_SECTION_PHOTOS + ' фото', 'error'); return; }
  const dataUrls = await Uploader.uploadMultiple();
  if (!dataUrls.length) return;
  const toAdd = dataUrls.slice(0, MAX_SECTION_PHOTOS - existing.length);
  await EpDB.photos.set('portfolio:' + idx, existing.concat(toAdd));
  renderPortfolio();
  toast('Загружено фото: ' + toAdd.length, 'success');
}

/** Remove one photo from a portfolio item. */
async function removePortfolioPhoto(idx, photoIdx) {
  if (typeof EpDB === 'undefined') return;
  const arr = await EpDB.photos.get('portfolio:' + idx) || [];
  arr.splice(photoIdx, 1);
  if (arr.length) await EpDB.photos.set('portfolio:' + idx, arr);
  else            await EpDB.photos.del('portfolio:' + idx);
  renderPortfolio();
}

/** Upload photos to a service card (IDB key: 'services:N'). */
async function uploadServiceCardPhotos(n) {
  if (typeof EpDB === 'undefined') { toast('IndexedDB недоступен', 'error'); return; }
  const existing = await EpDB.photos.get('services:' + n) || [];
  if (existing.length >= MAX_SECTION_PHOTOS) { toast('Максимум ' + MAX_SECTION_PHOTOS + ' фото', 'error'); return; }
  const dataUrls = await Uploader.uploadMultiple();
  if (!dataUrls.length) return;
  const toAdd = dataUrls.slice(0, MAX_SECTION_PHOTOS - existing.length);
  await EpDB.photos.set('services:' + n, existing.concat(toAdd));
  renderServiceCards();
  toast('Загружено фото: ' + toAdd.length, 'success');
}

/** Remove one photo from a service card. */
async function removeServiceCardPhoto(n, photoIdx) {
  if (typeof EpDB === 'undefined') return;
  const arr = await EpDB.photos.get('services:' + n) || [];
  arr.splice(photoIdx, 1);
  if (arr.length) await EpDB.photos.set('services:' + n, arr);
  else            await EpDB.photos.del('services:' + n);
  renderServiceCards();
}

/* ─── Generic section photo helpers (hero, about, process steps) ─────────── */

/** Render thumbnails from IDB into a container element. */
async function renderSectionPhotos(sectionKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const photos = (typeof EpDB !== 'undefined')
    ? (await EpDB.photos.get(sectionKey) || [])
    : [];
  if (!photos.length) {
    container.innerHTML = '<div style="font-size:11px;color:#888;margin-bottom:8px;">Нет фото</div>';
    return;
  }
  container.innerHTML = '<div class="photo-thumb-grid">' +
    photos.map(function(src, i) {
      return '<div class="photo-thumb-item"><img src="' + src + '" alt="Фото ' + (i+1) + '" />' +
        '<button class="photo-thumb-remove" onclick="removeSectionPhoto(\'' + sectionKey + '\',' + i + ')" title="Удалить">&#10005;</button></div>';
    }).join('') + '</div>';
}

/** Upload up to MAX photos for a named section (hero, about, process.stepN). */
async function uploadSectionPhotos(sectionKey) {
  if (typeof EpDB === 'undefined') { toast('IndexedDB недоступен', 'error'); return; }
  const existing = await EpDB.photos.get(sectionKey) || [];
  if (existing.length >= MAX_SECTION_PHOTOS) {
    toast('Максимум ' + MAX_SECTION_PHOTOS + ' фото', 'error');
    return;
  }
  const dataUrls = await Uploader.uploadMultiple();
  if (!dataUrls.length) return;
  const toAdd = dataUrls.slice(0, MAX_SECTION_PHOTOS - existing.length);
  await EpDB.photos.set(sectionKey, existing.concat(toAdd));

  if (sectionKey === 'hero' || sectionKey === 'about') {
    renderSectionPhotos(sectionKey, sectionKey + 'PhotosContainer');
  } else if (sectionKey.startsWith('process.')) {
    renderProcessSteps();
  }
  toast('Загружено: ' + toAdd.length + ' фото', 'success');
}

/** Remove one photo from a section. */
async function removeSectionPhoto(sectionKey, idx) {
  if (typeof EpDB === 'undefined') return;
  const arr = await EpDB.photos.get(sectionKey) || [];
  arr.splice(idx, 1);
  if (arr.length) await EpDB.photos.set(sectionKey, arr);
  else            await EpDB.photos.del(sectionKey);

  if (sectionKey === 'hero' || sectionKey === 'about') {
    renderSectionPhotos(sectionKey, sectionKey + 'PhotosContainer');
  } else if (sectionKey.startsWith('process.')) {
    renderProcessSteps();
  }
}

/* ─── Legacy single-image helpers (kept for compat, unused in main flow) ─── */
async function uploadSectionImg(key) {
  const dataUrl = await Uploader.upload();
  if (!dataUrl) return;
  setByPath(_content, key, dataUrl);
  const preview = document.querySelector(`[data-img-preview="${key}"]`);
  if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
  const placeholder = document.querySelector(`[data-img-placeholder="${key}"]`);
  if (placeholder) placeholder.style.display = 'none';
  const removeBtn = document.querySelector(`[data-img-remove="${key}"]`);
  if (removeBtn) removeBtn.style.display = '';
  toast('Фото загружено', 'success');
}

function removeSectionImg(key) {
  setByPath(_content, key, '');
  const preview = document.querySelector(`[data-img-preview="${key}"]`);
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const placeholder = document.querySelector(`[data-img-placeholder="${key}"]`);
  if (placeholder) placeholder.style.display = '';
  const removeBtn = document.querySelector(`[data-img-remove="${key}"]`);
  if (removeBtn) removeBtn.style.display = 'none';
}
