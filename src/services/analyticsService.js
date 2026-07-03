// Minimal, privacy-preserving analytics sink.
// v1 does NOT send any PII and does NOT integrate any third-party ad/tracking SDK.
// The event payload is aggregated/anonymous by design (see PRD logging_observability).
async function sendAnalyticsEvent(eventName, payload) {
  // In v1 this is a no-op placeholder that simply acknowledges the event.
  // A real implementation would forward anonymized aggregates to a
  // self-hosted, IP-anonymized analytics backend (e.g. Plausible/Matomo).
  return Promise.resolve({ eventName, received: true });
}

module.exports = { sendAnalyticsEvent };
