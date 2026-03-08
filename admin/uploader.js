/**
 * Easy Production — Image Uploader
 * Converts uploaded images to base64 data-URLs for localStorage storage.
 * Max size: 2 MB per image (localStorage limit consideration).
 */
const Uploader = {
  MAX_SIZE: 2 * 1024 * 1024, // 2 MB

  /**
   * Open a file picker and return a base64 data-URL via Promise.
   * @param {string} accept - MIME types, e.g. "image/*"
   */
  pick(accept = 'image/*') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return reject(new Error('No file selected'));
        if (file.size > this.MAX_SIZE) {
          return reject(new Error(`Файл слишком большой. Максимум ${this.MAX_SIZE / 1024 / 1024} МБ.`));
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },

  /**
   * Resize image to fit within maxW×maxH and return a compressed JPEG data-URL.
   * Defaults tuned for localStorage budget: 800×600 @0.68 ≈ 50–80 KB per image.
   */
  resize(dataUrl, maxW = 800, maxH = 600, quality = 0.68) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width  *= ratio;
        height *= ratio;
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(width);
        canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  },

  /**
   * Full pipeline: pick → resize → return data-URL.
   */
  async upload() {
    try {
      const raw = await this.pick();
      const resized = await this.resize(raw);
      return resized;
    } catch (err) {
      toast(err.message, 'error');
      return null;
    }
  },

  /**
   * Open a file picker with multiple selection.
   * Returns a Promise that resolves with an array of raw data-URLs (before resize).
   */
  pickMultiple(accept = 'image/*') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files);
        if (files.length === 0) return reject(new Error('Файлы не выбраны'));
        const results = [];
        for (const file of files) {
          if (file.size > this.MAX_SIZE) {
            toast(`${file.name}: слишком большой (макс ${this.MAX_SIZE / 1024 / 1024} МБ)`, 'error');
            continue;
          }
          const dataUrl = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = () => rej(reader.error);
            reader.readAsDataURL(file);
          });
          results.push(dataUrl);
        }
        resolve(results);
      };
      input.click();
    });
  },

  /**
   * Full pipeline: pick multiple → resize each → return array of data-URLs.
   */
  async uploadMultiple() {
    try {
      const rawList = await this.pickMultiple();
      if (!rawList.length) return [];
      const resized = await Promise.all(rawList.map(raw => this.resize(raw)));
      return resized;
    } catch (err) {
      toast(err.message, 'error');
      return [];
    }
  },
};

// Make toast available if editor.js loaded first
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => { el.className = ''; }, 3000);
}

/**
 * GLB Model Uploader — picks a .glb file, stores in IndexedDB via EpDB.models,
 * and returns the ArrayBuffer.
 *
 * NOTE: Browser JS cannot write to the server filesystem.
 * Models are stored in IndexedDB (shared between admin.html and index.html
 * on the same origin). To deploy a model as a static file, download it and
 * place it in assets/models/[type].glb manually.
 *
 * Usage in editor.js:
 *   const buf = await Uploader.pickGlb('tshirt');
 *   if (buf) toast('Модель загружена');
 */
Uploader.pickGlb = async function pickGlb(type) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.glb,.gltf';

    input.onchange = async function () {
      const file = input.files[0];
      if (!file) { resolve(null); return; }

      try {
        const buf = await file.arrayBuffer();

        if (typeof EpDB !== 'undefined') {
          await EpDB.models.set(type, buf);
        }

        resolve(buf);
      } catch (err) {
        toast('Ошибка загрузки модели: ' + err.message, 'error');
        resolve(null);
      }
    };

    input.click();
  });
};
