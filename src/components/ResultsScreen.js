import React, { useState, useEffect } from 'react';
import { isNewBestScore, setBestScore } from '../utils/score';
import { strings } from '../strings';

const ResultsScreen = ({ score, onRestart }) => {
  const [showNewBestFeedback, setShowNewBestFeedback] = useState(false);

  useEffect(() => {
    if (isNewBestScore(score)) {
      setBestScore(score);
      setShowNewBestFeedback(true);
      
      // Hide feedback after 3 seconds
      const timer = setTimeout(() => setShowNewBestFeedback(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [score]);

  return (
    <div className="results-screen">
      <h2>{strings.resultsTitle}</h2>
      <p>{strings.resultsScore.replace('{score}', score)}</p>
      
      {showNewBestFeedback && (
        <div className="new-best-feedback">
          {strings.newBestScore}
        </div>
      )}
      
      <button 
        className="play-again-button" 
        onClick={onRestart}
        aria-label={strings.playAgain}
      >
        {strings.playAgain}
      </button>
    </div>
  );
};

export default ResultsScreen;