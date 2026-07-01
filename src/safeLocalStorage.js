export const safeLocalStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to read from localStorage for key: ${key}`, e);
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to write to localStorage for key: ${key}`, e);
      return false;
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to remove from localStorage for key: ${key}`, e);
    }
  },
  clear() {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('[safeLocalStorage] Failed to clear localStorage', e);
    }
  }
};