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

  test('renderHome renders into #app using the fetched strings', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const homeStrings = { title: 'DinoQuiz' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings }),
    });

    await renderHome(doc, renderHomeScreen, fetchFn);

    expect(doc.getElementById).toHaveBeenCalledWith('app');
    expect(renderHomeScreen).toHaveBeenCalledWith({ id: 'app' }, { strings: homeStrings });
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

describe('TRIOFSND-65: first-run tooltip wired into the bootstrap script', () => {
  function createFakeStorage(overrides = {}) {
    return {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(false),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      ...overrides,
    };
  }

  test('loadDinoQuizStorage returns null when require is unavailable (unbundled browser)', () => {
    const { loadDinoQuizStorage } = require(MAIN_JS_PATH);

    // Passing a truthy, non-function value stands in for the real browser
    // case where the global `require` simply doesn't exist — `undefined`
    // can't be used here because it would fall back to Jest's own `require`.
    expect(loadDinoQuizStorage({})).toBeNull();
  });

  test('loadDinoQuizStorage returns null when the require call throws', () => {
    const { loadDinoQuizStorage } = require(MAIN_JS_PATH);
    const requireFn = jest.fn(() => {
      throw new Error('module not found');
    });

    expect(loadDinoQuizStorage(requireFn)).toBeNull();
  });

  test('loadDinoQuizStorage resolves the shared dinoQuizStorage instance via the injected require', () => {
    const { loadDinoQuizStorage } = require(MAIN_JS_PATH);
    const fakeInstance = { hasSeenHomeTooltip: jest.fn() };
    const requireFn = jest.fn().mockReturnValue({ dinoQuizStorage: fakeInstance });

    expect(loadDinoQuizStorage(requireFn)).toBe(fakeInstance);
  });

  test('renderHome without a storage argument keeps its previous, tooltip-less behaviour', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const homeStrings = { title: 'DinoQuiz' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings }),
    });

    await renderHome(doc, renderHomeScreen, fetchFn);

    expect(renderHomeScreen).toHaveBeenCalledWith({ id: 'app' }, { strings: homeStrings });
  });

  test('renderHome shows the tooltip when the storage flag says it has not been seen yet', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storage = createFakeStorage({ hasSeenHomeTooltip: jest.fn().mockResolvedValue(false) });

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    expect(storage.hasSeenHomeTooltip).toHaveBeenCalled();
    const options = renderHomeScreen.mock.calls[0][1];
    expect(options.showTooltip).toBe(true);
    expect(typeof options.onTooltipDismiss).toBe('function');
    expect(typeof options.onPlayButtonClick).toBe('function');
  });

  test('renderHome hides the tooltip when the storage flag says it was already seen', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storage = createFakeStorage({ hasSeenHomeTooltip: jest.fn().mockResolvedValue(true) });

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    const options = renderHomeScreen.mock.calls[0][1];
    expect(options.showTooltip).toBe(false);
  });

  test('the tooltip dismiss callback persists the "seen" flag through storage', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storage = createFakeStorage();

    await renderHome(doc, renderHomeScreen, fetchFn, storage);
    const options = renderHomeScreen.mock.calls[0][1];
    options.onTooltipDismiss();

    expect(storage.markHomeTooltipSeen).toHaveBeenCalledTimes(1);
  });

  test('the play button click callback records the first_tap_jugar local counter', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storage = createFakeStorage();

    await renderHome(doc, renderHomeScreen, fetchFn, storage);
    const options = renderHomeScreen.mock.calls[0][1];
    options.onPlayButtonClick();

    expect(storage.recordEventOnce).toHaveBeenCalledWith('first_tap_jugar');
  });
});

describe('TRIOFSND-65: createBrowserHomeStorage — native fallback for a real, unbundled browser', () => {
  function createFakeWindow() {
    const store = new Map();
    return {
      localStorage: {
        getItem: jest.fn((key) => (store.has(key) ? store.get(key) : null)),
        setItem: jest.fn((key, value) => store.set(key, value)),
        removeItem: jest.fn((key) => store.delete(key)),
      },
    };
  }

  test('hasSeenHomeTooltip resolves false before anything has been persisted', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const storage = createBrowserHomeStorage(createFakeWindow());

    expect(await storage.hasSeenHomeTooltip()).toBe(false);
  });

  test('markHomeTooltipSeen persists the flag to localStorage so a later read resolves true', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.markHomeTooltipSeen();

    expect(win.localStorage.setItem).toHaveBeenCalledWith('dinoquiz:homeTooltipSeen', 'true');
    expect(await storage.hasSeenHomeTooltip()).toBe(true);
  });

  test('the persisted "seen" flag survives across separate storage instances (same device, later launch)', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();

    await createBrowserHomeStorage(win).markHomeTooltipSeen();

    expect(await createBrowserHomeStorage(win).hasSeenHomeTooltip()).toBe(true);
  });

  test('recordEventOnce is a non-PII local counter that only increments the first time', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.recordEventOnce('first_tap_jugar');
    await storage.recordEventOnce('first_tap_jugar');
    await storage.recordEventOnce('first_tap_jugar');

    expect(win.localStorage.setItem).toHaveBeenCalledWith(
      'dinoquiz:analyticsEventCounts',
      JSON.stringify({ first_tap_jugar: 1 })
    );
  });

  test('degrades to an in-memory store instead of throwing when localStorage is unavailable (e.g. Safari private mode)', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = {
      localStorage: {
        getItem: jest.fn(() => {
          throw new Error('SecurityError');
        }),
        setItem: jest.fn(() => {
          throw new Error('QuotaExceededError');
        }),
      },
    };
    const storage = createBrowserHomeStorage(win);

    await storage.markHomeTooltipSeen();

    expect(await storage.hasSeenHomeTooltip()).toBe(true);
  });

  test('the bootstrap falls back to createBrowserHomeStorage in a real browser, where require is unavailable', () => {
    const { loadDinoQuizStorage, createBrowserHomeStorage } = require(MAIN_JS_PATH);

    const resolved = loadDinoQuizStorage({}) || createBrowserHomeStorage(createFakeWindow());

    expect(typeof resolved.hasSeenHomeTooltip).toBe('function');
    expect(typeof resolved.markHomeTooltipSeen).toBe('function');
    expect(typeof resolved.recordEventOnce).toBe('function');
  });
});
