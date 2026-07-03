import { logStorageFailure } from '../analytics/logger';

/**
 * StorageService wraps low-level storage operations and adds structured
 * logging for failures via the storage_failure event.
 *
 * The low-level operations (_persist, _load, _clear) are defined as instance
 * methods so they can be spied on/overridden in tests. Public methods (save,
 * load, clear) delegate to them, log a structured storage_failure entry on
 * error (containing only operation_type and error_type, never the error
 * message or any PII), and rethrow the original error.
 */
class StorageService {
  // Low-level persistence primitive. Overridden by a real storage backend
  // (localStorage / IndexedDB) in production; spied on in tests.
  _persist(key, value) {
    // Default no-op implementation.
    return undefined;
  }

  _load(key) {
    return undefined;
  }

  _clear(key) {
    return undefined;
  }

  async save(key, value) {
    try {
      return await this._persist(key, value);
    } catch (error) {
      logStorageFailure('save', error && error.name ? error.name : 'Error');
      throw error;
    }
  }

  async load(key) {
    try {
      return await this._load(key);
    } catch (error) {
      logStorageFailure('load', error && error.name ? error.name : 'Error');
      throw error;
    }
  }

  async clear(key) {
    try {
      return await this._clear(key);
    } catch (error) {
      logStorageFailure('clear', error && error.name ? error.name : 'Error');
      throw error;
    }
  }
}

const storageService = new StorageService();

export { StorageService };
export default storageService;
