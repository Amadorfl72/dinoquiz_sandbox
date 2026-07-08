import type { StorageAdapter } from '../types';

const PROBE_KEY = '__dinoquiz_storage_probe__';

function getLocalStorage(): Storage {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('localStorage is not available in this environment');
  }
  return window.localStorage;
}

export function createLocalStorageAdapter(): StorageAdapter {
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
    async getItem(key: string) {
      return getLocalStorage().getItem(key);
    },
    async setItem(key: string, value: string) {
      getLocalStorage().setItem(key, value);
    },
    async removeItem(key: string) {
      getLocalStorage().removeItem(key);
    },
  };
}
