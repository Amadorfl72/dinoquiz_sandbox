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

describe('TRIOFSND-305: local SW status recorded once the SW confirms activate complete', () => {
  test('installs a message listener on navigator.serviceWorker when supported', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const registration = { scope: '/' };
    const register = jest.fn().mockResolvedValue(registration);
    const addEventListener = jest.fn();
    const nav = { serviceWorker: { register, addEventListener } };

    await registerServiceWorker(nav);

    expect(addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  test('does not throw when navigator.serviceWorker has no addEventListener', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const register = jest.fn().mockResolvedValue({ scope: '/' });
    const nav = { serviceWorker: { register } };

    await expect(registerServiceWorker(nav)).resolves.toEqual({ scope: '/' });
  });

  test('handleServiceWorkerMessage records the version via offlineStatus on an activate-complete message', () => {
    const { handleServiceWorkerMessage, SW_ACTIVATE_COMPLETE_MESSAGE_TYPE } = require(MAIN_JS_PATH);
    const offlineStatus = require('../../src/services/offlineStatus');
    const recordSpy = jest.spyOn(offlineStatus, 'recordPrecacheComplete').mockImplementation(() => true);

    handleServiceWorkerMessage({ data: { type: SW_ACTIVATE_COMPLETE_MESSAGE_TYPE, version: 'v34' } });

    expect(recordSpy).toHaveBeenCalledWith('v34');
    recordSpy.mockRestore();
  });

  test('ignores messages of a different/missing type without throwing', () => {
    const { handleServiceWorkerMessage } = require(MAIN_JS_PATH);
    const offlineStatus = require('../../src/services/offlineStatus');
    const recordSpy = jest.spyOn(offlineStatus, 'recordPrecacheComplete').mockImplementation(() => true);

    expect(() => handleServiceWorkerMessage({ data: { type: 'something-else' } })).not.toThrow();
    expect(() => handleServiceWorkerMessage({})).not.toThrow();
    expect(() => handleServiceWorkerMessage(null)).not.toThrow();
    expect(recordSpy).not.toHaveBeenCalled();
    recordSpy.mockRestore();
  });

  test('the SW message type constant matches public/service-worker.js own constant', () => {
    const { SW_ACTIVATE_COMPLETE_MESSAGE_TYPE } = require(MAIN_JS_PATH);
    const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
    const { SW_ACTIVATE_COMPLETE_MESSAGE_TYPE: swConstant } = require(SW_PATH);

    expect(SW_ACTIVATE_COMPLETE_MESSAGE_TYPE).toBe(swConstant);
  });

  test('service-worker.js posts the activate-complete message (with its version) to every client once activate finishes', async () => {
    const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
    const swModule = require(SW_PATH);

    const postMessage = jest.fn();
    self.caches = {
      keys: async () => [],
      delete: async () => true,
    };
    self.clients = {
      claim: jest.fn().mockResolvedValue(undefined),
      matchAll: jest.fn().mockResolvedValue([{ postMessage }]),
    };

    try {
      const activateEvent = new Event('activate');
      let activatePromise = Promise.resolve();
      activateEvent.waitUntil = (promise) => {
        activatePromise = promise;
      };
      self.dispatchEvent(activateEvent);
      await activatePromise;

      expect(postMessage).toHaveBeenCalledWith({
        type: swModule.SW_ACTIVATE_COMPLETE_MESSAGE_TYPE,
        version: swModule.SW_VERSION,
      });
    } finally {
      delete self.caches;
      delete self.clients;
    }
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

  test('TRIOFSND-209: renderHome wires onToggleMute so a toggle records the aggregated, non-PII mute_toggled event', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storage = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      recordEventOnce: jest.fn(),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    const { onToggleMute } = renderHomeScreen.mock.calls[0][1];
    onToggleMute(true);

    expect(storage.recordEvent).toHaveBeenCalledWith('mute_toggled');
  });

  test('TRIOFSND-97: renderHome wires onPurchase so confirming persists the ads-removed flag to storage', async () => {
    const { renderHome, ADS_REMOVED_STORAGE_KEY } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

    await renderHome(doc, renderHomeScreen, fetchFn, undefined, undefined, storageObj);

    const { onPurchase } = renderHomeScreen.mock.calls[0][1];
    onPurchase();

    expect(storageObj.setItem).toHaveBeenCalledWith(ADS_REMOVED_STORAGE_KEY, 'true');
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

  test('renderHome without a storage argument falls back to a default storage backend and still wires the tooltip', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue({ id: 'app' }) };
    const renderHomeScreen = jest.fn();
    const homeStrings = { title: 'DinoQuiz' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings }),
    });

    await renderHome(doc, renderHomeScreen, fetchFn);

    // Without an explicit storage argument, renderHome falls back to
    // loadDinoQuizStorage()/createBrowserHomeStorage() (TRIOFSND-65) and the
    // global controls (TRIOFSND-66) — so the tooltip/mute options are still
    // wired, just backed by the default storage instead of a test double.
    expect(renderHomeScreen).toHaveBeenCalledWith(
      { id: 'app' },
      expect.objectContaining({
        strings: homeStrings,
        showTooltip: expect.any(Boolean),
        onTooltipDismiss: expect.any(Function),
        onPlayButtonClick: expect.any(Function),
      })
    );
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

  test('recordEvent is a non-PII local counter that increments on every call', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('partida_iniciada');

    expect(win.localStorage.setItem).toHaveBeenLastCalledWith(
      'dinoquiz:analyticsEventCounts',
      JSON.stringify({ partida_iniciada: 2 })
    );
  });

  test('TRIOFSND-80: recordQuestionAnswered registers pregunta_respondida and aggregates per-question accuracy, no PII', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.recordQuestionAnswered('trex-01', true);
    await storage.recordQuestionAnswered('trex-01', false);

    expect(win.localStorage.setItem).toHaveBeenCalledWith(
      'dinoquiz:questionAnsweredEvents',
      JSON.stringify([
        { tipo: 'pregunta_respondida', id_pregunta: 'trex-01', acierto: true },
        { tipo: 'pregunta_respondida', id_pregunta: 'trex-01', acierto: false },
      ])
    );
    expect(win.localStorage.setItem).toHaveBeenCalledWith(
      'dinoquiz:analyticsEventCounts',
      JSON.stringify({ pregunta_respondida: 2 })
    );
    expect(win.localStorage.setItem).toHaveBeenLastCalledWith(
      'dinoquiz:questionStats',
      JSON.stringify({ 'trex-01': { total_respuestas: 2, total_aciertos: 1 } })
    );
    expect(await storage.getQuestionStats('trex-01')).toEqual({
      total_respuestas: 2,
      total_aciertos: 1,
      porcentaje_acierto: 50,
    });
  });

  test('TRIOFSND-80: getQuestionStats defaults to zero counters and a 0% for a question with no history', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const storage = createBrowserHomeStorage(createFakeWindow());

    expect(await storage.getQuestionStats('never-answered')).toEqual({
      total_respuestas: 0,
      total_aciertos: 0,
      porcentaje_acierto: 0,
    });
  });

  test('TRIOFSND-129: markFunFactDiscovered registers a fun fact once, without duplicates', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.markFunFactDiscovered('trex-01');
    await storage.markFunFactDiscovered('trex-01');
    await storage.markFunFactDiscovered('triceratops-02');

    expect(win.localStorage.setItem).toHaveBeenLastCalledWith(
      'dinoquiz:discoveredFunFacts',
      JSON.stringify(['trex-01', 'triceratops-02'])
    );
    expect(await storage.getDiscoveredFunFactsCount()).toBe(2);
    expect(storage.getDiscoveredFunFactsCountSync()).toBe(2);
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

    await renderHome(doc, renderHomeScreen, fetchFn, storageObj);

    const { getByRole, within, fireEvent } = require('@testing-library/dom');
    // Home also has a standalone privacy-policy icon button (TRIOFSND-116,
    // navigates to the full policy screen) sharing the same accessible name
    // as this one, so this scopes the query to the global controls group
    // (TRIOFSND-66) that opens the inline disclosure panel this test checks.
    const globalControls = getByRole(container, 'group', { name: home.globalControls.groupLabel });
    const privacyButton = within(globalControls).getByRole('button', { name: home.globalControls.privacyButton });
    fireEvent.click(privacyButton);
    expect(container).toHaveTextContent(privacy.heading);
    expect(container).toHaveTextContent(privacy.intro);

    const purchaseButton = within(globalControls).getByRole('button', { name: home.globalControls.purchaseButton });
    fireEvent.click(purchaseButton);
    expect(container).toHaveTextContent(purchase.heading);
    expect(container).toHaveTextContent(purchase.priceLabel);

    container.remove();
  });
});

describe('TRIOFSND-129: Home shows the persisted discovered-fun-facts progress', () => {
  test('renders how many fun facts were discovered so far out of the full loaded bank', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home, privacy, purchase } = require('../../public/i18n/es.json');
    const { EXPECTED_QUESTION_COUNT } = require('../../src/data/questionBank');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home, privacy, purchase }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn(),
      recordEventOnce: jest.fn(),
      getDiscoveredFunFactsCount: jest.fn().mockResolvedValue(3),
    };

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    expect(container).toHaveTextContent(
      home.funFactsProgressFormat.replace('{count}', '3').replace('{total}', String(EXPECTED_QUESTION_COUNT))
    );

    container.remove();
  });

  test('renders nothing extra when the storage backend does not expose a discovered-fun-facts count', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home, privacy, purchase } = require('../../public/i18n/es.json');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home, privacy, purchase }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn(),
      recordEventOnce: jest.fn(),
    };

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    expect(container.querySelector('.home-screen__fun-facts-progress')).toBeNull();

    container.remove();
  });
});

describe('TRIOFSND-96: Home shows the persisted best score and longest racha', () => {
  test('renders the best score and longest racha achieved on this device so far', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home, privacy, purchase } = require('../../public/i18n/es.json');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home, privacy, purchase }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn(),
      recordEventOnce: jest.fn(),
      getBestScore: jest.fn().mockResolvedValue(8),
      getMaxStreak: jest.fn().mockResolvedValue(5),
    };

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    expect(container).toHaveTextContent(home.bestScoreFormat.replace('{bestScore}', '8'));
    expect(container).toHaveTextContent(home.bestStreakFormat.replace('{bestStreak}', '5'));

    container.remove();
  });

  test('renders nothing extra when the storage backend does not expose a best score/racha', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home, privacy, purchase } = require('../../public/i18n/es.json');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home, privacy, purchase }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn(),
      recordEventOnce: jest.fn(),
    };

    await renderHome(doc, renderHomeScreen, fetchFn, storage);

    expect(container.querySelector('.home-screen__best-score')).toBeNull();
    expect(container.querySelector('.home-screen__best-streak')).toBeNull();

    container.remove();
  });
});

describe('TRIOFSND-96: createBrowserHomeStorage — native fallback persists best score/racha', () => {
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

  test('recordScore/recordStreak only raise the persisted value when the new one is higher (monotonic)', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.recordScore(5);
    await storage.recordScore(3);
    expect(await storage.getBestScore()).toBe(5);
    expect(storage.getBestScoreSync()).toBe(5);

    await storage.recordStreak(4);
    await storage.recordStreak(2);
    expect(await storage.getMaxStreak()).toBe(4);
    expect(storage.getMaxStreakSync()).toBe(4);
  });

  test('defaults to 0 before any score/racha has been recorded', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const storage = createBrowserHomeStorage(createFakeWindow());

    expect(await storage.getBestScore()).toBe(0);
    expect(await storage.getMaxStreak()).toBe(0);
    expect(storage.getBestScoreSync()).toBe(0);
    expect(storage.getMaxStreakSync()).toBe(0);
  });

  test('persists across a fresh instance backed by the same localStorage (session persistence)', async () => {
    const win = createFakeWindow();
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);

    await createBrowserHomeStorage(win).recordScore(7);
    await createBrowserHomeStorage(win).recordStreak(4);

    const reopened = createBrowserHomeStorage(win);
    expect(await reopened.getBestScore()).toBe(7);
    expect(await reopened.getMaxStreak()).toBe(4);
  });

  test('writes under the same namespaced keys src/services/storage uses', async () => {
    const { createBrowserHomeStorage } = require(MAIN_JS_PATH);
    const win = createFakeWindow();
    const storage = createBrowserHomeStorage(win);

    await storage.recordScore(6);
    await storage.recordStreak(3);

    expect(win.localStorage.setItem).toHaveBeenCalledWith('dinoquiz:bestScore', JSON.stringify(6));
    expect(win.localStorage.setItem).toHaveBeenCalledWith('dinoquiz:maxStreak', JSON.stringify(3));
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

  test('TRIOFSND-209: renderMuteToggle wires the app-shell mute button so tapping it records the aggregated, non-PII mute_toggled event', async () => {
    const { renderMuteToggle } = require(MAIN_JS_PATH);
    const { renderMuteToggleButton } = require('../../public/scripts/appShell');
    const { getByRole, fireEvent } = require('@testing-library/dom');

    const container = document.createElement('div');
    container.id = 'mute-toggle';
    document.body.appendChild(container);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(require('../../public/i18n/es.json')),
    });
    const analyticsStorage = { recordEvent: jest.fn().mockResolvedValue(1) };

    await renderMuteToggle(document, renderMuteToggleButton, fetchFn, analyticsStorage);

    fireEvent.click(getByRole(container, 'button'));

    expect(analyticsStorage.recordEvent).toHaveBeenCalledWith('mute_toggled');

    container.remove();
  });
});
