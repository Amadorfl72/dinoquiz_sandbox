const express = require('express');
const router = express.Router();

// Endpoint to receive anonymous aggregated metrics
router.post('/metrics', (req, res) => {
  const { eventType, eventData } = req.body;
  
  // Validate required fields
  if (!eventType || !eventData) {
    return res.status(400).json({ error: 'eventType and eventData are required' });
  }

  // Check for PII in eventData
  const piiFields = ['userId', 'email', 'name', 'ip'];
  const hasPII = piiFields.some(field => field in eventData);
  
  if (hasPII) {
    return res.status(400).json({ error: 'Payload contains potentially identifiable information (PII)' });
  }

  // Log the event for now (replace with actual metrics ingestion logic)
  console.log(`Received event: ${eventType}`, eventData);

  res.status(200).json({ success: true });
});

module.exports = router;