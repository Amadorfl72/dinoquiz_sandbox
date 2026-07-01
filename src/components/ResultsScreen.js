import React, { useEffect, useState } from 'react';
import './ResultsScreen.css';

const ResultsScreen = ({ score, bestScore }) => {
  const [showNewBestScore, setShowNewBestScore] = useState(false);

  useEffect(() => {
    if (score > bestScore) {
      setShowNewBestScore(true);
      const timer = setTimeout(() => {
        setShowNewBestScore(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [score, bestScore]);

  return (
    <div className="results-screen">
      <h1>Resultados</h1>
      <p>Puntuación: {score}</p>
      {showNewBestScore && (
        <div className="new-best-score-feedback" role="status" aria-live="polite">
          ¡Nueva mejor puntuación!
        </div>
      )}
      <button>Volver a jugar</button>
    </div>
  );
};

export default ResultsScreen;