import { supportsInstallFlow, isStandaloneDisplayMode } from './browserSupport.js';

const BANNER_ID = 'dq-fallback-banner';

// Shown when the tablet/browser can neither install the PWA nor already
// runs in standalone mode (older tablets, embedded/in-app browsers, etc).
// The rest of the app keeps working normally in-tab; this is purely a
// informational nudge, never a blocker.
export function shouldShowFallbackBanner() {
  return !isStandaloneDisplayMode() && !supportsInstallFlow();
}

export function renderFallbackBanner(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc || !shouldShowFallbackBanner()) {
    return null;
  }

  const existing = doc.getElementById(BANNER_ID);
  if (existing) {
    return existing;
  }

  const banner = doc.createElement('div');
  banner.id = BANNER_ID;
  banner.setAttribute('role', 'status');
  banner.className = 'dq-fallback-banner';
  banner.textContent =
    'Puedes seguir jugando aqui mismo en el navegador. Este dispositivo no permite instalar la app.';

  const dismiss = doc.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'dq-fallback-banner__dismiss';
  dismiss.textContent = 'Cerrar';
  dismiss.addEventListener('click', () => banner.remove());
  banner.appendChild(dismiss);

  doc.body.appendChild(banner);
  return banner;
}

export function removeFallbackBanner(doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) {
    return;
  }
  const existing = doc.getElementById(BANNER_ID);
  if (existing) {
    existing.remove();
  }
}
