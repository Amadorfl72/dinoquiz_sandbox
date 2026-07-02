// Metrics aggregation
const metrics = {};

/**
 * Increments a metric counter
 * @param {string} metricName - The name of the metric to increment
 */
export const incrementMetric = (metricName) => {
  if (!metrics[metricName]) {
    metrics[metricName] = 0;
  }
  metrics[metricName]++;
  
  console.log(`[Metrics] ${metricName}: ${metrics[metricName]}`); // Replace with actual metrics service call
};