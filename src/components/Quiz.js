import React, { useState } from 'react';
import QuizQuestion from './QuizQuestion';

const Quiz = ({ questions }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore(score + 1);
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  if (currentQuestionIndex >= questions.length) {
    return (
      <div>
        <h2>Quiz Completed!</h2>
        <p>Your score: {score}/{questions.length}</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <QuizQuestion
      question={currentQuestion.question}
      options={currentQuestion.options}
      correctAnswer={currentQuestion.correctAnswer}
      onAnswer={handleAnswer}
    />
  );
};

export default Quiz;