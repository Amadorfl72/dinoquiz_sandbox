import StorageService from '../storageService';
import logger from '../../utils/logger';
import config from '../../config';

describe('storageService logging', () => {
  let storageService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new StorageService();
    logger.error = jest.fn();
    
    // Mock private methods
    storageService._persist = jest.fn();
    storageService._load = jest.fn();
    storageService._clear = jest.fn();
  });

  it('logs storage_failure when a save operation fails', async () => {
    const testError = new Error('Save failed');
    storageService._persist.mockRejectedValue(testError);
    
    await expect(storageService.saveBestScore(5)).rejects.toThrow(testError);
    
    expect(logger.error).toHaveBeenCalledWith('storage_failure', {
      operation: 'save',
      error_type: 'Error',
      app_version: config.appVersion
    });
  });

  it('logs storage_failure when a load operation fails', async () => {
    const testError = new Error('Load failed');
    storageService._load.mockRejectedValue(testError);
    
    await expect(storageService.loadBestScore()).rejects.toThrow(testError);
    
    expect(logger.error).toHaveBeenCalledWith('storage_failure', {
      operation: 'load',
      error_type: 'Error',
      app_version: config.appVersion
    });
  });

  it('logs storage_failure when a clear operation fails', async () => {
    const testError = new Error('Clear failed');
    storageService._clear.mockRejectedValue(testError);
    
    await expect(storageService.clearStorage()).rejects.toThrow(testError);
    
    expect(logger.error).toHaveBeenCalledWith('storage_failure', {
      operation: 'clear',
      error_type: 'Error',
      app_version: config.appVersion
    });
  });

  it('does not log storage_failure when the operation succeeds', async () => {
    storageService._persist.mockResolvedValue();
    
    await storageService.saveBestScore(5);
    
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not include any PII fields in the storage_failure log entry', async () => {
    const testError = new Error('Save failed');
    storageService._persist.mockRejectedValue(testError);
    
    await expect(storageService.saveBestScore(5)).rejects.toThrow(testError);
    
    const logEntry = logger.error.mock.calls[0][1];
    expect(logEntry).not.toHaveProperty('user_id');
    expect(logEntry).not.toHaveProperty('device_id');
    expect(logEntry).not.toHaveProperty('username');
  });

  it('does not include the error message text (only error_type) to avoid leaking sensitive details', async () => {
    const testError = new Error('Save failed with sensitive data');
    storageService._persist.mockRejectedValue(testError);
    
    await expect(storageService.saveBestScore(5)).rejects.toThrow(testError);
    
    const logEntry = logger.error.mock.calls[0][1];
    expect(logEntry).not.toHaveProperty('error_message');
    expect(logEntry.error_type).toBe('Error');
  });

  it('includes the current app_version from config in the log entry', async () => {
    const testError = new Error('Save failed');
    storageService._persist.mockRejectedValue(testError);
    
    await expect(storageService.saveBestScore(5)).rejects.toThrow(testError);
    
    expect(logger.error).toHaveBeenCalledWith(
      'storage_failure',
      expect.objectContaining({
        app_version: config.appVersion
      })
    );
  });

  it('uses error_type "Error" when the error has no specific name', async () => {
    const testError = { message: 'Save failed' };
    storageService._persist.mockRejectedValue(testError);
    
    await expect(storageService.saveBestScore(5)).rejects.toThrow(testError);
    
    expect(logger.error).toHaveBeenCalledWith(
      'storage_failure',
      expect.objectContaining({
        error_type: 'Error'
      })
    );
  });

  it('rethrows the original error after logging', async () => {
    const testError = new Error('Save failed');
    storageService._persist.mockRejectedValue(testError);
    
    await expect(storageService.saveBestScore(5)).rejects.toThrow(testError);
  });
});