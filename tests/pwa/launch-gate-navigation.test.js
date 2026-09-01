'use strict';

const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-325: hidden #/gates-lanzamiento route (adult/QA-only, no visible link)', () => {
  test('index.html loads the launch-gate screen script before the bootstrap script', () => {
    const fs = require('fs');
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const launchGateIndex = indexHtml.indexOf('/scripts/launchGateScreen.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(launchGateIndex).toBeGreaterThan(-1);
    expect(launchGateIndex).toBeLessThan(mainIndex);
  });

  test('loadLaunchGateStrings fetches the i18n resource and returns the launchGate strings', async () => {
    const { loadLaunchGateStrings } = require(MAIN_JS_PATH);
    const launchGateStrings = { screenTitle: 'Estado de los gates de lanzamiento' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ launchGate: launchGateStrings }),
    });

    const result = await loadLaunchGateStrings(fetchFn, '/i18n/es.json');

    expect(fetchFn).toHaveBeenCalledWith('/i18n/es.json');
    expect(result).toEqual(launchGateStrings);
  });

  test('navigateToLaunchGate sets the location hash used to identify the route', () => {
    const { navigateToLaunchGate, LAUNCH_GATE_HASH } = require(MAIN_JS_PATH);
    const loc = { hash: '' };

    navigateToLaunchGate(loc);

    expect(loc.hash).toBe(LAUNCH_GATE_HASH);
  });

  test('isLaunchGateRoute recognizes the launch-gate hash and nothing else', () => {
    const { isLaunchGateRoute, LAUNCH_GATE_HASH } = require(MAIN_JS_PATH);

    expect(isLaunchGateRoute({ hash: LAUNCH_GATE_HASH })).toBe(true);
    expect(isLaunchGateRoute({ hash: '' })).toBe(false);
    expect(isLaunchGateRoute({ hash: '#/otra-cosa' })).toBe(false);
  });

  test('the launch-gate hash is never referenced from any other screen script (no visible link)', () => {
    const fs = require('fs');
    const { LAUNCH_GATE_HASH } = require(MAIN_JS_PATH);
    const scriptsDir = path.resolve(__dirname, '../../public/scripts');
    const offenders = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.endsWith('.js') && file !== 'main.js' && file !== 'launchGateScreen.js')
      .filter((file) => fs.readFileSync(path.join(scriptsDir, file), 'utf-8').includes(LAUNCH_GATE_HASH));

    expect(offenders).toEqual([]);
  });

  test('renderRoute renders the launch-gate screen for the launch-gate hash, wiring a back callback', async () => {
    const { renderRoute, LAUNCH_GATE_HASH } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderLaunchGateScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ launchGate: {} }) });
    const loc = { hash: LAUNCH_GATE_HASH };

    global.window.DinoQuiz = { screens: { renderLaunchGateScreen } };

    await renderRoute(doc, fetchFn, loc);

    expect(renderLaunchGateScreen).toHaveBeenCalledTimes(1);
    const [, options] = renderLaunchGateScreen.mock.calls[0];
    expect(typeof options.onBack).toBe('function');

    options.onBack();
    expect(loc.hash).toBe('');
  });

  test('renderRoute renders Home (not the launch-gate screen) for an empty hash', async () => {
    const { renderRoute } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderHomeScreen = jest.fn();
    const renderLaunchGateScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const loc = { hash: '' };

    global.window.DinoQuiz = { screens: { renderHomeScreen, renderLaunchGateScreen } };

    await renderRoute(doc, fetchFn, loc);

    expect(renderHomeScreen).toHaveBeenCalledTimes(1);
    expect(renderLaunchGateScreen).not.toHaveBeenCalled();
  });
});
