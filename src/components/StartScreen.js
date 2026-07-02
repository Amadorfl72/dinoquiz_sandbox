import React from 'react';
import sessionService from '../services/sessionService';

const StartScreen = ({ onStartGame }) => {
  const handleStartGame = () => {
    sessionService.resetGame();
    onStartGame();
  };

  return (
    <div>
      <h1>DinoQuiz</h1>
      <button onClick={handleStartGame}>¡Jugar!</button>
    </div>
  );
};

export default StartScreen;