const express = require('express');
const router = express.Router();

// Only these fields are ever accepted; anything else is rejected as
// potential PII rather than trying to denylist known-sensitive field names.
const ALLOWED_FIELDS = ['metric', 'count'];

// Endpoint to receive anonymous aggregated metrics
router.post('/metrics', (req, res) => {
  const body = req.body || {};
  const unexpectedFields = Object.keys(body).filter(
    (field) => !ALLOWED_FIELDS.includes(field)
  );

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      error: 'Payload contains potentially identifiable information (PII) or unexpected fields',
    });
  }

  const { metric, count } = body;

  if (typeof metric !== 'string' || metric.trim().length === 0) {
    return res.status(400).json({ error: 'metric is required and must be a string' });
  }

  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return res.status(400).json({ error: 'count is required and must be a number' });
  }

  // Log the event for now (replace with actual metrics ingestion logic)
  console.log(`Received metric: ${metric}, count: ${count}`);

  res.status(202).json({ status: 'success' });
});

module.exports = router;
