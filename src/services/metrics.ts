const metricsStore: Record<string, number> = {};

/**
 * Increments an aggregated metric by 1.
 * @param metricName The name of the metric to increment.
 */
export function incrementMetric(metricName: string): void {
  if (!metricName) {
    throw new Error('metricName is required');
  }
  
  if (!metricsStore[metricName]) {
    metricsStore[metricName] = 0;
  }
  metricsStore[metricName] += 1;
  console.log(`[Metrics] Incremented '${metricName}': ${metricsStore[metricName]}`);
}

/**
 * Retrieves the current value of an aggregated metric.
 * @param metricName The name of the metric.
 * @returns The current metric value.
 */
export function getMetric(metricName: string): number {
  if (!metricName) {
    throw new Error('metricName is required');
  }
  
  return metricsStore[metricName] || 0;
}
