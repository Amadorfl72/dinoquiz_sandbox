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
  
  console.log(`[Metrics] ${metricName}: ${metrics[metricName]}`);
};

// --- Question analytics aggregation (TRIOFSND-22) ---
// Aggregates metrics for dashboard
const calculateMetrics = (logs) => {
  // Calculate average success ratio per question
  const successRatios = {};
  logs.forEach(log => {
    if (log.event_type === 'question_answered') {
      if (!successRatios[log.question_id]) {
        successRatios[log.question_id] = { correct: 0, total: 0 };
      }
      successRatios[log.question_id].total++;
      if (log.success) {
        successRatios[log.question_id].correct++;
      }
    }
  });

  // Convert to simple ratio values to match Python implementation
  const successRatioValues = {};
  for (const [questionId, stats] of Object.entries(successRatios)) {
    successRatioValues[questionId] = stats.correct / stats.total;
  }

  // Calculate time distribution statistics to match Python implementation
  const timeDistributions = logs
    .filter(log => log.event_type === 'question_answered')
    .map(log => log.time_to_answer_ms);
    
  let timeDistributionStats = {};
  if (timeDistributions.length > 0) {
    timeDistributionStats = {
      min: Math.min(...timeDistributions),
      max: Math.max(...timeDistributions),
      avg: timeDistributions.reduce((a, b) => a + b, 0) / timeDistributions.length,
      count: timeDistributions.length
    };
  }

  // Identify top 5 worst performing questions
  const worstQuestions = Object.entries(successRatios)
    .map(([questionId, { correct, total }]) => ({
      question_id: questionId,
      success_ratio: correct / total
    }))
    .sort((a, b) => a.success_ratio - b.success_ratio)
    .slice(0, 5);

  return {
    successRatios: successRatioValues,
    timeDistributions: timeDistributionStats,
    worstQuestions
  };
};

export { calculateMetrics };