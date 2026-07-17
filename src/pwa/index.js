import { supportsServiceWorker, supportsInstallFlow, isStandaloneDisplayMode } from './browserSupport.js';
import { initInstallPromptListener } from './installPrompt.js';
import { renderFallbackBanner } from './fallbackBanner.js';

// Single entry point wired up from the app bootstrap. Registers the service
// worker when supported, listens for the native install prompt, and shows
// the in-browser fallback banner when the device/browser cannot install or
// already run the app in standalone mode.
export async function bootstrapPwa({ swUrl = '/service-worker.js' } = {}) {
  initInstallPromptListener();

  if (supportsServiceWorker()) {
    try {
      await navigator.serviceWorker.register(swUrl);
    } catch (error) {
      // Registration failures (older WebViews, embedded browsers) must never
      // block gameplay -- the app still works fully in-tab.
      console.warn('[pwa] service worker registration failed, continuing without it', error);
    }
  }

  if (!isStandaloneDisplayMode() && !supportsInstallFlow()) {
    renderFallbackBanner();
  }

  return {
    standalone: isStandaloneDisplayMode(),
    installFlowSupported: supportsInstallFlow(),
  };
}
