import React, { useEffect, useState } from 'react';

const QuizQuestion = ({ question, options, correctAnswer, onAnswer }) => {
  const [shuffledOptions, setShuffledOptions] = useState([]);

  useEffect(() => {
    // Shuffle the options array
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
  }, [options]);

  return (
    <div>
      <h2>{question}</h2>
      {shuffledOptions.map((option, index) => (
        <button key={index} onClick={() => onAnswer(option === correctAnswer)}>
          {option}
        </button>
      ))}
    </div>
  );
};

export default QuizQuestion;