/**
 * Safe localStorage wrapper.
 * Catches exceptions (e.g., QuotaExceededError, SecurityError for private mode/disabled storage)
 * and degrades gracefully without throwing blocking errors to the UI.
 */

const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__dinoquiz_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const available = isLocalStorageAvailable();

export const safeLocalStorage = {
  /**
   * Reads an item from localStorage.
   * @param key The key of the item to read.
   * @returns The value of the item, or null if not found or if an error occurs.
   */
  getItem(key: string): string | null {
    if (!available) return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to read from localStorage for key: ${key}`, e);
      return null;
    }
  },

  /**
   * Writes an item to localStorage.
   * @param key The key of the item to write.
   * @param value The value of the item to write.
   * @returns True if the item was written successfully, false otherwise.
   */
  setItem(key: string, value: string): boolean {
    if (!available) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to write to localStorage for key: ${key}`, e);
      return false;
    }
  },

  /**
   * Removes an item from localStorage.
   * @param key The key of the item to remove.
   */
  removeItem(key: string): void {
    if (!available) return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to remove from localStorage for key: ${key}`, e);
    }
  },

  /**
   * Clears all items from localStorage.
   */
  clear(): void {
    if (!available) return;
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('[safeLocalStorage] Failed to clear localStorage', e);
    }
  },
};