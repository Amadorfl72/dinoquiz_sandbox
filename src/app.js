const express = require('express');
const metricsRouter = require('./routes/metrics');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the metrics router
app.use('/api', metricsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});