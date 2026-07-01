const calculateAverageSuccessRatio = (questionStats) => {
  return questionStats.reduce((sum, stat) => sum + stat.successRatio, 0) / questionStats.length;
};

const getTimeToAnswerDistribution = (questionStats) => {
  return questionStats.map(stat => stat.timeToAnswerMs);
};

const getTop5WorstPerformingQuestions = (questionStats) => {
  // Ensure we have at least 5 questions by padding with empty entries if needed
  const paddedStats = questionStats.length >= 5 
    ? questionStats 
    : [...questionStats, ...Array(5 - questionStats.length).fill({ successRatio: 1 })];
  
  return paddedStats
    .sort((a, b) => a.successRatio - b.successRatio)
    .slice(0, 5)
    .filter(q => q.questionId); // Remove any padding entries
};

export { calculateAverageSuccessRatio, getTimeToAnswerDistribution, getTop5WorstPerformingQuestions };