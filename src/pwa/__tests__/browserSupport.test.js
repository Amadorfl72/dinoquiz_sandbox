import {
  detectBrowser,
  meetsMinimumBrowserVersion,
  isStandaloneDisplayMode,
  supportsInstallFlow,
  MINIMUM_BROWSER_VERSIONS,
} from '../browserSupport.js';

const CHROME_TABLET_UA =
  'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const EDGE_TABLET_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.51';
const SAFARI_IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const OLD_SAFARI_IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';
const EMBEDDED_WEBVIEW_UA = 'Mozilla/5.0 (Linux; Android 9; SM-T290) AppleWebKit/537.36 (KHTML, like Gecko)';

describe('detectBrowser', () => {
  test('detects Chrome on a tablet UA', () => {
    expect(detectBrowser(CHROME_TABLET_UA)).toEqual({ name: 'chrome', version: 124 });
  });

  test('detects Edge even though it also contains a Chrome token', () => {
    expect(detectBrowser(EDGE_TABLET_UA)).toEqual({ name: 'edge', version: 124 });
  });

  test('detects Safari on iPad', () => {
    expect(detectBrowser(SAFARI_IPAD_UA)).toEqual({ name: 'safari', version: 17 });
  });

  test('falls back to unknown for an unrecognized/embedded UA', () => {
    expect(detectBrowser(EMBEDDED_WEBVIEW_UA)).toEqual({ name: 'unknown', version: 0 });
  });
});

describe('meetsMinimumBrowserVersion', () => {
  test('current Chrome tablet passes the minimum version', () => {
    expect(meetsMinimumBrowserVersion(detectBrowser(CHROME_TABLET_UA))).toBe(true);
  });

  test('current Edge tablet passes the minimum version', () => {
    expect(meetsMinimumBrowserVersion(detectBrowser(EDGE_TABLET_UA))).toBe(true);
  });

  test('current Safari on iPad passes the minimum version', () => {
    expect(meetsMinimumBrowserVersion(detectBrowser(SAFARI_IPAD_UA))).toBe(true);
  });

  test('old Safari on iPad fails the minimum version', () => {
    expect(meetsMinimumBrowserVersion(detectBrowser(OLD_SAFARI_IPAD_UA))).toBe(false);
  });

  test('unknown/embedded browser fails the minimum version', () => {
    expect(meetsMinimumBrowserVersion(detectBrowser(EMBEDDED_WEBVIEW_UA))).toBe(false);
  });

  test('minimum version table only covers the three supported engines', () => {
    expect(Object.keys(MINIMUM_BROWSER_VERSIONS).sort()).toEqual(['chrome', 'edge', 'safari']);
  });
});

describe('isStandaloneDisplayMode', () => {
  const originalMatchMedia = window.matchMedia;
  const originalStandalone = navigator.standalone;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    navigator.standalone = originalStandalone;
  });

  test('true when display-mode: standalone media query matches', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(isStandaloneDisplayMode()).toBe(true);
  });

  test('true on iOS navigator.standalone even without matchMedia support', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    navigator.standalone = true;
    expect(isStandaloneDisplayMode()).toBe(true);
  });

  test('false when neither signal is present', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    navigator.standalone = false;
    expect(isStandaloneDisplayMode()).toBe(false);
  });
});

describe('supportsInstallFlow', () => {
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: window.navigator.userAgent,
      configurable: true,
    });
  });

  test('false when the browser lacks service worker support entirely', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    expect(supportsInstallFlow()).toBe(false);
  });
});
