const express = require('express');
const router = express.Router();

// In-memory store for metrics (replace with a proper database in production)
const metricsStore = {
  game_started: 0,
  app_open: 0,
  // Add other metrics as needed
};

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
 *         description: Bad request if event is missing or invalid
 */
router.post('/', (req, res) => {
  const { event } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event is required' });
  }

  if (metricsStore[event] !== undefined) {
    metricsStore[event] += 1;
  } else {
    // Optionally, log unknown events or handle them differently
    console.log(`Unknown metric event: ${event}`);
  }

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