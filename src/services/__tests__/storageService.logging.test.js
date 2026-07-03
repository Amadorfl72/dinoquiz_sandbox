const storageService = require('../storageService');
const logger = require('../../utils/logger');
const config = require('../../config');

jest.mock('../../utils/logger');
jest.mock('../../config', () => ({
  appVersion: '1.4.2',
}));

describe('TRIOFSND-47: storageService structured logging for storage failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storage_failure event', () => {
    it('logs storage_failure when a save operation fails', async () => {
      const error = new Error('QuotaExceeded');
      error.name = 'QuotaExceededError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
      const logged = logger.logStructured.mock.calls[0][0];

      expect(logged).toEqual({
        event: 'storage_failure',
        operation: 'save',
        error_type: 'QuotaExceededError',
        app_version: '1.4.2',
      });
    });

    it('logs storage_failure when a load operation fails', async () => {
      const error = new Error('DataCorrupted');
      error.name = 'DataCorruptedError';
      jest.spyOn(storageService, '_load').mockRejectedValueOnce(error);

      await expect(storageService.load()).rejects.toThrow();

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
      const logged = logger.logStructured.mock.calls[0][0];

      expect(logged).toEqual({
        event: 'storage_failure',
        operation: 'load',
        error_type: 'DataCorruptedError',
        app_version: '1.4.2',
      });
    });

    it('logs storage_failure when a clear operation fails', async () => {
      const error = new Error('PermissionDenied');
      error.name = 'PermissionDeniedError';
      jest.spyOn(storageService, '_clear').mockRejectedValueOnce(error);

      await expect(storageService.clear()).rejects.toThrow();

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
      const logged = logger.logStructured.mock.calls[0][0];

      expect(logged).toEqual({
        event: 'storage_failure',
        operation: 'clear',
        error_type: 'PermissionDeniedError',
        app_version: '1.4.2',
      });
    });

    it('does not log storage_failure when the save operation succeeds', async () => {
      jest.spyOn(storageService, '_persist').mockResolvedValueOnce(undefined);

      await storageService.save({ score: 1500 });

      expect(logger.logStructured).not.toHaveBeenCalled();
    });

    it('does not log storage_failure when the load operation succeeds', async () => {
      jest.spyOn(storageService, '_load').mockResolvedValueOnce({ score: 1500 });

      await storageService.load();

      expect(logger.logStructured).not.toHaveBeenCalled();
    });

    it('does not log storage_failure when the clear operation succeeds', async () => {
      jest.spyOn(storageService, '_clear').mockResolvedValueOnce(undefined);

      await storageService.clear();

      expect(logger.logStructured).not.toHaveBeenCalled();
    });

    it('does not include any PII fields in the storage_failure log entry', async () => {
      const error = new Error('QuotaExceeded');
      error.name = 'QuotaExceededError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      const logged = logger.logStructured.mock.calls[0][0];
      const piiFields = ['userId', 'user_id', 'username', 'email', 'ip', 'device_id', 'name', 'phone', 'payload', 'data'];

      piiFields.forEach((field) => {
        expect(logged).not.toHaveProperty(field);
      });
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'error_type', 'event', 'operation'].sort()
      );
    });

    it('does not include the error message text (only error_type) to avoid leaking sensitive details', async () => {
      const error = new Error('Sensitive internal detail about user abc@example.com');
      error.name = 'UnknownError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      const logged = logger.logStructured.mock.calls[0][0];
      expect(logged).not.toHaveProperty('error_message');
      expect(logged).not.toHaveProperty('message');
      expect(logged).not.toHaveProperty('stack');
      expect(logged.error_type).toBe('UnknownError');
    });

    it('includes the current app_version from config in the log entry', async () => {
      const error = new Error('fail');
      error.name = 'GenericError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      const logged = logger.logStructured.mock.calls[0][0];
      expect(logged.app_version).toBe(config.appVersion);
    });

    it('uses error_type "Error" when the error has no specific name', async () => {
      const error = new Error('fail');
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      const logged = logger.logStructured.mock.calls[0][0];
      expect(logged.error_type).toBe('Error');
    });

    it('rethrows the original error after logging', async () => {
      const error = new Error('fail');
      error.name = 'SomeError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow('fail');
    });

    it('logs exactly one storage_failure per failed operation', async () => {
      const error = new Error('fail');
      error.name = 'SomeError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      expect(logger.logStructured).toHaveBeenCalledTimes(1);
    });

    it('passes the correct event name in the log entry', async () => {
      const error = new Error('fail');
      error.name = 'SomeError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(error);

      await expect(storageService.save({ score: 1500 })).rejects.toThrow();

      const logged = logger.logStructured.mock.calls[0][0];
      expect(logged.event).toBe('storage_failure');
    });

    it('logs the correct operation name for each failing operation', async () => {
      const saveError = new Error('save fail');
      saveError.name = 'SaveError';
      jest.spyOn(storageService, '_persist').mockRejectedValueOnce(saveError);
      await expect(storageService.save({})).rejects.toThrow();
      expect(logger.logStructured.mock.calls[0][0].operation).toBe('save');

      jest.clearAllMocks();

      const loadError = new Error('load fail');
      loadError.name = 'LoadError';
      jest.spyOn(storageService, '_load').mockRejectedValueOnce(loadError);
      await expect(storageService.load()).rejects.toThrow();
      expect(logger.logStructured.mock.calls[0][0].operation).toBe('load');

      jest.clearAllMocks();

      const clearError = new Error('clear fail');
      clearError.name = 'ClearError';
      jest.spyOn(storageService, '_clear').mockRejectedValueOnce(clearError);
      await expect(storageService.clear()).rejects.toThrow();
      expect(logger.logStructured.mock.calls[0][0].operation).toBe('clear');
    });
  });
});
