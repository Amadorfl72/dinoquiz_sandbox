const calculateAverageSuccessRatio = (questionStats) => {
  const validQuestions = questionStats.filter(q => q.attempts > 0);
  if (validQuestions.length === 0) return 0;
  return validQuestions.reduce((sum, stat) => sum + stat.successRatio, 0) / validQuestions.length;
};

const getTimeToAnswerDistribution = (questionStats) => {
  return questionStats.map(stat => stat.timeToAnswerMs);
};

const getTop5WorstPerformingQuestions = (questionStats) => {
  // Filter out questions with less than 5 attempts
  const validQuestions = questionStats.filter(q => q.attempts >= 5);
  
  // Sort by success ratio ascending (worst first)
  const sorted = [...validQuestions].sort((a, b) => a.successRatio - b.successRatio);
  
  // Return top 5 or all if less than 5
  return sorted.slice(0, 5);
};

export { calculateAverageSuccessRatio, getTimeToAnswerDistribution, getTop5WorstPerformingQuestions };
