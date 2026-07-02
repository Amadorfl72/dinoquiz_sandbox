// Aggregates metrics for dashboard
const calculateMetrics = (logs) => {
  // Calculate average success ratio per question
  const successRatios = {};
  logs.forEach(log => {
    if (log.event === 'question_answered') {
      if (!successRatios[log.questionId]) {
        successRatios[log.questionId] = { correct: 0, total: 0 };
      }
      successRatios[log.questionId].total++;
      if (log.isCorrect) {
        successRatios[log.questionId].correct++;
      }
    }
  });

  // Calculate distribution of time_to_answer_ms
  const timeDistributions = logs
    .filter(log => log.event === 'question_answered')
    .map(log => log.timeToAnswerMs);

  // Identify top 5 worst performing questions
  const worstQuestions = Object.entries(successRatios)
    .map(([questionId, { correct, total }]) => ({
      questionId,
      successRatio: correct / total
    }))
    .sort((a, b) => a.successRatio - b.successRatio)
    .slice(0, 5);

  return {
    successRatios,
    timeDistributions,
    worstQuestions
  };
};

export { calculateMetrics };