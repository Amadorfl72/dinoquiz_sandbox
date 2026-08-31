'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderOfflineDiagnosticsPanel } = require('./OfflineDiagnosticsPanel');
const allStrings = require('../../public/i18n/es.json');
const { offlineDiagnostics: strings } = allStrings;

const MODE_IDS = { QUIZ: 'quiz', LABERINTO: 'laberinto' };

function makeStorage(initial) {
  const store = Object.assign({}, initial);
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
  };
}

function fakeOfflineStatus(swVersion, lastPreloadAt) {
  return {
    getSwVersion: () => swVersion,
    getLastPreloadAt: () => lastPreloadAt,
  };
}

describe('OfflineDiagnosticsPanel rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title and section headings come from the es locale resource file', async () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus('v35', '2026-08-31T10:00:00.000Z'),
      validateModeResources: () => Promise.resolve([]),
    });
    await result.readyPromise;

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.introText);
    expect(container.textContent).toContain(strings.swState.heading);
    expect(container.textContent).toContain(strings.modeMatrix.heading);
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });
    renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });

    expect(container.querySelectorAll('.offline-diagnostics-panel').length).toBe(1);
  });
});

describe('OfflineDiagnosticsPanel SW state section', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('shows the recorded SW version and last preload timestamp read from offlineStatus.js', () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [],
      offlineStatus: fakeOfflineStatus('v35', '2026-08-31T10:00:00.000Z'),
      validateModeResources: () => Promise.resolve([]),
    });

    expect(result.swVersionValue.textContent).toBe('v35');
    expect(result.lastPreloadValue.textContent).toBe('2026-08-31T10:00:00.000Z');
  });

  test('falls back to the not-available copy when nothing was ever recorded locally', () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });

    expect(result.swVersionValue.textContent).toBe(strings.swState.notAvailableText);
    expect(result.lastPreloadValue.textContent).toBe(strings.swState.notAvailableText);
  });

  test('reads through the injected storage adapter, mirroring offlineStatus.js callers', () => {
    const storage = makeStorage({
      'dinoquiz:swVersion': JSON.stringify('v35'),
      'dinoquiz:lastPreloadAt': JSON.stringify('2026-08-31T10:00:00.000Z'),
    });
    const offlineStatus = require('../services/offlineStatus');

    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [],
      offlineStatus,
      storageAdapter: storage,
      validateModeResources: () => Promise.resolve([]),
    });

    expect(result.swVersionValue.textContent).toBe('v35');
    expect(result.lastPreloadValue.textContent).toBe('2026-08-31T10:00:00.000Z');
  });
});

describe('OfflineDiagnosticsPanel per-mode resource matrix', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('shows one row per mode id, using the shared mode name copy', async () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ, MODE_IDS.LABERINTO],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });
    await result.readyPromise;

    expect(result.table.querySelectorAll('tbody tr').length).toBe(2);
    expect(getByText(container, allStrings.modes.quiz.name)).toBeInTheDocument();
    expect(getByText(container, allStrings.modes.laberinto.name)).toBeInTheDocument();
  });

  test('a row starts in the checking state and calls validateModeResources for that mode id', () => {
    const validateModeResources = jest.fn(() => new Promise(() => {}));

    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources,
    });

    expect(result.rowByModeId[MODE_IDS.QUIZ].textContent).toBe(strings.modeMatrix.checkingText);
    expect(validateModeResources).toHaveBeenCalledWith(MODE_IDS.QUIZ, undefined);
  });

  test('a mode with no missing resources settles to the OK status', async () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });
    await result.readyPromise;

    expect(result.rowByModeId[MODE_IDS.QUIZ].textContent).toBe(strings.modeMatrix.statusOkText);
  });

  test('a mode with missing resources lists every missing URL as text, never color alone', async () => {
    const missing = ['/scripts/questionScreen.js', '/assets/images/mascot.svg'];
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve(missing),
    });
    await result.readyPromise;

    const cell = result.rowByModeId[MODE_IDS.QUIZ];
    expect(cell.textContent).toContain('Faltan 2 recursos');
    missing.forEach((url) => expect(cell.textContent).toContain(url));
  });

  test('degrades to the unavailable status, never throwing, when validateModeResources rejects', async () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.reject(new Error('caches unavailable')),
    });
    await result.readyPromise;

    expect(result.rowByModeId[MODE_IDS.QUIZ].textContent).toBe(strings.modeMatrix.statusUnavailableText);
  });

  test('falls back to the real src/services/modeResourceValidation.js when no override is given, degrading to OK when this test environment has no live Cache Storage', async () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
    });
    await result.readyPromise;

    // src/services/modeResourceValidation.js's own contract: no `caches`
    // API (true here, jsdom has none) resolves to [] rather than flagging
    // every resource missing.
    expect(result.rowByModeId[MODE_IDS.QUIZ].textContent).toBe(strings.modeMatrix.statusOkText);
  });
});

describe('OfflineDiagnosticsPanel privacy — purely local, nothing transmitted', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('never calls fetch/XHR of its own while rendering and checking mode resources', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn();

    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus('v35', '2026-08-31T10:00:00.000Z'),
      validateModeResources: () => Promise.resolve([]),
    });
    await result.readyPromise;

    expect(global.fetch).not.toHaveBeenCalled();
    global.fetch = originalFetch;
  });
});

describe('OfflineDiagnosticsPanel accessibility', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the title is a heading and receives focus on mount', () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBe(result.title);
    expect(result.title).toHaveFocus();
  });

  test('each mode status cell is announced via role="status"/aria-live="polite" as it updates', async () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });

    const cell = result.rowByModeId[MODE_IDS.QUIZ];
    expect(cell).toHaveAttribute('role', 'status');
    expect(cell).toHaveAttribute('aria-live', 'polite');
    await result.readyPromise;
  });

  test('the mode matrix is a real table with column headers for screen readers', () => {
    const result = renderOfflineDiagnosticsPanel(container, {
      strings,
      allStrings,
      modeIds: [MODE_IDS.QUIZ],
      offlineStatus: fakeOfflineStatus(null, null),
      validateModeResources: () => Promise.resolve([]),
    });

    const columnHeaders = result.table.querySelectorAll('thead th[scope="col"]');
    expect(columnHeaders.length).toBe(2);
    const rowHeader = result.table.querySelector('tbody th[scope="row"]');
    expect(rowHeader).not.toBeNull();
  });
});
