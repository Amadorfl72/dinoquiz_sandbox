import React, { useRef } from 'react';

const AnswerOption = ({ option, onSelect, isSelected, isCorrect }) => {
  const lastSelectedOptionId = useRef(null);
  const isDebouncing = useRef(false);

  const handleClick = () => {
    // If already selected or currently debouncing, ignore
    if (isSelected || isDebouncing.current) {
      return;
    }

    // For same option click, debounce to prevent multiple answers
    if (lastSelectedOptionId.current === option.id) {
      if (!isDebouncing.current) {
        isDebouncing.current = true;
        onSelect(option);
        setTimeout(() => {
          isDebouncing.current = false;
        }, 300);
      }
      return;
    }

    // For first click or different option, call onSelect immediately
    onSelect(option);
    lastSelectedOptionId.current = option.id;
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