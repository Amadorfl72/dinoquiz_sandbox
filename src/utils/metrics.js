import { initializeAnalytics } from './analytics';

const METRICS_ENDPOINT = '/api/metrics';

// Initialize analytics with consent mode disabled for children under 13
const analytics = initializeAnalytics();

/**
 * Track Largest Contentful Paint (LCP) latency
 * @param {number} lcpValue - LCP value in milliseconds
 */
export const trackLCP = (lcpValue) => {
  if (analytics.isRestrictedMode()) return;
  
  fetch(METRICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'lcp_latency',
      value: lcpValue,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // Silently fail if network error
};

/**
 * Track JavaScript error rate
 * @param {Error} error - The JavaScript error object
 */
export const trackJSError = (error) => {
  if (analytics.isRestrictedMode()) return;
  
  fetch(METRICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'js_error',
      error_message: error.message,
      stack_trace: error.stack,
      location: window.location.href,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // Silently fail if network error
};

/**
 * Track 'game_started' event
 */
export const trackGameStarted = () => {
  if (analytics.isRestrictedMode()) return;
  
  fetch(METRICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'game_started',
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // Silently fail if network error
};

// Listen for global JS errors
window.addEventListener('error', (event) => {
  trackJSError(event.error);
});