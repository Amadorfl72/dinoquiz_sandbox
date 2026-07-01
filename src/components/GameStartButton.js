import React from 'react';
import { trackGameStarted } from '../utils/metrics';

const GameStartButton = ({ onClick }) => {
  const handleClick = () => {
    trackGameStarted();
    onClick();
  };
  
  return (
    <button 
      className="game-start-button" 
      onClick={handleClick}
      aria-label="¡Jugar!"
    >
      ¡Jugar!
    </button>
  );
};

export default GameStartButton;