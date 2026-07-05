import { useCallback, useState } from 'react';
import { selectQuestions } from '../services/questionService';

const initialState = {
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  answeredQuestions: [],
};

export const useGameState = () => {
  const [state, setState] = useState(initialState);

  const answerQuestion = useCallback((questionId, answer, correct) => {
    setState((prev) => ({
      ...prev,
      score: correct ? prev.score + 1 : prev.score,
      answeredQuestions: [...prev.answeredQuestions, { questionId, answer, correct }],
      currentQuestionIndex: prev.currentQuestionIndex + 1,
    }));
  }, []);

  const resetGameState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      score: 0,
      currentQuestionIndex: 0,
      answeredQuestions: [],
    }));
  }, []);

  const startNewRound = useCallback(() => {
    const questions = selectQuestions();
    setState((prev) => ({
      ...prev,
      questions,
      currentQuestionIndex: 0,
    }));
  }, []);

  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null;

  return {
    ...state,
    currentQuestion,
    answerQuestion,
    resetGameState,
    startNewRound,
  };
};
