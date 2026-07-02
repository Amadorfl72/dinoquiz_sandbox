import React from 'react';
import { getBestScore } from '../utils/storage';

const ResultsScreen = ({ currentScore }) => {
  const bestScore = getBestScore();

  return (
    <div className="results-screen">
      <h2>¡Partida Terminada!</h2>
      <p>Tu puntuación actual: {currentScore}</p>
      <p>Tu mejor puntuación: {bestScore}</p>
      <button>Volver a jugar</button>
    </div>
  );
};

export default ResultsScreen;