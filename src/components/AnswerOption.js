import React, { useRef } from 'react';
import { debounce } from '../utils/debounce';

const AnswerOption = ({ option, onSelect, isSelected, isCorrect }) => {
  const lastSelectedOptionId = useRef(null);

  const handleSelect = debounce(() => {
    if (!isSelected) {
      onSelect(option);
      lastSelectedOptionId.current = option.id;
    }
  }, 300);

  const handleClick = () => {
    if (option.id === lastSelectedOptionId.current) {
      handleSelect();
    } else {
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