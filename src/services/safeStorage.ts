/**
 * Safe wrapper around localStorage with graceful degradation.
 *
 * In environments where localStorage is unavailable (private browsing,
 * SSR, disabled storage), every operation silently degrades to a
 * no-op / default value instead of throwing.
 */
const BEST_SCORE_KEY = 'dinoquiz:bestScore';

function isStorageAvailable(): boolean {
  try {
    const testKey = '__dq_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export interface SafeStorage {
  getBestScore(): number;
  setBestScore(score: number): void;
}

function createSafeStorage(): SafeStorage {
  const available = isStorageAvailable();

  return {
    getBestScore(): number {
      if (!available) return 0;
      try {
        const raw = window.localStorage.getItem(BEST_SCORE_KEY);
        if (raw === null) return 0;
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      } catch {
        return 0;
      }
    },

    setBestScore(score: number): void {
      if (!available) return;
      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(score));
      } catch {
        // Quota exceeded or other write error — silently ignore.
      }
    },
  };
}

export const safeStorage: SafeStorage = createSafeStorage();
export default safeStorage;
