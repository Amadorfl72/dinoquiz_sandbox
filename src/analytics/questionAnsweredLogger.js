import { logEvent } from '../firebase/analytics';
import { getCurrentTimestamp } from '../utils/time';

/**
 * Logs a question answered event with metrics
 * @param {string} questionId - The ID of the question
 * @param {boolean} isCorrect - Whether the answer was correct
 * @param {number} timeToAnswerMs - Time taken to answer in milliseconds
 */
export const logQuestionAnswered = (questionId, isCorrect, timeToAnswerMs) => {
  logEvent('pregunta_respondida', {
    id_pregunta: questionId,
    acierto: isCorrect,
    time_to_answer_ms: timeToAnswerMs,
    timestamp: getCurrentTimestamp()
  });
};
