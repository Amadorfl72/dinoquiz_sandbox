import { calculateAverageSuccessRatio, getTimeToAnswerDistribution, getTop5WorstPerformingQuestions } from '../metrics/questionMetrics';

const updateQuestionDashboard = (questionStats) => {
  const averageSuccessRatio = calculateAverageSuccessRatio(questionStats);
  const timeToAnswerDistribution = getTimeToAnswerDistribution(questionStats);
  const top5WorstPerformingQuestions = getTop5WorstPerformingQuestions(questionStats);

  console.log('Average Success Ratio:', averageSuccessRatio);
  console.log('Time to Answer Distribution:', timeToAnswerDistribution);
  console.log('Top 5 Worst Performing Questions:', top5WorstPerformingQuestions);
};

export { updateQuestionDashboard };