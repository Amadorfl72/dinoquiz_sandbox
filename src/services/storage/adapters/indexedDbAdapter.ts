import type { StorageAdapter } from '../types';

const DB_NAME = 'dinoquiz-storage';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
// Some embedded/older WebViews hang on indexedDB.open instead of erroring, so we
// bound the wait and treat a timeout as "unavailable" to keep the fallback chain moving.
const OPEN_TIMEOUT_MS = 2000;

export function createIndexedDbAdapter(): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function openDb(): Promise<IDBDatabase> {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
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

      let request: IDBOpenDBRequest;
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

  function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<unknown>,
  ): Promise<T> {
    return openDb().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, mode);
          const store = tx.objectStore(STORE_NAME);

          let request: IDBRequest<unknown>;
          try {
            request = run(store);
          } catch (error) {
            reject(error);
            return;
          }

          request.onsuccess = () => resolve(request.result as T);
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
    async getItem(key: string) {
      const result = await withStore<string | undefined>('readonly', (store) => store.get(key));
      return result ?? null;
    },
    async setItem(key: string, value: string) {
      await withStore<IDBValidKey>('readwrite', (store) => store.put(value, key));
    },
    async removeItem(key: string) {
      await withStore<undefined>('readwrite', (store) => store.delete(key));
    },
  };
}
