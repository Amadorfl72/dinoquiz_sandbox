import React, { useRef } from 'react';
import { debounce } from '../utils/debounce';

const AnswerOption = ({ option, onSelect, isSelected, isCorrect }) => {
  const lastSelectedOptionId = useRef(null);
  const isDebouncing = useRef(false);

  const handleClick = () => {
    // If already selected or currently debouncing, ignore
    if (isSelected || isDebouncing.current) {
      return;
    }

    // For first click or different option, call onSelect immediately
    if (lastSelectedOptionId.current !== option.id) {
      onSelect(option);
      lastSelectedOptionId.current = option.id;
      return;
    }

    // For same option click, debounce
    if (!isDebouncing.current) {
      isDebouncing.current = true;
      onSelect(option);
      setTimeout(() => {
        isDebouncing.current = false;
      }, 300);
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