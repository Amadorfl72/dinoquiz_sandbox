'use strict';

const {
  MAX_CRASH_EVENTS,
  DEVICE_INFO_STORAGE_KEY,
  CRASH_LOG_STORAGE_KEY,
  parseOs,
  classifyDevice,
  collectDeviceInfo,
  createErrorCrashEvent,
  createRejectionCrashEvent,
  installCrashLogger,
  persistDeviceInfo,
  persistCrashEvent,
} = require('./deviceCompat');

const ANDROID_TABLET_UA = 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const ANDROID_PHONE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 Version/16.4 Safari/605.1.15';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 Version/16.4 Mobile Safari/605.1.15';
const MAC_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const WINDOWS_DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

describe('parseOs', () => {
  test('parses Android version', () => {
    expect(parseOs(ANDROID_TABLET_UA)).toEqual({ name: 'Android', version: '13' });
  });

  test('parses iOS version from an iPad UA', () => {
    expect(parseOs(IPAD_UA)).toEqual({ name: 'iOS', version: '16.4' });
  });

  test('parses iOS version from an iPhone UA', () => {
    expect(parseOs(IPHONE_UA)).toEqual({ name: 'iOS', version: '16.4' });
  });

  test('parses macOS version', () => {
    expect(parseOs(MAC_DESKTOP_UA)).toEqual({ name: 'macOS', version: '10.15.7' });
  });

  test('parses Windows version', () => {
    expect(parseOs(WINDOWS_DESKTOP_UA)).toEqual({ name: 'Windows', version: '10.0' });
  });

  test('falls back to unknown for an empty/unrecognized user agent', () => {
    expect(parseOs('')).toEqual({ name: 'unknown', version: '' });
    expect(parseOs(undefined)).toEqual({ name: 'unknown', version: '' });
  });
});

describe('classifyDevice', () => {
  test('classifies an Android tablet (no "Mobile" token) as tablet', () => {
    expect(classifyDevice(ANDROID_TABLET_UA)).toBe('tablet');
  });

  test('classifies an Android phone as mobile', () => {
    expect(classifyDevice(ANDROID_PHONE_UA)).toBe('mobile');
  });

  test('classifies an iPad as tablet', () => {
    expect(classifyDevice(IPAD_UA)).toBe('tablet');
  });

  test('classifies an iPhone as mobile', () => {
    expect(classifyDevice(IPHONE_UA)).toBe('mobile');
  });

  test('classifies a desktop UA as desktop', () => {
    expect(classifyDevice(WINDOWS_DESKTOP_UA)).toBe('desktop');
  });
});

describe('collectDeviceInfo', () => {
  test('builds an aggregated, non-PII snapshot from navigator/screen/window', () => {
    const nav = { userAgent: ANDROID_TABLET_UA, language: 'es-ES' };
    const scr = { width: 1280, height: 800 };
    const win = { devicePixelRatio: 2 };

    expect(collectDeviceInfo(nav, scr, win)).toEqual({
      os: 'Android',
      osVersion: '13',
      deviceClass: 'tablet',
      locale: 'es-ES',
      userAgent: ANDROID_TABLET_UA,
      screenWidth: 1280,
      screenHeight: 800,
      pixelRatio: 2,
    });
  });

  test('falls back to navigator.languages[0] when .language is absent', () => {
    const nav = { userAgent: '', languages: ['fr-FR', 'en'] };
    expect(collectDeviceInfo(nav, {}, {}).locale).toBe('fr-FR');
  });

  test('degrades to safe defaults when navigator/screen/window are empty (no global fallback)', () => {
    expect(collectDeviceInfo({}, {}, {})).toEqual({
      os: 'unknown',
      osVersion: '',
      deviceClass: 'desktop',
      locale: '',
      userAgent: '',
      screenWidth: 0,
      screenHeight: 0,
      pixelRatio: 1,
    });
  });
});

describe('createErrorCrashEvent', () => {
  test('builds an anonymous event from an ErrorEvent-shaped object', () => {
    const event = createErrorCrashEvent(
      { message: 'Boom', filename: '/scripts/main.js', lineno: 42, colno: 7 },
      1700000000000
    );

    expect(event).toEqual({
      type: 'error',
      message: 'Boom',
      source: '/scripts/main.js',
      line: 42,
      column: 7,
      timestamp: 1700000000000,
    });
  });

  test('never carries a full stack trace', () => {
    const event = createErrorCrashEvent({ message: 'Boom', error: new Error('Boom') }, 1);
    expect(event.stack).toBeUndefined();
  });

  test('truncates a very long message', () => {
    const longMessage = 'x'.repeat(500);
    const event = createErrorCrashEvent({ message: longMessage }, 1);
    expect(event.message.length).toBe(200);
  });

  test('defaults gracefully when given no event', () => {
    const event = createErrorCrashEvent(undefined, 1);
    expect(event.message).toBe('Unknown error');
    expect(event.line).toBeNull();
    expect(event.column).toBeNull();
  });
});

describe('createRejectionCrashEvent', () => {
  test('extracts the message from an Error reason', () => {
    const event = createRejectionCrashEvent({ reason: new Error('rejected') }, 1700000000000);
    expect(event).toEqual({
      type: 'unhandledrejection',
      message: 'rejected',
      source: '',
      line: null,
      column: null,
      timestamp: 1700000000000,
    });
  });

  test('handles a plain string reason', () => {
    const event = createRejectionCrashEvent({ reason: 'nope' }, 1);
    expect(event.message).toBe('nope');
  });

  test('handles a non-Error, non-string reason without throwing', () => {
    const event = createRejectionCrashEvent({ reason: { code: 42 } }, 1);
    expect(event.message).toBe(JSON.stringify({ code: 42 }));
  });
});

describe('installCrashLogger', () => {
  function createFakeWindow() {
    const listeners = {};
    return {
      addEventListener(type, handler) {
        listeners[type] = handler;
      },
      removeEventListener(type, handler) {
        if (listeners[type] === handler) {
          delete listeners[type];
        }
      },
      listeners,
    };
  }

  test('forwards a window error event as an anonymous crash event', () => {
    const win = createFakeWindow();
    const onCrash = jest.fn();

    installCrashLogger({ window: win, onCrash });
    win.listeners.error({ message: 'Boom', filename: 'a.js', lineno: 1, colno: 2 });

    expect(onCrash).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Boom' }));
  });

  test('forwards an unhandledrejection event as an anonymous crash event', () => {
    const win = createFakeWindow();
    const onCrash = jest.fn();

    installCrashLogger({ window: win, onCrash });
    win.listeners.unhandledrejection({ reason: 'nope' });

    expect(onCrash).toHaveBeenCalledWith(expect.objectContaining({ type: 'unhandledrejection', message: 'nope' }));
  });

  test('dispose() removes both listeners', () => {
    const win = createFakeWindow();
    const dispose = installCrashLogger({ window: win, onCrash: jest.fn() });

    dispose();

    expect(win.listeners.error).toBeUndefined();
    expect(win.listeners.unhandledrejection).toBeUndefined();
  });

  test('a throwing onCrash callback never escapes the handler', () => {
    const win = createFakeWindow();
    installCrashLogger({
      window: win,
      onCrash: () => {
        throw new Error('logger itself is broken');
      },
    });

    expect(() => win.listeners.error({ message: 'Boom' })).not.toThrow();
  });

  test('returns a no-op dispose when no window is available', () => {
    expect(() => installCrashLogger({ window: null, onCrash: jest.fn() })()).not.toThrow();
  });
});

describe('persistDeviceInfo', () => {
  function createFakeStorage() {
    const store = new Map();
    return {
      getItem: jest.fn((key) => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn((key, value) => store.set(key, value)),
    };
  }

  test('writes the device snapshot under the namespaced key', () => {
    const storage = createFakeStorage();
    const info = { os: 'Android', osVersion: '13' };

    persistDeviceInfo(info, storage);

    expect(storage.setItem).toHaveBeenCalledWith(DEVICE_INFO_STORAGE_KEY, JSON.stringify(info));
  });

  test('degrades silently instead of throwing when the backend fails', () => {
    const storage = { setItem: jest.fn(() => { throw new Error('quota exceeded'); }) };
    expect(() => persistDeviceInfo({ os: 'Android' }, storage)).not.toThrow();
  });
});

describe('persistCrashEvent', () => {
  function createFakeStorage() {
    const store = new Map();
    return {
      getItem: jest.fn((key) => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn((key, value) => store.set(key, value)),
    };
  }

  test('appends the event to an empty log', () => {
    const storage = createFakeStorage();
    const event = { type: 'error', message: 'Boom', timestamp: 1 };

    persistCrashEvent(event, storage);

    expect(JSON.parse(storage.setItem.mock.calls[0][1])).toEqual([event]);
  });

  test('appends to an existing log read from storage', () => {
    const storage = createFakeStorage();
    storage.setItem(CRASH_LOG_STORAGE_KEY, JSON.stringify([{ type: 'error', message: 'first', timestamp: 1 }]));

    persistCrashEvent({ type: 'error', message: 'second', timestamp: 2 }, storage);

    const log = JSON.parse(storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1][1]);
    expect(log).toHaveLength(2);
    expect(log[1].message).toBe('second');
  });

  test('caps the log at MAX_CRASH_EVENTS, dropping the oldest entries', () => {
    const storage = createFakeStorage();
    const existing = Array.from({ length: MAX_CRASH_EVENTS }, (_, i) => ({
      type: 'error',
      message: `event-${i}`,
      timestamp: i,
    }));
    storage.setItem(CRASH_LOG_STORAGE_KEY, JSON.stringify(existing));

    persistCrashEvent({ type: 'error', message: 'newest', timestamp: 999 }, storage);

    const log = JSON.parse(storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1][1]);
    expect(log).toHaveLength(MAX_CRASH_EVENTS);
    expect(log[0].message).toBe('event-1');
    expect(log[log.length - 1].message).toBe('newest');
  });

  test('degrades silently instead of throwing when the backend fails', () => {
    const storage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(() => { throw new Error('quota exceeded'); }),
    };
    expect(() => persistCrashEvent({ type: 'error', message: 'Boom', timestamp: 1 }, storage)).not.toThrow();
  });

  test('recovers instead of throwing when the stored log is corrupted JSON', () => {
    const storage = createFakeStorage();
    storage.setItem(CRASH_LOG_STORAGE_KEY, 'not-json');

    expect(() => persistCrashEvent({ type: 'error', message: 'Boom', timestamp: 1 }, storage)).not.toThrow();
  });
});
