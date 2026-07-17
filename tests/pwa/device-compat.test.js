'use strict';

const fs = require('fs');
const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');
const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');

describe('TRIOFSND-143: device compatibility + crash logging is wired into the app shell', () => {
  test('index.html loads deviceCompat.js before the bootstrap script', () => {
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const deviceCompatIndex = indexHtml.indexOf('/scripts/deviceCompat.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(deviceCompatIndex).toBeGreaterThan(-1);
    expect(deviceCompatIndex).toBeLessThan(mainIndex);
  });

  test('the service worker precaches deviceCompat.js for offline play', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    expect(PRECACHE_URLS).toContain('/scripts/deviceCompat.js');
  });
});

describe('TRIOFSND-143: resolveDeviceCompat', () => {
  test('prefers the browser global registered by public/scripts/deviceCompat.js', () => {
    const { resolveDeviceCompat } = require(MAIN_JS_PATH);
    const fromWindow = { collectDeviceInfo: jest.fn() };
    const win = { DinoQuiz: { services: { deviceCompat: fromWindow } } };

    expect(resolveDeviceCompat(win)).toBe(fromWindow);
  });

  test('falls back to the CommonJS module under Node/Jest when no browser global is present', () => {
    const { resolveDeviceCompat } = require(MAIN_JS_PATH);
    const { collectDeviceInfo } = require('../../src/services/deviceCompat');

    const resolved = resolveDeviceCompat({});

    expect(typeof resolved.collectDeviceInfo).toBe('function');
    expect(resolved.collectDeviceInfo).toBe(collectDeviceInfo);
  });
});

describe('TRIOFSND-143: installDeviceCompat', () => {
  function createFakeDeviceCompat() {
    return {
      collectDeviceInfo: jest.fn().mockReturnValue({ os: 'Android' }),
      persistDeviceInfo: jest.fn(),
      installCrashLogger: jest.fn().mockReturnValue(function dispose() {}),
    };
  }

  test('collects and persists the device snapshot once', () => {
    const { installDeviceCompat } = require(MAIN_JS_PATH);
    const deviceCompat = createFakeDeviceCompat();
    const win = { navigator: {}, screen: {}, localStorage: {} };

    installDeviceCompat(win, deviceCompat);

    expect(deviceCompat.collectDeviceInfo).toHaveBeenCalledWith(win.navigator, win.screen, win);
    expect(deviceCompat.persistDeviceInfo).toHaveBeenCalledWith({ os: 'Android' }, win.localStorage);
  });

  test('installs the crash logger against the given window', () => {
    const { installDeviceCompat } = require(MAIN_JS_PATH);
    const deviceCompat = createFakeDeviceCompat();
    const win = { navigator: {}, screen: {}, localStorage: {} };

    installDeviceCompat(win, deviceCompat);

    expect(deviceCompat.installCrashLogger).toHaveBeenCalledWith(
      expect.objectContaining({ window: win, onCrash: expect.any(Function) })
    );
  });

  test('the onCrash callback forwards the event to persistCrashEvent', () => {
    const { installDeviceCompat } = require(MAIN_JS_PATH);
    const deviceCompat = createFakeDeviceCompat();
    deviceCompat.persistCrashEvent = jest.fn();
    const win = { navigator: {}, screen: {}, localStorage: {} };

    installDeviceCompat(win, deviceCompat);
    const { onCrash } = deviceCompat.installCrashLogger.mock.calls[0][0];
    const crashEvent = { type: 'error', message: 'Boom', timestamp: 1 };
    onCrash(crashEvent);

    expect(deviceCompat.persistCrashEvent).toHaveBeenCalledWith(crashEvent, win.localStorage);
  });

});
