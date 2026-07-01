import React, { useState, useEffect } from 'react';

const AnswerButton = ({ answer, onAnswer }) => {
  const [isDisabled, setIsDisabled] = useState(false);

  const handleClick = () => {
    if (!isDisabled) {
      setIsDisabled(true);
      onAnswer(answer);
      setTimeout(() => setIsDisabled(false), 500); // Debounce time of 500ms
    }
  };

  return (
    <button onClick={handleClick} disabled={isDisabled}>
      {answer}
    </button>
  );
};

export default AnswerButton;
