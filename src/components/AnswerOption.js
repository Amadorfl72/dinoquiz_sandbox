import React from 'react';
import { debounce } from '../utils/debounce';

const AnswerOption = ({ option, onSelect, isSelected, isCorrect }) => {
  const handleSelect = debounce(() => {
    if (!isSelected) {
      onSelect(option);
    }
  }, 300);

  return (
    <button
      className={`answer-option ${isSelected ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
      onClick={handleSelect}
      disabled={isSelected}
    >
      {option.text}
    </button>
  );
};

export default AnswerOption;