/**
 * BestScoreManager - manages best score persistence with graceful degradation.
 *
 * Handles the case where localStorage is null or throws (TRIOFSND-48).
 */
class BestScoreManager {
  constructor() {
    this._bestScore = 0;
    this._storageAvailable = this._checkStorageAvailable();
    this._load();
  }

  _checkStorageAvailable() {
    try {
      const storage = typeof window !== 'undefined' && window && window.localStorage;
      if (!storage) return false;
      const testKey = '__bestScoreTest__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  _getStorage() {
    try {
      return typeof window !== 'undefined' && window && window.localStorage;
    } catch (e) {
      return null;
    }
  }

  _load() {
    if (!this._storageAvailable) return;
    try {
      const storage = this._getStorage();
      if (!storage) return;
      const raw = storage.getItem('bestScore');
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        this._bestScore = parsed;
      }
    } catch (e) {
      // ignore - use in-memory default
    }
  }

  getBestScore() {
    return this._bestScore;
  }

  updateBestScore(score) {
    if (typeof score !== 'number' || isNaN(score)) return;
    if (score > this._bestScore) {
      this._bestScore = score;
      this._persist();
    }
  }

  _persist() {
    if (!this._storageAvailable) return;
    try {
      const storage = this._getStorage();
      if (!storage) return;
      storage.setItem('bestScore', String(this._bestScore));
    } catch (e) {
      // ignore - keep in-memory value
    }
  }

  reset() {
    this._bestScore = 0;
    if (!this._storageAvailable) return;
    try {
      const storage = this._getStorage();
      if (!storage) return;
      storage.removeItem('bestScore');
    } catch (e) {
      // ignore
    }
  }
}

module.exports = BestScoreManager;