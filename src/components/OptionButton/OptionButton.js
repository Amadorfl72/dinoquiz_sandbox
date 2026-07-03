import React, { useState, useEffect } from 'react';

const OptionButton = ({ option, onSelect }) => {
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  const handleClick = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      onSelect(option);
    }, 300); // Debounce time of 300ms

    setDebounceTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return (
    <button onClick={handleClick}>
      {option}
    </button>
  );
};

export default OptionButton;