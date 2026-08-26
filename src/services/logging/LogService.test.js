'use strict';

const logging = require('./LogService.js');
const LogService = logging.LogService || logging;

function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
}

describe('LogService — structured access & PWA install logging', () => {
  let service;
  let storage;

  beforeEach(() => {
    storage = makeStorage();
    service = new LogService(storage);
  });

  describe('entry shape', () => {
    it('stores an app_access entry with every required structured field', () => {
      service.logAppAccess({ screen: 'home' });
      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      const entry = logs[0];
      expect(entry.version).toBe('1.0');
      expect(entry.eventType).toBe('app_access');
      expect(typeof entry.timestamp).toBe('string');
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
      expect(typeof entry.requestId).toBe('string');
      expect(entry.requestId).toMatch(/^log_/);
      expect(typeof entry.userAgent).toBe('string');
      expect(typeof entry.platform).toBe('string');
      expect(entry.metadata).toEqual({ screen: 'home' });
    });

    it('records the three PWA install lifecycle phases under distinct eventTypes', () => {
      service.logPwaInstallAttempt({ trigger: 'beforeinstallprompt' });
      service.logPwaInstallSuccess({});
      service.logPwaInstallFailure({ reason: 'dismissed' });
      expect(service.getLogs().map((e) => e.eventType)).toEqual([
        'pwa_install_attempt',
        'pwa_install_success',
        'pwa_install_failure',
      ]);
    });

    it('ignores an invalid eventType without throwing or persisting anything', () => {
      expect(() => service.logEvent('', {})).not.toThrow();
      expect(() => service.logEvent(null, {})).not.toThrow();
      expect(() => service.logEvent(42, {})).not.toThrow();
      expect(service.getLogs()).toHaveLength(0);
    });

    it('defaults metadata to an empty object when omitted', () => {
      service.logAppAccess();
      expect(service.getLogs()[0].metadata).toEqual({});
    });
  });

  describe('querying', () => {
    it('getLogs returns a defensive copy', () => {
      service.logAppAccess({});
      const snapshot = service.getLogs();
      snapshot.push('tampered');
      expect(service.getLogs()).toHaveLength(1);
    });

    it('getLogsByType filters by eventType', () => {
      service.logAppAccess({});
      service.logPwaInstallAttempt({});
      service.logAppAccess({});
      expect(service.getLogsByType('app_access')).toHaveLength(2);
      expect(service.getLogsByType('pwa_install_attempt')).toHaveLength(1);
      expect(service.getLogsByType('nope')).toHaveLength(0);
    });

    it('getLogsByTimeRange accepts string dates and is inclusive on both ends', () => {
      service.logAppAccess({});
      const all = service.getLogsByTimeRange(
        new Date(0).toISOString(),
        new Date(Date.now() + 60000).toISOString(),
      );
      expect(all).toHaveLength(1);
      const future = service.getLogsByTimeRange(
        new Date(Date.now() + 60000),
        new Date(Date.now() + 120000),
      );
      expect(future).toHaveLength(0);
    });
  });

  describe('persistence & limits', () => {
    it('round-trips logs through storage into a fresh instance', () => {
      service.logAppAccess({ n: 1 });
      service.logPwaInstallAttempt({ n: 2 });
      const reloaded = new LogService(storage);
      expect(reloaded.getLogs()).toHaveLength(2);
      expect(reloaded.getLogs()[0].metadata).toEqual({ n: 1 });
      expect(reloaded.getLogs()[1].metadata).toEqual({ n: 2 });
    });

    it('truncates to the last MAX_LOGS (1000) entries, dropping the oldest', () => {
      for (let i = 0; i < 1001; i += 1) {
        service.logEvent('app_access', { i });
      }
      const logs = service.getLogs();
      expect(logs).toHaveLength(1000);
      expect(logs[0].metadata).toEqual({ i: 1 });
      expect(logs[logs.length - 1].metadata).toEqual({ i: 1000 });
    });

    it('clearLogs wipes both memory and persisted state', () => {
      service.logAppAccess({});
      service.clearLogs();
      expect(service.getLogs()).toHaveLength(0);
      expect(storage.getItem('dinoquiz:logs')).toBe('[]');
    });
  });

  describe('getLogsPayload', () => {
    it('builds a transmission payload with version, count and the logs', () => {
      service.logAppAccess({});
      service.logPwaInstallAttempt({});
      const payload = service.getLogsPayload();
      expect(payload.version).toBe('1.0');
      expect(payload.logCount).toBe(2);
      expect(Array.isArray(payload.logs)).toBe(true);
      expect(payload.logs).toHaveLength(2);
      expect(typeof payload.timestamp).toBe('string');
    });
  });

  describe('sendLogs endpoint', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('POSTs the JSON payload and clears logs on a 2xx response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      service.logAppAccess({ a: 1 });
      service.logPwaInstallAttempt({ b: 2 });

      await service.sendLogs('https://log.example/ingest', { timeout: 50 });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, config] = global.fetch.mock.calls[0];
      expect(url).toBe('https://log.example/ingest');
      expect(config.method).toBe('POST');
      expect(config.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(config.body);
      expect(body.version).toBe('1.0');
      expect(body.logCount).toBe(2);
      expect(body.logs).toHaveLength(2);
      expect(service.getLogs()).toHaveLength(0);
    });

    it('keeps logs when clearOnSuccess is false', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      service.logAppAccess({});
      await service.sendLogs('https://log.example/ingest', { clearOnSuccess: false, timeout: 50 });
      expect(service.getLogs()).toHaveLength(1);
    });

    it('keeps logs on an HTTP error response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      service.logAppAccess({});
      try {
        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
      } catch (e) {
        // rejection is allowed; the invariant is that logs survive
      }
      expect(service.getLogs()).toHaveLength(1);
    });

    it('keeps logs on a network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      service.logAppAccess({});
      try {
        await service.sendLogs('https://log.example/ingest', { timeout: 50 });
      } catch (e) {
        // expected
      }
      expect(service.getLogs()).toHaveLength(1);
    });
  });
});
