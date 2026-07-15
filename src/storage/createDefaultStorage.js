const memoryFallback = new Map();

export function createDefaultStorage(target = typeof window !== 'undefined' ? window.localStorage : undefined) {
  if (!target) {
    return {
      getItem: (key) => (memoryFallback.has(key) ? memoryFallback.get(key) : null),
      setItem: (key, value) => {
        memoryFallback.set(key, value);
      },
      removeItem: (key) => {
        memoryFallback.delete(key);
      },
    };
  }

  return {
    getItem: (key) => target.getItem(key),
    setItem: (key, value) => target.setItem(key, value),
    removeItem: (key) => target.removeItem(key),
  };
}
