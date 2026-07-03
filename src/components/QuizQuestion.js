import React, { useEffect, useState } from 'react';

const QuizQuestion = ({ question, options, correctAnswer, onAnswer }) => {
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [shuffledCorrectAnswer, setShuffledCorrectAnswer] = useState('');

  useEffect(() => {
    // Create a copy of the options array
    const optionsCopy = [...options];
    
    // Create array of indices
    const indices = options.map((_, index) => index);
    
    // Shuffle the indices
    const shuffledIndices = [...indices].sort(() => Math.random() - 0.5);
    
    // Create the shuffled options array
    const shuffled = shuffledIndices.map(i => optionsCopy[i]);
    
    // Find the correct answer in the shuffled array
    const correctIndex = options.indexOf(correctAnswer);
    const newCorrectAnswer = shuffled[shuffledIndices.indexOf(correctIndex)];
    
    setShuffledOptions(shuffled);
    setShuffledCorrectAnswer(newCorrectAnswer);
  }, [options, correctAnswer]);

  const handleOptionClick = (selectedOption) => {
    // Compare the selected option with the correct answer in the shuffled options
    const isCorrect = selectedOption === shuffledCorrectAnswer;
    onAnswer(isCorrect);
  };

  return (
    <div>
      <h2>{question}</h2>
      {shuffledOptions.map((option, index) => (
        <button key={index} onClick={() => handleOptionClick(option)}>
          {option}
        </button>
      ))}
    </div>
  );
};

export default QuizQuestion;