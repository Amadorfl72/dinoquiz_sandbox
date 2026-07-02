import React, { useEffect, useState } from 'react';

const QuizQuestion = ({ question, options, correctAnswer, onAnswer }) => {
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [originalToShuffledMap, setOriginalToShuffledMap] = useState({});

  useEffect(() => {
    // Create a copy of the options array
    const optionsCopy = [...options];
    
    // Create a map to track original index to shuffled index
    const originalIndices = options.map((_, index) => index);
    
    // Shuffle the indices to determine new positions
    const shuffledIndices = [...originalIndices].sort(() => Math.random() - 0.5);
    
    // Create the shuffled options array
    const shuffled = shuffledIndices.map(i => optionsCopy[i]);
    
    // Create a mapping from original option to shuffled position
    const mapping = {};
    shuffledIndices.forEach((shuffledIndex, originalIndex) => {
      mapping[options[originalIndex]] = shuffled[shuffledIndex];
    });
    
    setShuffledOptions(shuffled);
    setOriginalToShuffledMap(mapping);
  }, [options]);

  const handleOptionClick = (selectedOption) => {
    // Compare the selected option with the correct answer in the original options
    const isCorrect = selectedOption === originalToShuffledMap[correctAnswer];
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