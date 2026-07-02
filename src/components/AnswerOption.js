import React, { useRef } from 'react';
import { debounce } from '../utils/debounce';

const AnswerOption = ({ option, onSelect, isSelected, isCorrect }) => {
  const lastSelectedOptionId = useRef(null);

  const handleSelect = useRef(debounce((opt) => {
    if (!isSelected) {
      onSelect(opt);
      lastSelectedOptionId.current = opt.id;
    }
  }, 300)).current;

  const handleClick = () => {
    if (option.id === lastSelectedOptionId.current) {
      // If clicking the same option again, use debounced handler
      handleSelect(option);
    } else {
      // If clicking a different option, call onSelect directly
      onSelect(option);
      lastSelectedOptionId.current = option.id;
    }
  };

  return (
    <button
      className={`answer-option ${isSelected ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
      onClick={handleClick}
      disabled={isSelected}
    >
      {option.text}
    </button>
  );
};

export default AnswerOption;