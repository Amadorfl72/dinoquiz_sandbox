import React, { useState } from 'react';
import AnswerButton from './AnswerButton';

const Quiz = ({ questions }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const handleAnswer = (answer) => {
    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  return (
    <div>
      <h2>{questions[currentQuestionIndex].question}</h2>
      {questions[currentQuestionIndex].answers.map((answer, index) => (
        <AnswerButton key={index} answer={answer} onAnswer={handleAnswer} />
      ))};
    </div>
  );
};

export default Quiz;
