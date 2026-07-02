const { validateGameCompletedEvent } = require('../validators/gameCompletedValidator');
const { sendAnalyticsEvent } = require('../services/analyticsService');

async function handleGameCompleted(req, res) {
  try {
    const { error } = validateGameCompletedEvent(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    await sendAnalyticsEvent('game_completed', req.body);
    res.status(201).json({ message: 'Event received' });
  } catch (err) {
    console.error('Error processing game_completed event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { handleGameCompleted };