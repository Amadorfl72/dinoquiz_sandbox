import React from 'react';
import './ResultsScreen.css';

const ResultsScreen = ({ score, onPlayAgain }) => {
  return (
    <div className="results-screen">
      <h1>Resultados</h1>
      <p>Tu puntuación: {score}/10</p>
      <button className="play-again-button" onClick={onPlayAgain}>
        Volver a jugar
      </button>
    </div>
  );
};

export default ResultsScreen;