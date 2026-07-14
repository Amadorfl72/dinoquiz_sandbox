const memoryStore = new Map<string, string>();

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function readItem(key: string): string | null {
  const storage = getLocalStorage();
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }
  return memoryStore.get(key) ?? null;
}

export function writeItem(key: string, value: string): void {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      return;
    } catch {
      // Quota exceeded or private-mode restrictions: fall back to memory
      // so the app keeps working offline for the rest of the session.
    }
  }
  memoryStore.set(key, value);
}
