'use strict';

const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-116: Home -> Privacy policy navigation (reachable in <=2 taps)', () => {
  test('index.html loads the privacy policy screen script before the bootstrap script', () => {
    const fs = require('fs');
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const privacyIndex = indexHtml.indexOf('/scripts/privacyPolicyScreen.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(privacyIndex).toBeGreaterThan(-1);
    expect(privacyIndex).toBeLessThan(mainIndex);
  });

  test('loadPrivacyPolicyStrings fetches the i18n resource and returns the privacyPolicy strings', async () => {
    const { loadPrivacyPolicyStrings } = require(MAIN_JS_PATH);
    const privacyPolicyStrings = { screenTitle: 'Política de privacidad' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ privacyPolicy: privacyPolicyStrings }),
    });

    const result = await loadPrivacyPolicyStrings(fetchFn, '/i18n/es.json');

    expect(fetchFn).toHaveBeenCalledWith('/i18n/es.json');
    expect(result).toBe(privacyPolicyStrings);
  });

  test('navigateToPrivacyPolicy sets the location hash used to identify the route', () => {
    const { navigateToPrivacyPolicy, PRIVACY_POLICY_HASH } = require(MAIN_JS_PATH);
    const loc = { hash: '' };

    navigateToPrivacyPolicy(loc);

    expect(loc.hash).toBe(PRIVACY_POLICY_HASH);
  });

  test('navigateHome clears the location hash', () => {
    const { navigateHome, PRIVACY_POLICY_HASH } = require(MAIN_JS_PATH);
    const loc = { hash: PRIVACY_POLICY_HASH };

    navigateHome(loc);

    expect(loc.hash).toBe('');
  });

  test('isPrivacyPolicyRoute recognizes the privacy policy hash and nothing else', () => {
    const { isPrivacyPolicyRoute, PRIVACY_POLICY_HASH } = require(MAIN_JS_PATH);

    expect(isPrivacyPolicyRoute({ hash: PRIVACY_POLICY_HASH })).toBe(true);
    expect(isPrivacyPolicyRoute({ hash: '' })).toBe(false);
    expect(isPrivacyPolicyRoute({ hash: '#/otra-cosa' })).toBe(false);
  });

  test('renderRoute renders Home for an empty hash, wiring a callback that navigates to the privacy route (tap 1)', async () => {
    const { renderRoute, PRIVACY_POLICY_HASH } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: {} }) });
    const loc = { hash: '' };

    global.window.DinoQuiz = { screens: { renderHomeScreen } };

    await renderRoute(doc, fetchFn, loc);

    expect(renderHomeScreen).toHaveBeenCalledTimes(1);
    const [, options] = renderHomeScreen.mock.calls[0];
    expect(typeof options.onOpenPrivacyPolicy).toBe('function');

    options.onOpenPrivacyPolicy();
    expect(loc.hash).toBe(PRIVACY_POLICY_HASH);
  });

  test('renderRoute renders the privacy policy screen for the privacy hash, wiring a back callback (tap 2)', async () => {
    const { renderRoute, PRIVACY_POLICY_HASH } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderPrivacyPolicyScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ privacyPolicy: {} }) });
    const loc = { hash: PRIVACY_POLICY_HASH };

    global.window.DinoQuiz = { screens: { renderPrivacyPolicyScreen } };

    await renderRoute(doc, fetchFn, loc);

    expect(renderPrivacyPolicyScreen).toHaveBeenCalledTimes(1);
    const [, options] = renderPrivacyPolicyScreen.mock.calls[0];
    expect(typeof options.onBack).toBe('function');

    options.onBack();
    expect(loc.hash).toBe('');
  });
});
