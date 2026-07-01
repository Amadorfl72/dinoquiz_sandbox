const express = require('express');
const cors = require('cors');
const metricsRouter = require('./routes/metrics');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/metrics', metricsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});