'use strict';

const {
  LogService,
  createLogEntry,
  generateRequestId,
  detectPlatform,
  createMemoryAdapter,
  LOGS_STORAGE_KEY,
  MAX_LOGS,
  LOG_VERSION,
} = require('./LogService');

describe('LogService', () => {
  let service;
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMemoryAdapter();
    service = new LogService(mockStorage);
  });

  describe('generateRequestId', () => {
    test('returns a non-empty string', () => {
      const id = generateRequestId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('generates unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    test('includes the log_ prefix', () => {
      const id = generateRequestId();
      expect(id.startsWith('log_')).toBe(true);
    });
  });

  describe('createLogEntry', () => {
    test('creates a log entry with required fields', () => {
      const entry = createLogEntry('app_access', { foo: 'bar' });
      expect(entry.version).toBe(LOG_VERSION);
      expect(entry.eventType).toBe('app_access');
      expect(entry.timestamp).toBeTruthy();
      expect(entry.requestId).toBeTruthy();
      expect(entry.platform).toBeTruthy();
      expect(entry.metadata.foo).toBe('bar');
    });

    test('handles undefined metadata', () => {
      const entry = createLogEntry('app_access');
      expect(entry.metadata).toEqual({});
    });

    test('includes userAgent', () => {
      const entry = createLogEntry('app_access');
      expect(entry.userAgent).toBeTruthy();
    });

    test('timestamps are valid ISO strings', () => {
      const entry = createLogEntry('app_access');
      expect(() => new Date(entry.timestamp)).not.toThrow();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });
  });

  describe('detectPlatform', () => {
    test('returns a platform string', () => {
      const platform = detectPlatform();
      expect(typeof platform).toBe('string');
      expect(platform.length).toBeGreaterThan(0);
    });

    test('recognizes iPad', () => {
      const platform = detectPlatform('iPad');
      expect(typeof platform).toBe('string');
    });
  });

  describe('logEvent', () => {
    test('adds a log entry', () => {
      service.logEvent('test_event', { foo: 'bar' });
      const logs = service.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].eventType).toBe('test_event');
    });

    test('persists logs to storage', () => {
      service.logEvent('test_event', { foo: 'bar' });
      const stored = mockStorage.getItem(LOGS_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored);
      expect(parsed.length).toBe(1);
    });

    test('warns when eventType is missing', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      service.logEvent(null, {});
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('warns when eventType is not a string', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      service.logEvent(123, {});
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('logAppAccess', () => {
    test('logs app_access event', () => {
      service.logAppAccess({ locale: 'es' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('app_access');
      expect(logs[0].metadata.locale).toBe('es');
    });
  });

  describe('logServiceWorkerInstall', () => {
    test('logs service_worker_install event', () => {
      service.logServiceWorkerInstall({ scope: '/' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('service_worker_install');
    });
  });

  describe('logServiceWorkerActivate', () => {
    test('logs service_worker_activate event', () => {
      service.logServiceWorkerActivate({ oldVersion: '1.0' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('service_worker_activate');
    });
  });

  describe('logManifestLoad', () => {
    test('logs manifest_load event', () => {
      service.logManifestLoad({ name: 'DinoQuiz' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('manifest_load');
    });
  });

  describe('logPwaInstallAttempt', () => {
    test('logs pwa_install_attempt event', () => {
      service.logPwaInstallAttempt({ source: 'user_gesture' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('pwa_install_attempt');
    });
  });

  describe('logPwaInstallSuccess', () => {
    test('logs pwa_install_success event', () => {
      service.logPwaInstallSuccess({ displayMode: 'standalone' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('pwa_install_success');
    });
  });

  describe('logPwaInstallFailure', () => {
    test('logs pwa_install_failure event', () => {
      service.logPwaInstallFailure({ reason: 'user_cancelled' });
      const logs = service.getLogs();
      expect(logs[0].eventType).toBe('pwa_install_failure');
    });
  });

  describe('getLogs', () => {
    test('returns a copy of logs array', () => {
      service.logEvent('test1', {});
      service.logEvent('test2', {});
      const logs1 = service.getLogs();
      const logs2 = service.getLogs();
      expect(logs1).toEqual(logs2);
      expect(logs1).not.toBe(logs2);
    });

    test('returns empty array when no logs', () => {
      const logs = service.getLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('getLogsByType', () => {
    test('filters logs by event type', () => {
      service.logEvent('app_access', {});
      service.logEvent('app_access', {});
      service.logEvent('pwa_install_success', {});
      const appAccessLogs = service.getLogsByType('app_access');
      expect(appAccessLogs.length).toBe(2);
      expect(appAccessLogs.every((log) => log.eventType === 'app_access')).toBe(true);
    });

    test('returns empty array when no matching logs', () => {
      service.logEvent('app_access', {});
      const logs = service.getLogsByType('nonexistent');
      expect(logs).toEqual([]);
    });
  });

  describe('getLogsByTimeRange', () => {
    test('filters logs by time range with Date objects', () => {
      service.logEvent('test1', {});
      const midpoint = new Date();
      service.logEvent('test2', {});

      const logs = service.getLogsByTimeRange(
        new Date(Date.now() - 1000),
        new Date(Date.now() + 1000)
      );
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    test('filters logs by time range with ISO strings', () => {
      service.logEvent('test1', {});
      service.logEvent('test2', {});

      const logs = service.getLogsByTimeRange(
        new Date(Date.now() - 1000).toISOString(),
        new Date(Date.now() + 1000).toISOString()
      );
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    test('returns empty array when no logs in range', () => {
      service.logEvent('test', {});
      const logs = service.getLogsByTimeRange(
        new Date(Date.now() - 10000),
        new Date(Date.now() - 5000)
      );
      expect(logs).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    test('removes all logs', () => {
      service.logEvent('test1', {});
      service.logEvent('test2', {});
      expect(service.getLogs().length).toBe(2);
      service.clearLogs();
      expect(service.getLogs().length).toBe(0);
    });

    test('clears storage', () => {
      service.logEvent('test', {});
      service.clearLogs();
      const stored = mockStorage.getItem(LOGS_STORAGE_KEY);
      const parsed = JSON.parse(stored);
      expect(parsed).toEqual([]);
    });
  });

  describe('getLogsPayload', () => {
    test('returns payload with required fields', () => {
      service.logEvent('test1', {});
      service.logEvent('test2', {});
      const payload = service.getLogsPayload();
      expect(payload.version).toBe(LOG_VERSION);
      expect(payload.timestamp).toBeTruthy();
      expect(payload.logCount).toBe(2);
      expect(payload.logs.length).toBe(2);
    });

    test('payload is JSON serializable', () => {
      service.logEvent('test', { data: 'value' });
      const payload = service.getLogsPayload();
      const json = JSON.stringify(payload);
      const parsed = JSON.parse(json);
      expect(parsed.logCount).toBe(1);
    });
  });

  describe('persistence and recovery', () => {
    test('recovers logs from storage on instantiation', () => {
      service.logEvent('test1', {});
      service.logEvent('test2', {});

      const newService = new LogService(mockStorage);
      const logs = newService.getLogs();
      expect(logs.length).toBe(2);
    });

    test('handles corrupted storage gracefully', () => {
      mockStorage.setItem(LOGS_STORAGE_KEY, 'invalid json {');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newService = new LogService(mockStorage);
      expect(newService.getLogs()).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('prevents unbounded storage growth', () => {
      for (let i = 0; i < MAX_LOGS + 100; i++) {
        service.logEvent('test', { index: i });
      }

      const logs = service.getLogs();
      expect(logs.length).toBeLessThanOrEqual(MAX_LOGS);
      expect(logs[logs.length - 1].metadata.index).toBe(MAX_LOGS + 99);
    });
  });

  describe('multiple event types flow', () => {
    test('handles realistic event sequence', () => {
      service.logAppAccess({ locale: 'es' });
      service.logManifestLoad({ success: true });
      service.logServiceWorkerInstall({ scope: '/' });
      service.logServiceWorkerActivate({ version: '1.0' });
      service.logPwaInstallAttempt({ source: 'banner' });
      service.logPwaInstallSuccess({ displayMode: 'standalone' });

      const logs = service.getLogs();
      expect(logs.length).toBe(6);

      const appAccessLogs = service.getLogsByType('app_access');
      expect(appAccessLogs.length).toBe(1);

      const pwaInstallLogs = service.getLogsByType('pwa_install_success');
      expect(pwaInstallLogs.length).toBe(1);
    });
  });

  describe('sendLogs', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('rejects when endpointUrl is missing', async () => {
      await expect(service.sendLogs()).rejects.toThrow('sendLogs requires a valid endpointUrl');
    });

    test('rejects when endpointUrl is not a string', async () => {
      await expect(service.sendLogs(123)).rejects.toThrow('sendLogs requires a valid endpointUrl');
    });

    test('rejects when fetch is not available', async () => {
      const fetchBackup = global.fetch;
      delete global.fetch;

      await expect(service.sendLogs('http://example.com/logs')).rejects.toThrow('fetch API not available');

      global.fetch = fetchBackup;
    });

    test('sends logs as JSON POST request', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ success: true }) };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });

      await service.sendLogs('http://example.com/logs');

      expect(global.fetch).toHaveBeenCalledWith('http://example.com/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.version).toBe(LOG_VERSION);
      expect(body.logCount).toBe(1);
      expect(body.logs.length).toBe(1);
    });

    test('clears logs on successful transmission by default', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ success: true }) };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });
      expect(service.getLogs().length).toBe(1);

      await service.sendLogs('http://example.com/logs');

      expect(service.getLogs().length).toBe(0);
    });

    test('does not clear logs when clearOnSuccess is false', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ success: true }) };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });
      expect(service.getLogs().length).toBe(1);

      await service.sendLogs('http://example.com/logs', { clearOnSuccess: false });

      expect(service.getLogs().length).toBe(1);
    });

    test('resolves with response data on success', async () => {
      const responseData = { success: true, id: '123' };
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue(responseData) };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });

      const result = await service.sendLogs('http://example.com/logs');

      expect(result).toEqual(responseData);
    });

    test('handles response without JSON body', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('no json')),
      };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });

      const result = await service.sendLogs('http://example.com/logs');

      expect(result).toEqual({ success: true });
    });

    test('rejects on HTTP error response', async () => {
      const mockResponse = { ok: false, status: 500, statusText: 'Internal Server Error' };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });

      await expect(service.sendLogs('http://example.com/logs')).rejects.toThrow('HTTP 500');
    });

    test('rejects on network error', async () => {
      const networkError = new Error('Network failed');
      global.fetch.mockRejectedValue(networkError);

      service.logAppAccess({ locale: 'es' });

      await expect(service.sendLogs('http://example.com/logs')).rejects.toThrow('Network failed');
    });

    test('logs errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      global.fetch.mockRejectedValue(new Error('Network error'));

      service.logAppAccess({ locale: 'es' });

      try {
        await service.sendLogs('http://example.com/logs');
      } catch (e) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'DinoQuiz: failed to send logs to http://example.com/logs',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('sends correct payload structure', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ success: true }) };
      global.fetch.mockResolvedValue(mockResponse);

      service.logAppAccess({ locale: 'es' });
      service.logPwaInstallSuccess({ displayMode: 'standalone' });

      await service.sendLogs('http://example.com/logs');

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('logCount');
      expect(body).toHaveProperty('logs');
      expect(body.logCount).toBe(2);
      expect(body.logs.length).toBe(2);
    });

    test('sends logs even when list is empty', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ success: true }) };
      global.fetch.mockResolvedValue(mockResponse);

      await service.sendLogs('http://example.com/logs');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.logCount).toBe(0);
      expect(body.logs).toEqual([]);
    });
  });
});
