import React, { useState, useEffect } from 'react';
import QuestionSelector from '../utils/QuestionSelector';

const GameScreen = ({ questions, onGameEnd }) => {
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const selector = new QuestionSelector(questions);
    setCurrentQuestions(selector.getRandomQuestions(10));
  }, [questions]);

  const handleAnswer = (isCorrect) => {
    // Handle answer logic
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onGameEnd();
    }
  };

  if (currentQuestions.length === 0) return <div>Loading...</div>;

  const currentQuestion = currentQuestions[currentQuestionIndex];

  return (
    <div>
      <h2>{currentQuestion.text}</h2>
      {/* Render question options and handle answer selection */}
    </div>
  );
};

export default GameScreen;