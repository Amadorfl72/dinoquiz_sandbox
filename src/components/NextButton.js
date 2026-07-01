import React, { useState } from 'react';

const NextButton = ({ onClick, debounceMs = 500 }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      onClick();
      setIsLoading(false);
    }, debounceMs);
  };

  return (
    <button 
      onClick={handleClick} 
      disabled={isLoading}
      aria-busy={isLoading}
      data-testid="next-button"
    >
      {isLoading ? (
        <span data-testid="next-button-loading">Loading...</span>
      ) : 'Next'}
    </button>
  );
};

export default NextButton;