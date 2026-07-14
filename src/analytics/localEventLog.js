const STORAGE_KEY = 'dinoquiz.localEvents.v1';

function readCounts() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeCounts(counts) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (error) {
    // localStorage puede no estar disponible (modo privado, cuotas, etc.)
  }
}

// Cuenta agregada de eventos locales, sin identificadores de usuario ni
// marcas de tiempo individuales, para cumplir con COPPA/GDPR-K.
export function registerLocalEvent(eventName) {
  const counts = readCounts();
  counts[eventName] = (counts[eventName] || 0) + 1;
  writeCounts(counts);
  return counts[eventName];
}

export function getLocalEventCounts() {
  return readCounts();
}

export function resetLocalEventCounts() {
  writeCounts({});
}
