import { aggregateMetrics } from '../firebase/analytics';

/**
 * Aggregates time to answer metrics into histogram buckets
 * @param {Array} events - Array of question answered events
 * @returns {Object} Aggregated metrics with histogram distribution
 */
export const aggregateTimeToAnswerMetrics = (events) => {
  if (!events || !Array.isArray(events)) {
    return {
      histogram: {
        '0-1s': 0,
        '1-3s': 0,
        '3-5s': 0,
        '5-10s': 0,
        '10s+': 0
      }
    };
  }

  return aggregateMetrics({
    events: events.filter(e => e && typeof e.time_to_answer_ms === 'number'),
    metricField: 'time_to_answer_ms',
    buckets: [
      { range: [0, 1000], label: '0-1s' },
      { range: [1001, 3000], label: '1-3s' },
      { range: [3001, 5000], label: '3-5s' },
      { range: [5001, 10000], label: '5-10s' },
      { range: [10001, Infinity], label: '10s+' }
    ]
  });
};