// Logs structured events for question answered and feedback shown
const logQuestionAnswered = (questionId, isCorrect, timeToAnswerMs) => {
  console.log('question_answered', {
    questionId,
    isCorrect,
    timeToAnswerMs
  });
  // TODO: Integrate with analytics service (Firebase/Plausible/Matomo)
};

const logFeedbackShown = (questionId) => {
  console.log('feedback_shown', { questionId });
  // TODO: Integrate with analytics service
};

export { logQuestionAnswered, logFeedbackShown };