import React, { useState } from 'react';

const NextButton = ({ onClick }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isLoading) return;

    setIsLoading(true);
    onClick();

    setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Increased to 2 seconds debounce for better UX
  };

  return (
    <button onClick={handleClick} disabled={isLoading} aria-label="Next question">
      {isLoading ? 'Loading...' : 'Next'}
    </button>
  );
};

export default NextButton;