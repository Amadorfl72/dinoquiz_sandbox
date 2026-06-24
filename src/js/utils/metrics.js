/**
 * Anonymous, aggregated product metrics.
 * No PII, no cookies, no device fingerprinting.
 */

const APP_VERSION = '1.0.0';
const LOCALE = 'es-ES';

/**
 * Logs a structured event.
 * In v1 this writes to console; a backend endpoint can be added later.
 *
 * @param {string} event - event name
 * @param {object} [data] - additional payload (must not contain PII)
 */
export function logEvent(event, data = {}) {
  const entry = {
    event,
    timestamp: Date.now(),
    app_version: APP_VERSION,
    locale: LOCALE,
    ...data,
  };

  // eslint-disable-next-line no-console
  console.debug('[metrics]', JSON.stringify(entry));
}
