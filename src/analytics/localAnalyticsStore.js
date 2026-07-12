const STORAGE_KEY = 'dinoquiz_analytics_v1';
const RESTRICTED_KEY = 'dinoquiz_analytics_restricted';

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { counters: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.counters !== 'object' || parsed.counters === null) {
      return { counters: {} };
    }
    return parsed;
  } catch (error) {
    return { counters: {} };
  }
}

function writeState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage unavailable (private mode, quota exceeded, etc.) - no PII at stake, fail silently.
  }
}

export function isAnalyticsRestricted() {
  try {
    return window.localStorage.getItem(RESTRICTED_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

export function incrementCounter(eventName) {
  if (isAnalyticsRestricted()) return;
  const state = readState();
  const current = state.counters[eventName] || 0;
  state.counters[eventName] = current + 1;
  writeState(state);
}

export function getCounters() {
  return { ...readState().counters };
}

export function getCounter(eventName) {
  return readState().counters[eventName] || 0;
}

export function getReplayRate(replayEventName, gameStartEventName) {
  const counters = getCounters();
  const gamesStarted = counters[gameStartEventName] || 0;
  if (gamesStarted === 0) return 0;
  const replays = counters[replayEventName] || 0;
  return replays / gamesStarted;
}

export function resetCounters() {
  writeState({ counters: {} });
}
