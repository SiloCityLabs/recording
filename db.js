(() => {
  "use strict";

  const DB_NAME = "recorder.db.v1";
  const DB_VERSION = 1;
  const STORE = "recordings";

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("favorite", "favorite", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(STORE, mode);
          const store = t.objectStore(STORE);
          let result;
          try {
            result = fn(store);
          } catch (err) {
            reject(err);
            return;
          }
          t.oncomplete = () => resolve(result);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error || new Error("aborted"));
        })
    );
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  const RecDB = {
    async list() {
      const rows = await tx("readonly", (store) => reqToPromise(store.getAll()));
      return (rows || []).sort((a, b) => b.createdAt - a.createdAt);
    },

    async get(id) {
      return tx("readonly", (store) => reqToPromise(store.get(id)));
    },

    async put(rec) {
      await tx("readwrite", (store) => {
        store.put(rec);
      });
      return rec;
    },

    async remove(id) {
      await tx("readwrite", (store) => {
        store.delete(id);
      });
    },

    async storageEstimate() {
      if (!navigator.storage || !navigator.storage.estimate) {
        return { usage: 0, quota: 0 };
      }
      return navigator.storage.estimate();
    },
  };

  window.RecDB = RecDB;
})();
