const DB_NAME = 'dinoquiz-storage';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
// Some embedded/older WebViews hang on indexedDB.open instead of erroring, so we
// bound the wait and treat a timeout as "unavailable" to keep the fallback chain moving.
const OPEN_TIMEOUT_MS = 2000;

/** @returns {import('../types').StorageAdapter} */
function createIndexedDbAdapter() {
  let dbPromise = null;

  function openDb() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB is not available in this environment'));
        return;
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('indexedDB open timed out'));
      }, OPEN_TIMEOUT_MS);

      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
        return;
      }

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(request.result);
      };

      request.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(request.error ?? new Error('indexedDB open failed'));
      };

      request.onblocked = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('indexedDB open blocked by another tab'));
      };
    });

    dbPromise.catch(() => {
      // Do not cache a rejected open attempt: a later isAvailable() retry
      // (e.g. after the user exits private browsing) should try again.
      dbPromise = null;
    });

    return dbPromise;
  }

  function withStore(mode, run) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, mode);
          const store = tx.objectStore(STORE_NAME);

          let request;
          try {
            request = run(store);
          } catch (error) {
            reject(error);
            return;
          }

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'));
        }),
    );
  }

  return {
    name: 'indexedDB',
    async isAvailable() {
      try {
        await openDb();
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      const result = await withStore('readonly', (store) => store.get(key));
      return result ?? null;
    },
    async setItem(key, value) {
      await withStore('readwrite', (store) => store.put(value, key));
    },
    async removeItem(key) {
      await withStore('readwrite', (store) => store.delete(key));
    },
  };
}

module.exports = { createIndexedDbAdapter };
