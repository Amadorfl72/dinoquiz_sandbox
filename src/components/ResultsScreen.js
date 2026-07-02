import React from 'react';
import { Button } from './Button';
import { useGame } from '../context/GameContext';

const ResultsScreen = ({ score }) => {
  const { resetGameState, startNewRound } = useGame();

  const handleRestart = () => {
    resetGameState();
    startNewRound();
  };

  return (
    <div>
      <h1>Resultados</h1>
      <p>Tu puntuación: {score}/10</p>
      <Button onClick={handleRestart}>Volver a jugar</Button>
    </div>
  );
};

export default ResultsScreen;