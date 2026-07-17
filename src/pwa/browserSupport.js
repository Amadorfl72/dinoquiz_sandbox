// Minimum supported browser versions for the install/standalone flow.
// Update these when the "last 2 major versions" window rolls forward.
const MIN_VERSIONS = {
  chrome: 122,
  edge: 122,
  safari: 16,
};

export function detectBrowser(userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
  const edgeMatch = userAgent.match(/Edg\/(\d+)/);
  if (edgeMatch) {
    return { name: 'edge', version: Number(edgeMatch[1]) };
  }

  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  if (chromeMatch) {
    return { name: 'chrome', version: Number(chromeMatch[1]) };
  }

  const safariVersionMatch = userAgent.match(/Version\/(\d+)[\d.]*\s+Safari/);
  if (safariVersionMatch && /Safari/.test(userAgent)) {
    return { name: 'safari', version: Number(safariVersionMatch[1]) };
  }

  return { name: 'unknown', version: 0 };
}

export function supportsServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  // iOS Safari does not support the display-mode media query pre-standalone launch.
  const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;

  return Boolean(mediaStandalone || iosStandalone);
}

export function meetsMinimumBrowserVersion(browser = detectBrowser()) {
  const minVersion = MIN_VERSIONS[browser.name];
  if (minVersion === undefined) {
    return false;
  }
  return browser.version >= minVersion;
}

// True when the current browser can realistically complete the install
// flow (service worker + beforeinstallprompt-capable engine). Safari never
// fires beforeinstallprompt, but the manual "Add to Home Screen" path still
// works there as long as the service worker and minimum version are met.
export function supportsInstallFlow() {
  return supportsServiceWorker() && meetsMinimumBrowserVersion();
}

export const MINIMUM_BROWSER_VERSIONS = MIN_VERSIONS;
