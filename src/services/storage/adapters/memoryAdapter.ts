import type { StorageAdapter } from '../types';

// Last-resort backend: keeps the game playable when both IndexedDB and
// localStorage are unavailable, but nothing survives a reload (degraded mode).
export function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, string>();

  return {
    name: 'memory',
    async isAvailable() {
      return true;
    },
    async getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}
