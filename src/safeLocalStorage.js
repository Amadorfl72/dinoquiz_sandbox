export const safeLocalStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // Degrade gracefully
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      // Degrade gracefully
    }
  },
  clear() {
    try {
      window.localStorage.clear();
    } catch (e) {
      // Degrade gracefully
    }
  }
};
