const { Router } = require('express');
const { validateGameCompleted } = require('../validators/gameCompleted');

const router = Router();

/**
 * POST /v1/events/game_completed
 *
 * Receives an anonymous 'game_completed' event from the DinoQuiz PWA.
 * Per COPPA / GDPR-K: no PII is accepted or stored. Any field that
 * could identify a user is rejected.
 *
 * Body schema:
 *   event_name: "game_completed"   (fixed)
 *   score:        number 0-10
 *   duration_ms:  number >= 0
 *   app_version:  string (semver-ish, e.g. "1.0.0")
 *   timestamp_ms: number (epoch ms, server-validated)
 *   device:       { os?: string, locale?: string, screen?: string }
 *                 (no identifiers, no user agent tracking id)
 */
router.post('/game_completed', (req, res) => {
  const result = validateGameCompleted(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: 'validation_error', details: result.errors });
  }

  const event = {
    event_name: 'game_completed',
    score: result.value.score,
    duration_ms: result.value.duration_ms,
    app_version: result.value.app_version,
    timestamp_ms: result.value.timestamp_ms,
    device: result.value.device,
    received_at: Date.now()
  };

  // In production this would be pushed to an aggregation pipeline
  // (e.g. a queue / time-series store). For now we log a redacted,
  // PII-free representation.
  console.log(JSON.stringify({
    level: 'info',
    msg: 'event_ingested',
    event_name: event.event_name,
    score: event.score,
    duration_ms: event.duration_ms,
    app_version: event.app_version
  }));

  return res.status(202).json({ status: 'accepted' });
});

module.exports = { eventsRouter: router };
