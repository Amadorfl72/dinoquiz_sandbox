import React from 'react';
import { Button } from './Button';
import { resetGameState, selectQuestions } from '../utils/gameLogic';

const ResultsScreen = ({ score, onRestart }) => {
  const handleRestart = () => {
    resetGameState();
    selectQuestions();
    onRestart();
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