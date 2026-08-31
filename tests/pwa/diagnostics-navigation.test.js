'use strict';

const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-319: hidden #/diagnostico route (adult/QA-only, no visible link)', () => {
  test('index.html loads the diagnostics screen script before the bootstrap script', () => {
    const fs = require('fs');
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const diagnosticsIndex = indexHtml.indexOf('/scripts/diagnosticsScreen.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(diagnosticsIndex).toBeGreaterThan(-1);
    expect(diagnosticsIndex).toBeLessThan(mainIndex);
  });

  test('loadDiagnosticsStrings fetches the i18n resource and returns the diagnostics and modes strings', async () => {
    const { loadDiagnosticsStrings } = require(MAIN_JS_PATH);
    const diagnosticsStrings = { screenTitle: 'Diagnóstico técnico' };
    const modesStrings = { quiz: { name: 'Quiz' } };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ diagnostics: diagnosticsStrings, modes: modesStrings }),
    });

    const result = await loadDiagnosticsStrings(fetchFn, '/i18n/es.json');

    expect(fetchFn).toHaveBeenCalledWith('/i18n/es.json');
    expect(result).toEqual({ diagnostics: diagnosticsStrings, modes: modesStrings });
  });

  test('navigateToDiagnostics sets the location hash used to identify the route', () => {
    const { navigateToDiagnostics, DIAGNOSTICS_HASH } = require(MAIN_JS_PATH);
    const loc = { hash: '' };

    navigateToDiagnostics(loc);

    expect(loc.hash).toBe(DIAGNOSTICS_HASH);
  });

  test('isDiagnosticsRoute recognizes the diagnostics hash and nothing else', () => {
    const { isDiagnosticsRoute, DIAGNOSTICS_HASH } = require(MAIN_JS_PATH);

    expect(isDiagnosticsRoute({ hash: DIAGNOSTICS_HASH })).toBe(true);
    expect(isDiagnosticsRoute({ hash: '' })).toBe(false);
    expect(isDiagnosticsRoute({ hash: '#/otra-cosa' })).toBe(false);
  });

  test('the diagnostics hash is never referenced from any other screen script (no visible link)', () => {
    const fs = require('fs');
    const { DIAGNOSTICS_HASH } = require(MAIN_JS_PATH);
    const scriptsDir = path.resolve(__dirname, '../../public/scripts');
    const offenders = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.endsWith('.js') && file !== 'main.js' && file !== 'diagnosticsScreen.js')
      .filter((file) => fs.readFileSync(path.join(scriptsDir, file), 'utf-8').includes(DIAGNOSTICS_HASH));

    expect(offenders).toEqual([]);
  });

  test('renderRoute renders the diagnostics screen for the diagnostics hash, wiring a back callback', async () => {
    const { renderRoute, DIAGNOSTICS_HASH } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderDiagnosticsScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ diagnostics: {}, modes: {} }) });
    const loc = { hash: DIAGNOSTICS_HASH };

    global.window.DinoQuiz = { screens: { renderDiagnosticsScreen } };

    await renderRoute(doc, fetchFn, loc);

    expect(renderDiagnosticsScreen).toHaveBeenCalledTimes(1);
    const [, options] = renderDiagnosticsScreen.mock.calls[0];
    expect(typeof options.onBack).toBe('function');

    options.onBack();
    expect(loc.hash).toBe('');
  });

  test('renderRoute renders Home (not diagnostics) for an empty hash', async () => {
    const { renderRoute } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderHomeScreen = jest.fn();
    const renderDiagnosticsScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const loc = { hash: '' };

    global.window.DinoQuiz = { screens: { renderHomeScreen, renderDiagnosticsScreen } };

    await renderRoute(doc, fetchFn, loc);

    expect(renderHomeScreen).toHaveBeenCalledTimes(1);
    expect(renderDiagnosticsScreen).not.toHaveBeenCalled();
  });
});
