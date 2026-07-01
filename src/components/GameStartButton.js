import React from 'react';
import { sendGameStartedMetric } from '../services/metricsService';

const GameStartButton = ({ onClick }) => {
  const handleClick = async () => {
    await sendGameStartedMetric();
    onClick();
  };

  return (
    <button 
      className="game-start-button" 
      onClick={handleClick}
      aria-label="Start game"
    >
      ¡Jugar!
    </button>
  );
};

export default GameStartButton;