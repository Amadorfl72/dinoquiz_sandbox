// Last-resort backend: keeps the game playable when both IndexedDB and
// localStorage are unavailable, but nothing survives a reload (degraded mode).
/** @returns {import('../types').StorageAdapter} */
function createMemoryAdapter() {
  const store = new Map();

  return {
    name: 'memory',
    async isAvailable() {
      return true;
    },
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

module.exports = { createMemoryAdapter };
