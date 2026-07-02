import React, { useState } from 'react';

const NextButton = ({ onClick }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isLoading) return;

    setIsLoading(true);
    onClick();

    setTimeout(() => {
      setIsLoading(false);
    }, 1000); // 1 second debounce
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Next'}
    </button>
  );
};

export default NextButton;