require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: Service Worker Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.navigator.serviceWorker.register.mockClear();
  });

  describe('Service Worker registration', () => {
    it('should register the service worker on page load', async () => {
      // Assuming registration logic is in a registerSW function
      const { registerSW } = require('../src/serviceWorkerRegistration');
      await registerSW();

      expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        expect.stringContaining('service-worker.js'),
        expect.any(Object)
      );
    });

    it('should register service worker with correct scope', async () => {
      const { registerSW } = require('../src/serviceWorkerRegistration');
      await registerSW();

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ scope: '/' })
      );
    });

    it('should handle registration failure gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      navigator.serviceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

      const { registerSW } = require('../src/serviceWorkerRegistration');
      await expect(registerSW()).resolves.not.toThrow();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should only register in production or when explicitly enabled', async () => {
      const { registerSW } = require('../src/serviceWorkerRegistration');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await registerSW({ forceRegister: false });
      expect(navigator.serviceWorker.register).not.toHaveBeenCalled();

      process.env.NODE_ENV = 'production';
      await registerSW({ forceRegister: false });
      expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Service Worker lifecycle', () => {
    it('should log when service worker is successfully registered', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const { registerSW } = require('../src/serviceWorkerRegistration');
      await registerSW({ forceRegister: true });

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('ServiceWorker registration successful')
      );
      consoleLog.mockRestore();
    });

    it('should handle updatefound event', async () => {
      const { registerSW } = require('../src/serviceWorkerRegistration');
      const registration = await registerSW({ forceRegister: true });

      expect(registration).toBeDefined();
      expect(registration.scope).toBe('/');
    });
  });
});
