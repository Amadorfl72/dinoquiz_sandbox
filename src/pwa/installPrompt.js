let deferredPrompt = null;
let installPromptAvailable = false;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback(installPromptAvailable));
}

export function initInstallPromptListener(target = (typeof window !== 'undefined' ? window : null)) {
  if (!target) {
    return;
  }

  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installPromptAvailable = true;
    notify();
  });

  target.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installPromptAvailable = false;
    notify();
  });
}

export function onInstallPromptAvailabilityChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function isInstallPromptAvailable() {
  return installPromptAvailable;
}

export async function promptInstall() {
  if (!deferredPrompt) {
    return { outcome: 'unavailable' };
  }

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;

  deferredPrompt = null;
  installPromptAvailable = false;
  notify();

  return choice;
}

// Exposed for tests only.
export function __resetInstallPromptStateForTests() {
  deferredPrompt = null;
  installPromptAvailable = false;
  listeners.clear();
}
