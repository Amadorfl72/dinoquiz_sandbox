const fs = require('fs');
const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-110: service worker registration', () => {
  test('index.html loads the bootstrap script', () => {
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    expect(indexHtml).toMatch(/<script[^>]+src=["']\/scripts\/main\.js["']/);
  });

  test('index.html loads the Home screen script before the bootstrap script', () => {
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const homeScreenIndex = indexHtml.indexOf('/scripts/homeScreen.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(homeScreenIndex).toBeGreaterThan(-1);
    expect(homeScreenIndex).toBeLessThan(mainIndex);
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

describe('TRIOFSND-64: Home screen rendered by the bootstrap script', () => {
  test('loadHomeStrings fetches the i18n resource and returns the home strings', async () => {
    const { loadHomeStrings } = require(MAIN_JS_PATH);
    const homeStrings = { title: 'DinoQuiz' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings }),
    });

    const result = await loadHomeStrings(fetchFn, '/i18n/es.json');

    expect(fetchFn).toHaveBeenCalledWith('/i18n/es.json');
    expect(result).toBe(homeStrings);
  });

  test('loadHomeStrings resolves to null and logs when the fetch fails', async () => {
    const { loadHomeStrings } = require(MAIN_JS_PATH);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = jest.fn().mockRejectedValue(new Error('offline'));

    const result = await loadHomeStrings(fetchFn);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('renderHome renders into #app using the fetched strings and the persisted mute state', async () => {
    const { renderHome, MUTE_STORAGE_KEY } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const homeStrings = { title: 'DinoQuiz' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings }),
    });
    const storageObj = { getItem: jest.fn().mockReturnValue('true'), setItem: jest.fn() };

    await renderHome(doc, renderHomeScreen, fetchFn, storageObj);

    expect(doc.getElementById).toHaveBeenCalledWith('app');
    expect(storageObj.getItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY);
    expect(renderHomeScreen).toHaveBeenCalledWith(
      { id: 'app' },
      expect.objectContaining({ strings: homeStrings, muted: true, onToggleMute: expect.any(Function) })
    );
  });

  test('renderHome wires onToggleMute so a toggle persists back to storage', async () => {
    const { renderHome, MUTE_STORAGE_KEY } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

    await renderHome(doc, renderHomeScreen, fetchFn, storageObj);

    const { onToggleMute } = renderHomeScreen.mock.calls[0][1];
    onToggleMute(true);

    expect(storageObj.setItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY, 'true');
  });

  test('renderHome resolves to null without a #app container', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue(null) };
    const renderHomeScreen = jest.fn();

    const result = await renderHome(doc, renderHomeScreen, jest.fn());

    expect(result).toBeNull();
    expect(renderHomeScreen).not.toHaveBeenCalled();
  });
});

describe('TRIOFSND-66: mute preference persistence', () => {
  test('loadMutedState returns false when nothing is stored yet', () => {
    const { loadMutedState } = require(MAIN_JS_PATH);
    const storageObj = { getItem: jest.fn().mockReturnValue(null) };

    expect(loadMutedState(storageObj)).toBe(false);
  });

  test('loadMutedState returns the persisted value', () => {
    const { loadMutedState, MUTE_STORAGE_KEY } = require(MAIN_JS_PATH);
    const storageObj = { getItem: jest.fn().mockReturnValue('true') };

    expect(loadMutedState(storageObj)).toBe(true);
    expect(storageObj.getItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY);
  });

  test('loadMutedState degrades to false when the storage backend throws', () => {
    const { loadMutedState } = require(MAIN_JS_PATH);
    const storageObj = {
      getItem: jest.fn(() => {
        throw new Error('private mode');
      }),
    };

    expect(loadMutedState(storageObj)).toBe(false);
  });

  test('persistMutedState writes the namespaced key used by src/services/storage', () => {
    const { persistMutedState, MUTE_STORAGE_KEY } = require(MAIN_JS_PATH);
    const storageObj = { setItem: jest.fn() };

    persistMutedState(true, storageObj);

    expect(storageObj.setItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY, 'true');
  });

  test('persistMutedState logs instead of throwing when the storage backend fails', () => {
    const { persistMutedState } = require(MAIN_JS_PATH);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const storageObj = {
      setItem: jest.fn(() => {
        throw new Error('quota exceeded');
      }),
    };

    expect(() => persistMutedState(true, storageObj)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
