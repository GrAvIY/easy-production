/**
 * EASY PRODUCTION — IndexedDB wrapper (EpDB)
 *
 * Stores:
 *   photos  — key: sectionKey string (e.g. 'hero', 'services:1', 'portfolio:0')
 *             value: string[] (base64 data-URLs)
 *   models  — key: clothing type string (e.g. 'tshirt', 'hoodie')
 *             value: ArrayBuffer (.glb binary)
 *
 * Usage:
 *   await EpDB.photos.get('hero')          → string[] | undefined
 *   await EpDB.photos.set('hero', [...])   → void
 *   await EpDB.photos.del('hero')          → void
 *   await EpDB.photos.keys()              → string[]
 *   (same API for EpDB.models)
 */

(function () {
  'use strict';

  var DB_NAME = 'ep_media';
  var DB_VER  = 1;
  var _db     = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);

      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
        if (!db.objectStoreNames.contains('models')) db.createObjectStore('models');
      };

      req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function run(storeName, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction(storeName, mode);
        var store = tx.objectStore(storeName);
        var req   = fn(store);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function storeAPI(storeName) {
    return {
      get:  function (key)        { return run(storeName, 'readonly',  function (s) { return s.get(key); }); },
      set:  function (key, value) { return run(storeName, 'readwrite', function (s) { return s.put(value, key); }); },
      del:  function (key)        { return run(storeName, 'readwrite', function (s) { return s.delete(key); }); },
      keys: function ()           { return run(storeName, 'readonly',  function (s) { return s.getAllKeys(); }); },
    };
  }

  window.EpDB = {
    photos: storeAPI('photos'),
    models: storeAPI('models'),
  };

})();
