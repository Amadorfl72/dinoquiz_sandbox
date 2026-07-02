import { getAppVersion } from '../config';

/**
 * Logs a structured storage_failure event without leaking sensitive details.
 * @param {string} operation - The operation that failed (save, load, clear).
 * @param {Error} error - The error that was thrown.
 */
const logStorageFailure = (operation, error) => {
  console.log('storage_failure', {
    event: 'storage_failure',
    operation,
    error_type: error.name || 'Error',
    app_version: getAppVersion(),
  });
};

export const storageService = {
  async _persist(key, value) {
    throw new Error('Not implemented');
  },

  async _load(key) {
    throw new Error('Not implemented');
  },

  async _clear(key) {
    throw new Error('Not implemented');
  },

  async save(key, value) {
    try {
      return await this._persist(key, value);
    } catch (error) {
      logStorageFailure('save', error);
      throw error;
    }
  },

  async load(key) {
    try {
      return await this._load(key);
    } catch (error) {
      logStorageFailure('load', error);
      throw error;
    }
  },

  async clear(key) {
    try {
      return await this._clear(key);
    } catch (error) {
      logStorageFailure('clear', error);
      throw error;
    }
  },
};
