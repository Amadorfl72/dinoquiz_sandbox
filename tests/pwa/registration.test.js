const fs = require('fs');
const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-110: service worker registration', () => {
  test('index.html loads the bootstrap script', () => {
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    expect(indexHtml).toMatch(/<script[^>]+src=["']\/scripts\/main\.js["']/);
  });

  test('registration is feature-detected and errors are handled', () => {
    const mainJs = fs.readFileSync(MAIN_JS_PATH, 'utf-8');
    expect(mainJs).toMatch(/['"]serviceWorker['"]\s+in\s+nav/);
    expect(mainJs).toMatch(/\.catch/);
    expect(mainJs).toMatch(/console\.error/);
  });

  test('registers against /service-worker.js when supported', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const registration = { scope: '/' };
    const register = jest.fn().mockResolvedValue(registration);
    const nav = { serviceWorker: { register } };

    const result = await registerServiceWorker(nav);

    expect(register).toHaveBeenCalledWith('/service-worker.js');
    expect(result).toBe(registration);
  });

  test('resolves to null without registering when unsupported', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const nav = {};

    const result = await registerServiceWorker(nav);

    expect(result).toBeNull();
  });

  test('resolves to null and logs when registration fails', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const register = jest.fn().mockRejectedValue(new Error('boom'));
    const nav = { serviceWorker: { register } };

    const result = await registerServiceWorker(nav);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
