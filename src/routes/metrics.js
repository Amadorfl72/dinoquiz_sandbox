const express = require('express');
const router = express.Router();

// Allowed metric events
const ALLOWED_EVENTS = new Set([
  'game_started',
  'app_open',
  'question_answered',
  'game_completed',
  'replay_clicked',
  'mute_toggled'
]);

// PII field patterns to reject
const PII_PATTERNS = [
  /email/i,
  /user_?id/i,
  /ip_?addr/i,
  /name/i,
  /phone/i,
  /address/i
];

// In-memory store for metrics (replace with a proper database in production)
const metricsStore = {
  game_started: 0,
  app_open: 0,
  question_answered: 0,
  game_completed: 0,
  replay_clicked: 0,
  mute_toggled: 0
};

function containsPII(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  
  for (const key in obj) {
    if (PII_PATTERNS.some(pattern => pattern.test(key))) {
      return true;
    }
    
    if (typeof obj[key] === 'object' && containsPII(obj[key])) {
      return true;
    }
  }
  
  return false;
}

/**
 * @swagger
 * /metrics:
 *   post:
 *     summary: Record an anonymous metric event
 *     description: Endpoint to receive anonymous aggregated metrics like 'game_started' and 'app_open' without PII.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *                 description: The metric event name (e.g., 'game_started', 'app_open')
 *     responses:
 *       200:
 *         description: Metric recorded successfully
 *       400:
 *         description: Bad request if event is missing, invalid, or contains PII
 */
router.post('/', (req, res) => {
  // Check for PII
  if (containsPII(req.body)) {
    return res.status(400).json({ error: 'Payload contains potentially sensitive information' });
  }

  const { event } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event is required' });
  }

  if (!ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  metricsStore[event] += 1;
  res.status(200).json({ success: true });
});

/**
 * @swagger
 * /metrics/summary:
 *   get:
 *     summary: Get a summary of recorded metrics
 *     description: Returns the current counts of all recorded metrics.
 *     responses:
 *       200:
 *         description: A summary of recorded metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   description: Key-value pairs of metric names and their counts
 */
router.get('/summary', (req, res) => {
  res.status(200).json({ metrics: metricsStore });
});

module.exports = router;