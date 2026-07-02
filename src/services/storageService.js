import logger from '../utils/logger';
import config from '../config';

class StorageService {
  constructor() {
    // Initialize storage adapter
  }

  async _persist(key, value) {
    // Implementation for persisting data
  }

  async _load(key) {
    // Implementation for loading data
  }

  async _clear(key) {
    // Implementation for clearing data
  }

  async saveBestScore(score) {
    try {
      await this._persist('bestScore', score);
    } catch (error) {
      logger.error('storage_failure', {
        operation: 'save',
        error_type: error.name || 'Error',
        app_version: config.appVersion
      });
      throw error;
    }
  }

  async loadBestScore() {
    try {
      return await this._load('bestScore');
    } catch (error) {
      logger.error('storage_failure', {
        operation: 'load',
        error_type: error.name || 'Error',
        app_version: config.appVersion
      });
      throw error;
    }
  }

  async clearStorage() {
    try {
      await this._clear('all');
    } catch (error) {
      logger.error('storage_failure', {
        operation: 'clear',
        error_type: error.name || 'Error',
        app_version: config.appVersion
      });
      throw error;
    }
  }
}

export default StorageService;