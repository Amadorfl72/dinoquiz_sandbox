const DB_NAME = 'dinoquiz_analytics';
const DB_VERSION = 1;
const ANALYTICS_STORE = 'analyticsEvents';

let dbPromise = null;

const openRawDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const rawDb = request.result;
      if (!rawDb.objectStoreNames.contains(ANALYTICS_STORE)) {
        rawDb.createObjectStore(ANALYTICS_STORE, { autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const wrapDatabase = (rawDb) => ({
  objectStoreNames: rawDb.objectStoreNames,
  createObjectStore: (name, options) => rawDb.createObjectStore(name, options),
  add: (storeName, value) =>
    new Promise((resolve, reject) => {
      const transaction = rawDb.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
});

export const getDatabase = () => {
  if (!dbPromise) {
    dbPromise = openRawDatabase().then(wrapDatabase);
  }
  return dbPromise;
};
