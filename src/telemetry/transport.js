/**
 * Telemetry transport layer.
 *
 * Sends structured JSON events to the backend endpoint. All sends are
 * best-effort and wrapped in try/catch. If the network is unavailable
 * (offline mode), events are silently dropped — they are never stored
 * or retried to avoid any risk of PII accumulation.
 */

const TELEMETRY_ENDPOINT = '/api/telemetry';
const APP_VERSION = '1.0.0';

/**
 * Enrich an event payload with common fields.
 * @param {object} event - The base event object.
 * @returns {object} Enriched event with app_version, locale, timestamp.
 */
function enrich(event) {
  return {
    ...event,
    app_version: APP_VERSION,
    locale: typeof navigator !== 'undefined' ? (navigator.language || 'es-ES') : 'es-ES',
    timestamp: event.timestamp ?? Date.now(),
  };
}

/**
 * Track a single structured event.
 * Uses sendBeacon when available (non-blocking), falls back to fetch.
 * @param {object} event - The event payload.
 */
export function trackEvent(event) {
  try {
    const payload = enrich(event);
    const body = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
      return;
    }

    // Fallback: fetch with keepalive.
    if (typeof fetch !== 'undefined') {
      fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Swallow network errors - telemetry is best-effort.
      });
    }
  } catch {
    // Swallow all errors - telemetry must never break gameplay.
  }
}

/**
 * Track a computed metric.
 * @param {{metric: string, value: boolean, delta_ms: number|null}} metricPayload
 */
export function trackMetric(metricPayload) {
  try {
    trackEvent({
      event: 'metric',
      ...metricPayload,
    });
  } catch {
    // Swallow.
  }
}
