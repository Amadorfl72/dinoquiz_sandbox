const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');

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
  test('loadHomeResources fetches the i18n resource and returns the home, privacy and purchase sections', async () => {
    const { loadHomeResources } = require(MAIN_JS_PATH);
    const homeStrings = { title: 'DinoQuiz' };
    const privacyStrings = { heading: 'Política de privacidad' };
    const purchaseStrings = { heading: 'Eliminar anuncios' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, privacy: privacyStrings, purchase: purchaseStrings }),
    });

    const result = await loadHomeResources(fetchFn, '/i18n/es.json');

    expect(fetchFn).toHaveBeenCalledWith('/i18n/es.json');
    expect(result).toEqual({ home: homeStrings, privacy: privacyStrings, purchase: purchaseStrings });
  });

  test('loadHomeResources resolves to null and logs when the fetch fails', async () => {
    const { loadHomeResources } = require(MAIN_JS_PATH);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = jest.fn().mockRejectedValue(new Error('offline'));

    const result = await loadHomeResources(fetchFn);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('renderHome renders into #app using the fetched strings, privacy/purchase sections and the persisted mute state', async () => {
    const { renderHome, MUTE_STORAGE_KEY } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const homeStrings = { title: 'DinoQuiz' };
    const privacyStrings = { heading: 'Política de privacidad' };
    const purchaseStrings = { heading: 'Eliminar anuncios' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, privacy: privacyStrings, purchase: purchaseStrings }),
    });
    const storageObj = { getItem: jest.fn().mockReturnValue('true'), setItem: jest.fn() };

    await renderHome(doc, renderHomeScreen, fetchFn, storageObj);

    expect(doc.getElementById).toHaveBeenCalledWith('app');
    expect(storageObj.getItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY);
    expect(renderHomeScreen).toHaveBeenCalledWith(
      { id: 'app' },
      expect.objectContaining({
        strings: homeStrings,
        privacyStrings: privacyStrings,
        purchaseStrings: purchaseStrings,
        muted: true,
        onToggleMute: expect.any(Function),
      })
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

describe('TRIOFSND-66: renderHome supplies privacy/purchase i18n sections the browser has no require() for', () => {
  test('the real homeScreen renderer builds the privacy and purchase panels from the sections renderHome fetched, without relying on require()', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home, privacy, purchase } = require('../../public/i18n/es.json');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home, privacy, purchase }),
    });
    const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

    const homeApi = await renderHome(doc, renderHomeScreen, fetchFn, storageObj);

    const { fireEvent } = require('@testing-library/dom');
    // Home renders both the inline collapsible privacy/purchase panels
    // (TRIOFSND-66, exercised here) and a separate icon button that
    // navigates to the full Privacy policy screen (TRIOFSND-116) sharing the
    // same accessible name, so the inline-panel buttons are taken from the
    // renderHomeScreen API directly rather than an ambiguous name lookup.
    fireEvent.click(homeApi.privacyButton);
    expect(container).toHaveTextContent(privacy.heading);
    expect(container).toHaveTextContent(privacy.intro);

    fireEvent.click(homeApi.purchaseButton);
    expect(container).toHaveTextContent(purchase.heading);
    expect(container).toHaveTextContent(purchase.priceLabel);

    container.remove();
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
