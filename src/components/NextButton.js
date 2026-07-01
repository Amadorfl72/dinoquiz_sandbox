import React, { useState, useEffect, useRef } from 'react';

const NextButton = ({ onNext, debounceMs = 500 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (isLoading) return;
    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      onNext();
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