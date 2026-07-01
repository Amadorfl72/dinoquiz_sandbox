const calculateAverageSuccessRatio = (questionStats) => {
  return questionStats.reduce((sum, stat) => sum + stat.successRatio, 0) / questionStats.length;
};

const getTimeToAnswerDistribution = (questionStats) => {
  return questionStats.map(stat => stat.timeToAnswerMs);
};

const getTop5WorstPerformingQuestions = (questionStats) => {
  return questionStats.sort((a, b) => a.successRatio - b.successRatio).slice(0, 5);
};

export { calculateAverageSuccessRatio, getTimeToAnswerDistribution, getTop5WorstPerformingQuestions };