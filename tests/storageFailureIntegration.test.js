const { createStorage } = require('../src/storage');
const { createLogger } = require('../src/logger');

describe('TRIOFSND-47: storage_failure emission on storage errors', () => {
  let transport;
  let logger;
  let failingStore;

  beforeEach(() => {
    transport = jest.fn();
    logger = createLogger(transport);
    failingStore = {
      setItem: jest.fn(() => {
        throw new Error('Quota exceeded for user alice@example.com');
      }),
      getItem: jest.fn(() => null),
      removeItem: jest.fn(),
    };
  });

  test('emits storage_failure when saveState throws', () => {
    const storage = createStorage(failingStore, logger, '1.4.2');
    expect(() => storage.saveState({ level: 5 })).toThrow();
    expect(transport).toHaveBeenCalledTimes(1);
    const payload = transport.mock.calls[0][0];
    expect(payload.event).toBe('storage_failure');
    expect(payload.operation).toBe('save_state');
    expect(payload.app_version).toBe('1.4.2');
  });

  test('error_type is derived from error constructor name, not message', () => {
    const storage = createStorage(failingStore, logger, '1.4.2');
    try { storage.saveState({}); } catch (e) { /* expected */ }
    const payload = transport.mock.calls[0][0];
    expect(payload.error_type).toBe('Error');
    expect(payload).not.toHaveProperty('message');
  });

  test('raw error message containing PII is not present in the log', () => {
    const storage = createStorage(failingStore, logger, '1.4.2');
    try { storage.saveState({}); } catch (e) { /* expected */ }
    const payload = transport.mock.calls[0][0];
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('alice@example.com');
    expect(serialized).not.toContain('Quota exceeded');
  });

  test('does not emit storage_failure on successful operations', () => {
    const okStore = {
      setItem: jest.fn(),
      getItem: jest.fn(() => null),
      removeItem: jest.fn(),
    };
    const storage = createStorage(okStore, logger, '1.4.2');
    storage.saveState({ level: 5 });
    expect(transport).not.toHaveBeenCalled();
  });

  test('emits storage_failure for each distinct failing operation', () => {
    const multiFailStore = {
      setItem: jest.fn(() => { throw new TypeError('bad'); }),
      getItem: jest.fn(() => { throw new RangeError('bad'); }),
      removeItem: jest.fn(() => { throw new Error('bad'); }),
    };
    const storage = createStorage(multiFailStore, logger, '1.4.2');
    try { storage.saveState({}); } catch (e) {}
    try { storage.loadState(); } catch (e) {}
    try { storage.clearState(); } catch (e) {}
    expect(transport).toHaveBeenCalledTimes(3);
    const operations = transport.mock.calls.map((c) => c[0].operation);
    expect(operations).toEqual(
      expect.arrayContaining(['save_state', 'load_state', 'clear_state'])
    );
    const errorTypes = transport.mock.calls.map((c) => c[0].error_type);
    expect(errorTypes).toEqual(
      expect.arrayContaining(['TypeError', 'RangeError', 'Error'])
    );
  });

  test('successful best score update does not trigger storage_failure', () => {
    const okStore = {
      setItem: jest.fn(),
      getItem: jest.fn(() => null),
      removeItem: jest.fn(),
    };
    const storage = createStorage(okStore, logger, '1.4.2');
    storage.updateBestScore(150);
    const events = transport.mock.calls.map((c) => c[0].event);
    expect(events).toContain('best_score_updated');
    expect(events).not.toContain('storage_failure');
  });
});
