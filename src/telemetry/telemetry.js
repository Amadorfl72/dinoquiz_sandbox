/**
 * Core telemetry service.
 *
 * Provides a single `trackEvent` entry point used across the app.
 * All calls are wrapped in try/catch so that telemetry failures never
 * impact the child's gameplay experience (per reviewer feedback).
 *
 * Events are structured as JSON with fields: event, timestamp,
 * app_version, locale. No PII, no IPs, no device IDs.
 */

import { EVENT_NAMES, EVENT_SCHEMAS } from './events.js';
import { METRIC_NAMES } from './metrics.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const DEFAULT_LOCALE = 'es-ES';

/**
 * Minimal in-memory + optional sink buffer.
 * In production this would forward to a privacy-respecting endpoint;
 * for now we keep an in-memory ring buffer and log to console in dev.
 */
class TelemetryService {
  constructor() {
    this._buffer = [];
    this._maxBuffer = 200;
    this._enabled = true;
    this._locale = DEFAULT_LOCALE;
  }

  setLocale(locale) {
    try {
      if (typeof locale === 'string' && locale.length > 0) {
        this._locale = locale;
      }
    } catch (_) {
      // ignore
    }
  }

  setEnabled(enabled) {
    this._enabled = !!enabled;
  }

  /**
   * Track a structured event. Never throws.
   *
   * @param {string} eventName - one of EVENT_NAMES
   * @param {object} [payload={}] - event-specific fields
   */
  trackEvent(eventName, payload = {}) {
    try {
      if (!this._enabled) return;

      const schema = EVENT_SCHEMAS[eventName];
      if (!schema) {
        console.warn(`[telemetry] Unknown event: ${eventName}`);
        return;
      }

      // Validate required fields (fail soft — log warning, still emit).
      for (const field of schema.required) {
        if (payload[field] === undefined || payload[field] === null) {
          console.warn(`[telemetry] Event ${eventName} missing required field: ${field}`);
        }
      }

      const entry = {
        event: eventName,
        timestamp: Date.now(),
        app_version: APP_VERSION,
        locale: this._locale,
        ...payload,
      };

      // Ensure payload timestamp is not overwritten if explicitly provided.
      if (payload.timestamp !== undefined) {
        entry.timestamp = payload.timestamp;
      }

      this._buffer.push(entry);
      if (this._buffer.length > this._maxBuffer) {
        this._buffer.shift();
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[telemetry]', entry);
      }
    } catch (err) {
      // Telemetry must never break gameplay.
      console.error('[telemetry] Failed to track event:', err);
    }
  }

  /**
   * Track a computed metric (not a user event per se, but a derived signal).
   */
  trackMetric(metricName, value, extra = {}) {
    try {
      if (!this._enabled) return;
      const entry = {
        event: 'metric',
        metric: metricName,
        value,
        timestamp: Date.now(),
        app_version: APP_VERSION,
        locale: this._locale,
        ...extra,
      };
      this._buffer.push(entry);
      if (this._buffer.length > this._maxBuffer) {
        this._buffer.shift();
      }
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[telemetry:metric]', entry);
      }
    } catch (err) {
      console.error('[telemetry] Failed to track metric:', err);
    }
  }

  /**
   * Expose buffered events for testing / debugging.
   */
  getBuffer() {
    return [...this._buffer];
  }

  flush() {
    // Placeholder: in production, POST to privacy-respecting endpoint.
    this._buffer = [];
  }
}

// Singleton instance.
export const telemetry = new TelemetryService();

// Re-export event/metric name constants for convenience.
export { EVENT_NAMES, METRIC_NAMES };
