const calculateAverageSuccessRatio = (questionStats) => {
  return questionStats.reduce((sum, stat) => sum + stat.successRatio, 0) / questionStats.length;
};

const getTimeToAnswerDistribution = (questionStats) => {
  return questionStats.map(stat => stat.timeToAnswerMs);
};

const getTop5WorstPerformingQuestions = (questionStats) => {
  // Filter out questions with no attempts
  const validQuestions = questionStats.filter(q => q.attempts > 0);
  
  // Sort by success ratio ascending (worst first)
  const sorted = [...validQuestions].sort((a, b) => a.successRatio - b.successRatio);
  
  // Return top 5 or all if less than 5
  return sorted.slice(0, 5);
};

export { calculateAverageSuccessRatio, getTimeToAnswerDistribution, getTop5WorstPerformingQuestions };