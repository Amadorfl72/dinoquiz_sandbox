import { selectQuestions } from '../services/questionService';

export const resetGameState = (state) => {
  return {
    ...state,
    score: 0,
    currentQuestionIndex: 0,
    answeredQuestions: [],
    screen: 'playing'
  };
};

export const restartGame = (state) => {
  const newState = resetGameState(state);
  const questions = selectQuestions();
  return {
    ...newState,
    questions,
    currentQuestion: questions[0]
  };
};