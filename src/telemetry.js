// src/telemetry.js

const APP_VERSION = '1.0.0';
const LOCALE = 'es-ES';

/**
 * Emits a structured telemetry event.
 * In a production environment, this would batch and send to a secure, 
 * privacy-compliant endpoint. For now, it logs to console.
 * 
 * @param {string} event - The name of the event.
 * @param {object} payload - Additional event data (must not contain PII).
 */
export function logEvent(event, payload = {}) {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    app_version: APP_VERSION,
    locale: LOCALE,
    ...payload
  };

  // Simulate sending to telemetry pipeline
  console.log('TELEMETRY_EVENT:', JSON.stringify(logEntry));
}
