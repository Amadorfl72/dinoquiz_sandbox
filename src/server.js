const express = require('express');
const { eventsRouter } = require('./routes/events');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/v1/events', eventsRouter);

app.use((req, res) => res.status(404).json({ error: 'not_found' }));

// Centralized error handler — never leak internals
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid_json' });
  }
  res.status(500).json({ error: 'internal_error' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`DinoQuiz ingestion listening on :${port}`);
});

module.exports = app;
