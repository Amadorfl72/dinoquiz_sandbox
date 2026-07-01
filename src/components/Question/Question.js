import React from 'react';
import { shuffleOptions } from '../../utils/shuffleOptions';

const Question = ({ question, onAnswerSelected }) => {
  // Shuffle options each time the question is rendered
  const shuffledOptions = shuffleOptions(question.options);

  return (
    <div className="question">
      <h2>{question.text}</h2>
      <img src={question.image} alt={question.altText} />
      <div className="options">
        {shuffledOptions.map((option, index) => (
          <button 
            key={index} 
            onClick={() => onAnswerSelected(option.isCorrect)}
            aria-label={option.text}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Question;