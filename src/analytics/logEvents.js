// Logs structured events for question answered and feedback shown
const logQuestionAnswered = (questionId, isCorrect, timeToAnswerMs) => {
  console.log('question_answered', {
    event_type: 'question_answered',
    question_id: questionId,
    success: isCorrect,
    time_to_answer_ms: timeToAnswerMs
  });
  // TODO: Integrate with analytics service (Firebase/Plausible/Matomo)
};

const logFeedbackShown = (questionId) => {
  console.log('feedback_shown', {
    event_type: 'feedback_shown',
    question_id: questionId
  });
  // TODO: Integrate with analytics service
};

export { logQuestionAnswered, logFeedbackShown };
