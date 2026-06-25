/**
 * analytics.js
 * Anonymous, aggregated product metrics — no PII, no cookies, no device IDs.
 * Events are batched and sent to a backend endpoint, or stored locally
 * if offline and retried later.
 */

const APP_VERSION = '1.0.0';
const LOCALE = 'es-ES';
const BATCH_SIZE = 10;
const BATCH_KEY = 'dinoquiz_event_batch';
const ENDPOINT = '/api/events';

let batch = [];

/**
 * Loads any previously batched events from localStorage (for offline retry).
 */
function loadBatch() {
  try {
    const raw = localStorage.getItem(BATCH_KEY);
    if (raw) {
      batch = JSON.parse(raw);
    }
  } catch (e) {
    batch = [];
  }
}

/**
 * Persists the current batch to localStorage.
   */
function saveBatch() {
  try {
    localStorage.setItem(BATCH_KEY, JSON.stringify(batch));
  } catch (e) {
    // Storage full or disabled — silently drop events
  }
}

/**
 * Attempts to flush the batch to the backend.
   */
async function flushBatch() {
  if (batch.length === 0) return;
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
    if (response.ok) {
      batch = [];
      saveBatch();
    }
  } catch (e) {
    // Offline or network error — keep events in batch for later retry
  }
}

/**
 * Logs an anonymous product event.
 * Never includes PII, IP, device IDs, or cookies.
 *
 * @param {string} event - Event name (e.g., 'game_started', 'replay_clicked').
 * @param {Object} [properties={}] - Additional event properties (no PII).
   */
function logEvent(event, properties = {}) {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    app_version: APP_VERSION,
    locale: LOCALE,
    ...properties,
  };

  batch.push(entry);

  if (batch.length >= BATCH_SIZE) {
    flushBatch();
  } else {
    saveBatch();
  }
}

// Initialize batch from storage on module load
loadBatch();

// Attempt to flush on page visibility change (when user returns)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    flushBatch();
  }
});

export { logEvent };
