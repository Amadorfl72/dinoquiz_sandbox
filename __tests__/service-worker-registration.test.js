/**
 * TRIOFSND-6: Service Worker Registration Tests
 * Verifies that the service worker is registered correctly on first load.
 */

describe('Service Worker Registration (TRIOFSND-6)', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue({
          scope: '/',
          update: jest.fn(),
          unregister: jest.fn().mockResolvedValue(true),
        }),
        getRegistration: jest.fn().mockResolvedValue(null),
        getRegistrations: jest.fn().mockResolvedValue([]),
        ready: Promise.resolve({}),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        controller: null,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  test('should register service worker with correct script path and scope', async () => {
    const { registerServiceWorker } = require('../src/sw/register');
    await registerServiceWorker();

    expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      '/sw.js',
      { scope: '/' }
    );
  });

  test('should log success message when registration succeeds', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const { registerServiceWorker } = require('../src/sw/register');
    await registerServiceWorker();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Service Worker registered')
    );
    consoleLogSpy.mockRestore();
  });

  test('should log error message when registration fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    navigator.serviceWorker.register = jest
      .fn()
      .mockRejectedValue(new Error('Registration failed'));

    const { registerServiceWorker } = require('../src/sw/register');
    await registerServiceWorker();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Service Worker registration failed'),
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  test('should not register if serviceWorker is not supported', async () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { registerServiceWorker } = require('../src/sw/register');
    await registerServiceWorker();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not supported')
    );
    consoleWarnSpy.mockRestore();
  });

  test('should only register in secure context (https or localhost)', async () => {
    const originalLocation = global.location;
    delete global.location;
    global.location = { protocol: 'http:', hostname: 'example.com' };

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { registerServiceWorker } = require('../src/sw/register');
    await registerServiceWorker();

    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('secure context')
    );

    global.location = originalLocation;
    consoleWarnSpy.mockRestore();
  });
});
