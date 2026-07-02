import React from 'react';
import { trackGameStarted } from '../utils/metrics';

const GameStartButton = () => {
  const handleClick = () => {
    trackGameStarted();
    // Additional logic to start the game
  };

  return (
    <button onClick={handleClick}>
      ¡Jugar!
    </button>
  );
};

export default GameStartButton;