/**
 * Telemetry module for DinoQuiz.
 *
 * Emits anonymous, aggregated product events as structured JSON logs.
 * No PII, no cookies, no device IDs, no IP addresses are ever recorded.
 *
 * Each event contains:
 *   - event: string (event name)
 *   - timestamp: ISO 8601 string
 *   - app_version: string
 *   - locale: string
 *   - ...event-specific fields
 *
 * Events are queued and flushed via a configurable transport.
 * In production, transport sends to a privacy-respecting endpoint.
 * In development/test, transport defaults to console + in-memory buffer.
 */

export const APP_VERSION = '1.0.0';
export const DEFAULT_LOCALE = 'es-ES';

/**
 * In-memory event buffer, useful for tests and local debugging.
 * @type {Array<Object>}
 */
export const eventBuffer = [];

/**
 * Default transport: pushes to eventBuffer and logs to console.
 * Replace with a network sender in production.
 *
 * @param {Object} event - The structured event object.
 * @returns {void}
 */
function defaultTransport(event) {
  eventBuffer.push(event);
  // eslint-disable-next-line no-console
  console.debug('[telemetry]', event.event, event);
}

let currentTransport = defaultTransport;
let currentLocale = DEFAULT_LOCALE;

/**
 * Configure the telemetry module.
 *
 * @param {Object} options
 * @param {Function} [options.transport] - Function called with each event.
 * @param {string} [options.locale] - Locale string (e.g. 'es-ES').
 * @returns {void}
 */
export function configureTelemetry(options = {}) {
  if (typeof options.transport === 'function') {
    currentTransport = options.transport;
  }
  if (typeof options.locale === 'string') {
    currentLocale = options.locale;
  }
}

/**
 * Emit a structured telemetry event.
 *
 * @param {string} eventName - The event name (e.g. 'game_started').
 * @param {Object} [payload={}] - Additional event-specific fields.
 * @returns {Object} The emitted event object.
 */
export function emit(eventName, payload = {}) {
  const event = {
    event: eventName,
    timestamp: new Date().toISOString(),
    app_version: APP_VERSION,
    locale: currentLocale,
    ...payload,
  };

  currentTransport(event);
  return event;
}

/**
 * Clear the in-memory event buffer (mainly for tests).
 * @returns {void}
 */
export function resetEventBuffer() {
  eventBuffer.length = 0;
}
