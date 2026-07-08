const PROBE_KEY = '__dinoquiz_storage_probe__';

/** @returns {Storage} */
function getLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('localStorage is not available in this environment');
  }
  return window.localStorage;
}

/** @returns {import('../types').StorageAdapter} */
function createLocalStorageAdapter() {
  return {
    name: 'localStorage',
    async isAvailable() {
      try {
        const storage = getLocalStorage();
        // Safari private mode exposes localStorage but throws on write (quota = 0),
        // so availability can only be confirmed with a real write/remove probe.
        storage.setItem(PROBE_KEY, '1');
        storage.removeItem(PROBE_KEY);
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      return getLocalStorage().getItem(key);
    },
    async setItem(key, value) {
      getLocalStorage().setItem(key, value);
    },
    async removeItem(key) {
      getLocalStorage().removeItem(key);
    },
  };
}

module.exports = { createLocalStorageAdapter };
