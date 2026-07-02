const express = require('express');
const helmet = require('helmet');
const metricsRouter = require('./routes/metrics');

const app = express();

// Security middleware
app.use(helmet());

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the metrics router
app.use('/api', metricsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});