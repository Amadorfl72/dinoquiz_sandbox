import { logEvent } from './analyticsService';

const logQuestionAnswered = (questionId, isCorrect, timeToAnswerMs) => {
  logEvent('question_answered', {
    questionId,
    isCorrect,
    timeToAnswerMs
  });
};

export { logQuestionAnswered };